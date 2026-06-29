<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\User;

class NotificationService
{
    public function __construct(
        private readonly EmailNotificationService $emails,
    ) {}

    public function notify(
        User|int $user,
        string $type,
        string $title,
        string $body,
        ?string $actionUrl = null,
    ): Notification {
        $userId = $user instanceof User ? $user->id : $user;

        $notification = Notification::query()->create([
            'user_id' => $userId,
            'type' => $type,
            'title' => $title,
            'body' => $body,
            'action_url' => $actionUrl,
        ]);

        $recipient = $user instanceof User
            ? $user
            : User::query()->find($userId);

        if ($recipient) {
            $this->emails->sendIfEnabled($recipient, $type, $title, $body, $actionUrl);
        }

        return $notification;
    }

    public function notifyMany(
        iterable $users,
        string $type,
        string $title,
        string $body,
        ?string $actionUrl = null,
    ): void {
        foreach ($users as $user) {
            $this->notify($user, $type, $title, $body, $actionUrl);
        }
    }
}
