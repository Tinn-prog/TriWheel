<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $this->resolveUser($request);

        $notifications = Notification::query()
            ->where('user_id', $user->id)
            ->latest()
            ->limit(100)
            ->get()
            ->map(fn (Notification $notification): array => $this->formatNotification($notification));

        return response()->json([
            'notifications' => $notifications,
            'unread_count' => Notification::query()
                ->where('user_id', $user->id)
                ->whereNull('read_at')
                ->count(),
        ]);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        $user = $this->resolveUser($request);

        return response()->json([
            'unread_count' => Notification::query()
                ->where('user_id', $user->id)
                ->whereNull('read_at')
                ->count(),
        ]);
    }

    public function markRead(Request $request, Notification $notification): JsonResponse
    {
        $user = $this->resolveUser($request);

        if ($notification->user_id !== $user->id) {
            return response()->json([
                'message' => 'Notification not found.',
            ], 404);
        }

        if (! $notification->read_at) {
            $notification->update(['read_at' => now()]);
        }

        return response()->json([
            'message' => 'Notification marked as read.',
            'notification' => $this->formatNotification($notification->refresh()),
        ]);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $user = $this->resolveUser($request);

        Notification::query()
            ->where('user_id', $user->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json([
            'message' => 'All notifications marked as read.',
            'unread_count' => 0,
        ]);
    }

    private function resolveUser(Request $request): User
    {
        $userId = (int) ($request->input('user_id') ?? $request->query('user_id'));

        if ($userId <= 0) {
            throw new HttpResponseException(response()->json([
                'message' => 'user_id is required.',
            ], 422));
        }

        return User::query()->findOrFail($userId);
    }

    private function formatNotification(Notification $notification): array
    {
        return [
            'id' => $notification->id,
            'type' => $notification->type,
            'title' => $notification->title,
            'body' => $notification->body,
            'action_url' => $notification->action_url,
            'read_at' => $notification->read_at,
            'created_at' => $notification->created_at,
        ];
    }
}
