<?php

namespace App\Services;

use App\Mail\TriWheelAlertMail;
use App\Models\User;
use Illuminate\Support\Facades\Mail;

class EmailNotificationService
{
    /**
     * Important account events only. Ride offers, trip status, and similar
     * updates remain in-app notifications.
     *
     * @var list<string>
     */
    private const ENABLED_TYPES = [
        'driver.application_received',
        'driver.application_submitted',
        'driver.approved',
        'driver.rejected',
        'driver.suspended',
        'driver.activated',
        'driver.suspension_appeal',
        'user.restore_appeal',
        'passenger.application_received',
        'passenger.application_submitted',
        'passenger.deactivated',
        'passenger.reactivated',
    ];

    public function sendIfEnabled(
        User $user,
        string $type,
        string $title,
        string $body,
        ?string $actionUrl = null,
    ): void {
        if (! in_array($type, self::ENABLED_TYPES, true) || blank($user->email)) {
            return;
        }

        try {
            Mail::to($user->email)->send(new TriWheelAlertMail(
                recipientName: $user->name ?? 'TriWheel user',
                mailSubject: $title.' — TriWheel',
                headline: $title,
                bodyText: $body,
                actionUrl: $this->absoluteActionUrl($actionUrl),
                actionLabel: $this->actionLabel($type),
            ));
        } catch (\Throwable $exception) {
            report($exception);
        }
    }

    private function absoluteActionUrl(?string $path): ?string
    {
        if (blank($path)) {
            return null;
        }

        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }

        $base = rtrim((string) config('app.frontend_url', 'http://localhost:3000'), '/');

        return $base.'/'.ltrim($path, '/');
    }

    private function actionLabel(string $type): ?string
    {
        return match ($type) {
            'driver.application_received' => 'View Driver Dashboard',
            'driver.application_submitted' => 'Review Application',
            'driver.approved', 'driver.activated' => 'Open Driver Dashboard',
            'driver.rejected', 'driver.suspended' => 'View Account Status',
            'driver.suspension_appeal' => 'Review Appeal',
            'user.restore_appeal' => 'Review Restore Appeal',
            'passenger.application_received' => 'View Passenger Dashboard',
            'passenger.application_submitted' => 'Review Passenger',
            'passenger.verified', 'passenger.reactivated' => 'Book a Ride',
            'passenger.unverified', 'passenger.deactivated' => 'View Account',
            default => 'Open TriWheel',
        };
    }
}
