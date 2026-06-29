<?php

namespace App\Services;

use App\Models\User;

class DriverSuspensionService
{
    public const APPEAL_WINDOW_HOURS = 48;

    public function applySuspension(User $user, string $reason): void
    {
        $now = now();

        $user->update([
            'is_suspended' => true,
            'suspension_reason' => trim($reason),
            'suspended_at' => $now,
            'suspension_appeal_deadline_at' => $now->copy()->addHours(self::APPEAL_WINDOW_HOURS),
            'suspension_appeal_message' => null,
            'suspension_appeal_submitted_at' => null,
            'suspension_requires_office_visit' => false,
            'account_permanently_closed_at' => null,
        ]);
    }

    public function clearSuspension(User $user): void
    {
        $user->update([
            'is_suspended' => false,
            'suspension_reason' => null,
            'suspended_at' => null,
            'suspension_appeal_deadline_at' => null,
            'suspension_appeal_message' => null,
            'suspension_appeal_submitted_at' => null,
            'suspension_requires_office_visit' => false,
            'account_permanently_closed_at' => null,
        ]);
    }

    public function syncAppealExpiry(User $user): User
    {
        if (! $user->is_suspended || $user->role !== 'driver') {
            return $user;
        }

        if (! $user->suspension_appeal_deadline_at && ! $user->suspension_appeal_submitted_at) {
            $user->update([
                'suspended_at' => $user->suspended_at ?? now(),
                'suspension_appeal_deadline_at' => now()->addHours(self::APPEAL_WINDOW_HOURS),
            ]);

            return $user->refresh();
        }

        if ($user->suspension_appeal_submitted_at) {
            return $user;
        }

        $deadline = $user->suspension_appeal_deadline_at;

        if ($deadline && now()->greaterThan($deadline)) {
            $user->update([
                'suspension_requires_office_visit' => true,
                'account_permanently_closed_at' => $user->account_permanently_closed_at ?? now(),
            ]);

            return $user->refresh();
        }

        return $user;
    }

    public function canSubmitAppeal(User $user): bool
    {
        $user = $this->syncAppealExpiry($user);

        if (! $user->is_suspended || $user->role !== 'driver') {
            return false;
        }

        if ($user->suspension_appeal_submitted_at || $user->suspension_requires_office_visit) {
            return false;
        }

        $deadline = $user->suspension_appeal_deadline_at;

        return $deadline && now()->lessThanOrEqualTo($deadline);
    }

    public function suspensionState(User $user): ?array
    {
        if (! $user->is_suspended || $user->role !== 'driver') {
            return null;
        }

        $user = $this->syncAppealExpiry($user);
        $deadline = $user->suspension_appeal_deadline_at;
        $appealSubmitted = (bool) $user->suspension_appeal_submitted_at;

        return [
            'is_suspended' => true,
            'reason' => $user->suspension_reason,
            'suspended_at' => $user->suspended_at,
            'appeal_deadline_at' => $deadline,
            'appeal_submitted_at' => $user->suspension_appeal_submitted_at,
            'appeal_message' => $user->suspension_appeal_message,
            'can_submit_appeal' => $this->canSubmitAppeal($user),
            'appeal_submitted' => $appealSubmitted,
            'requires_office_visit' => (bool) $user->suspension_requires_office_visit,
            'account_permanently_closed' => (bool) $user->account_permanently_closed_at,
            'account_permanently_closed_at' => $user->account_permanently_closed_at,
            'hours_remaining' => $deadline && ! $appealSubmitted && ! $user->suspension_requires_office_visit
                ? max(0, (int) now()->diffInHours($deadline, false))
                : 0,
        ];
    }
}
