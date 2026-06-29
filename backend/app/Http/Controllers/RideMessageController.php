<?php

namespace App\Http\Controllers;

use App\Models\Driver;
use App\Models\Ride;
use App\Models\RideMessage;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RideMessageController extends Controller
{
    public function index(Request $request, Ride $ride): JsonResponse
    {
        $data = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'after_id' => ['nullable', 'integer', 'min:0'],
        ]);

        $user = User::query()->findOrFail($data['user_id']);

        if ($response = $this->ensureCanAccessRideChat($ride, $user)) {
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
        ]);
    }

    public function store(Request $request, Ride $ride, NotificationService $notifications): JsonResponse
    {
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

        if ($response = $this->ensureCanAccessRideChat($ride, $user)) {
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
        ], 201);
    }

    private function ensureCanAccessRideChat(Ride $ride, User $user): ?JsonResponse
    {
        if (! $this->userParticipatesInRide($ride, $user)) {
            return response()->json([
                'message' => 'You are not part of this ride.',
            ], 403);
        }

        if (! in_array($ride->status, ['accepted', 'ongoing'], true)) {
            return response()->json([
                'message' => 'Chat is only available during an active trip.',
            ], 422);
        }

        return null;
    }

    private function userParticipatesInRide(Ride $ride, User $user): bool
    {
        if ((int) $ride->passenger_id === (int) $user->id) {
            return true;
        }

        if ($user->role !== 'driver') {
            return false;
        }

        $driver = Driver::query()->where('user_id', $user->id)->first();

        return $driver && (int) $ride->driver_id === (int) $driver->id;
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
                '/driver',
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
            '/passenger#active-ride',
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
