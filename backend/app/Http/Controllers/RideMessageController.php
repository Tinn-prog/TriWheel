<?php

namespace App\Http\Controllers;

use App\Models\Driver;
use App\Models\Ride;
use App\Models\RideMessage;
use App\Models\User;
use App\Services\NotificationService;
use App\Services\RideChatService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RideMessageController extends Controller
{
    public function conversations(Request $request, RideChatService $chat): JsonResponse
    {
        $data = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        $user = User::query()->findOrFail($data['user_id']);

        if (! in_array($user->role, ['passenger', 'driver'], true)) {
            return response()->json([
                'message' => 'Only passengers and drivers can access ride chats.',
            ], 403);
        }

        $driverId = $user->role === 'driver'
            ? Driver::query()->where('user_id', $user->id)->value('id')
            : null;

        $rides = Ride::query()
            ->whereNotNull('accepted_at')
            ->where('accepted_at', '>=', now()->subDays(7))
            ->when($user->role === 'passenger', function ($query) use ($user) {
                $query->where('passenger_id', $user->id);
            })
            ->when($user->role === 'driver' && $driverId, function ($query) use ($driverId) {
                $query->where('driver_id', $driverId);
            })
            ->when($user->role === 'driver' && ! $driverId, function ($query) {
                $query->whereRaw('1 = 0');
            })
            ->with([
                'passenger:id,name',
                'driver.user:id,name',
                'messages' => function ($query) {
                    $query->latest('id')->limit(1)->with('sender:id,name,role');
                },
            ])
            ->orderByDesc('accepted_at')
            ->limit(50)
            ->get();

        $conversations = $rides
            ->map(function (Ride $ride) use ($user, $chat) {
                $meta = $chat->chatMeta($ride, $user);
                $lastMessage = $ride->messages->first();

                return [
                    'ride_id' => $ride->id,
                    'ride_status' => $ride->status,
                    'pickup_address' => $ride->pickup_address,
                    'dropoff_address' => $ride->dropoff_address,
                    'other_party_name' => $chat->otherPartyName($ride, $user),
                    'other_party_role' => $chat->otherPartyRole($ride, $user),
                    'chat' => $meta,
                    'last_message' => $lastMessage ? $this->formatMessage($lastMessage) : null,
                ];
            })
            ->values();

        return response()->json([
            'conversations' => $conversations,
        ]);
    }

    public function index(Request $request, Ride $ride, RideChatService $chat): JsonResponse
    {
        $data = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'after_id' => ['nullable', 'integer', 'min:0'],
        ]);

        $user = User::query()->findOrFail($data['user_id']);

        if ($response = $this->ensureCanReadRideChat($ride, $user, $chat)) {
            return $response;
        }

        $query = RideMessage::query()
            ->where('ride_id', $ride->id)
            ->with('sender:id,name,role')
            ->orderBy('id');

        if (! empty($data['after_id'])) {
            $query->where('id', '>', $data['after_id']);
        }

        $messages = $query
            ->limit(200)
            ->get()
            ->map(fn (RideMessage $message) => $this->formatMessage($message));

        return response()->json([
            'messages' => $messages,
            'chat' => $chat->chatMeta($ride, $user),
        ]);
    }

    public function store(
        Request $request,
        Ride $ride,
        NotificationService $notifications,
        RideChatService $chat,
    ): JsonResponse {
        $data = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'body' => ['required', 'string', 'max:1000'],
        ]);

        $user = User::query()->findOrFail($data['user_id']);
        $body = trim($data['body']);

        if ($body === '') {
            return response()->json([
                'message' => 'Message cannot be empty.',
            ], 422);
        }

        if (! in_array($user->role, ['passenger', 'driver'], true)) {
            return response()->json([
                'message' => 'Only passengers and drivers can send ride chat messages.',
            ], 403);
        }

        if ($response = $this->ensureCanSendRideChat($ride, $user, $chat)) {
            return $response;
        }

        $message = RideMessage::query()->create([
            'ride_id' => $ride->id,
            'sender_id' => $user->id,
            'body' => $body,
        ]);

        $message->load('sender:id,name,role');
        $this->notifyRecipient($ride, $user, $body, $notifications);

        return response()->json([
            'message' => 'Message sent.',
            'chat_message' => $this->formatMessage($message),
            'chat' => $chat->chatMeta($ride, $user),
        ], 201);
    }

    private function ensureCanReadRideChat(Ride $ride, User $user, RideChatService $chat): ?JsonResponse
    {
        if (! $chat->userParticipatesInRide($ride, $user)) {
            return response()->json([
                'message' => 'You are not part of this ride.',
            ], 403);
        }

        if (! $ride->accepted_at) {
            return response()->json([
                'message' => 'Chat opens once a driver accepts your ride.',
            ], 422);
        }

        if (! $chat->canReadChat($ride, $user)) {
            return response()->json([
                'message' => 'This chat has ended. Ride chats stay open for 24 hours after a driver accepts.',
            ], 422);
        }

        return null;
    }

    private function ensureCanSendRideChat(Ride $ride, User $user, RideChatService $chat): ?JsonResponse
    {
        if ($response = $this->ensureCanReadRideChat($ride, $user, $chat)) {
            return $response;
        }

        if (! $chat->canSendChat($ride, $user)) {
            return response()->json([
                'message' => $ride->status === 'cancelled'
                    ? 'This ride was cancelled. Chat is closed.'
                    : 'You can no longer send messages in this chat.',
            ], 422);
        }

        return null;
    }

    private function notifyRecipient(
        Ride $ride,
        User $sender,
        string $body,
        NotificationService $notifications,
    ): void {
        $ride->loadMissing(['passenger:id,name', 'driver.user:id,name']);
        $preview = mb_strlen($body) > 120 ? mb_substr($body, 0, 117).'...' : $body;

        if ((int) $ride->passenger_id === (int) $sender->id) {
            $driverUser = $ride->driver?->user;

            if (! $driverUser) {
                return;
            }

            $notifications->notify(
                $driverUser,
                'ride.chat_message',
                'New message from passenger',
                "{$sender->name}: {$preview}",
                '/driver/messages?ride='.$ride->id,
            );

            return;
        }

        $passenger = $ride->passenger;

        if (! $passenger) {
            return;
        }

        $notifications->notify(
            $passenger,
            'ride.chat_message',
            'New message from driver',
            "{$sender->name}: {$preview}",
            '/passenger/messages?ride='.$ride->id,
        );
    }

    private function formatMessage(RideMessage $message): array
    {
        return [
            'id' => $message->id,
            'ride_id' => $message->ride_id,
            'sender_id' => $message->sender_id,
            'sender_name' => $message->sender?->name ?? 'User',
            'sender_role' => $message->sender?->role,
            'body' => $message->body,
            'created_at' => $message->created_at?->toIso8601String(),
        ];
    }
}
