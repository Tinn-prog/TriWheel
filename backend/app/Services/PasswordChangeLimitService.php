<?php

namespace App\Services;

use App\Models\PasswordChangeLog;
use App\Models\User;
use Carbon\Carbon;

class PasswordChangeLimitService
{
    public function monthlyLimit(): int
    {
        return PasswordChangeLog::MONTHLY_LIMIT;
    }

    public function changesUsedThisMonth(int $userId): int
    {
        return PasswordChangeLog::query()
            ->where('user_id', $userId)
            ->where('created_at', '>=', Carbon::now()->startOfMonth())
            ->count();
    }

    public function remainingChanges(int $userId): int
    {
        return max(0, $this->monthlyLimit() - $this->changesUsedThisMonth($userId));
    }

    public function canChangePassword(int $userId): bool
    {
        return $this->remainingChanges($userId) > 0;
    }

    public function resetsAt(): string
    {
        return Carbon::now()->addMonth()->startOfMonth()->toIso8601String();
    }

    /**
     * @return array{
     *   monthly_limit: int,
     *   changes_used: int,
     *   changes_remaining: int,
     *   resets_at: string
     * }
     */
    public function summaryFor(User $user): array
    {
        return [
            'monthly_limit' => $this->monthlyLimit(),
            'changes_used' => $this->changesUsedThisMonth($user->id),
            'changes_remaining' => $this->remainingChanges($user->id),
            'resets_at' => $this->resetsAt(),
        ];
    }

    public function record(User $user): PasswordChangeLog
    {
        return PasswordChangeLog::query()->create([
            'user_id' => $user->id,
        ]);
    }
}
