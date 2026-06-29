<?php

namespace App\Services;

use App\Mail\TriWheelAlertMail;
use App\Models\User;
use Illuminate\Support\Facades\Mail;

class EmailVerificationService
{
    public function sendVerification(User $user): void
    {
        $token = bin2hex(random_bytes(32));

        $user->forceFill([
            'email_verification_token' => $token,
            'email_verification_expiry' => now()->addHours(24),
        ])->save();

        $verifyUrl = $this->frontendUrl('/verify-email?token='.$token);

        try {
            Mail::to($user->email)->send(new TriWheelAlertMail(
                recipientName: $user->name ?? 'TriWheel user',
                mailSubject: 'Verify your TriWheel email address',
                headline: 'Confirm your email',
                bodyText: "Thanks for registering with TriWheel. Please verify your email address to secure your account and enable login.\n\nThis link expires in 24 hours. If you did not create this account, you can ignore this email.",
                actionUrl: $verifyUrl,
                actionLabel: 'Verify Email',
            ));
        } catch (\Throwable $exception) {
            report($exception);
        }
    }

    public function verify(string $token): ?User
    {
        $user = User::query()
            ->where('email_verification_token', $token)
            ->where('email_verification_expiry', '>', now())
            ->first();

        if (! $user) {
            return null;
        }

        $user->forceFill([
            'email_verified_at' => now(),
            'email_verification_token' => null,
            'email_verification_expiry' => null,
        ])->save();

        return $user;
    }

    private function frontendUrl(string $path): string
    {
        $configured = trim(explode(',', (string) config('app.frontend_url', 'http://localhost:3000'))[0]);

        return rtrim($configured, '/').'/'.ltrim($path, '/');
    }
}
