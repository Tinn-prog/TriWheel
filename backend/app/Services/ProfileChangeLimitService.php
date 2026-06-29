<?php

namespace App\Services;

use App\Models\ProfileChangeLog;
use App\Models\User;
use Carbon\Carbon;

class ProfileChangeLimitService
{
    public function monthlyLimit(): int
    {
        return ProfileChangeLog::MONTHLY_LIMIT;
    }

    public function appliesTo(User $user): bool
    {
        return in_array($user->role, ['passenger', 'driver'], true);
    }

    public function changesUsedThisMonth(int $userId): int
    {
        return ProfileChangeLog::query()
            ->where('user_id', $userId)
            ->where('created_at', '>=', Carbon::now()->startOfMonth())
            ->count();
    }

    public function remainingChanges(int $userId): int
    {
        return max(0, $this->monthlyLimit() - $this->changesUsedThisMonth($userId));
    }

    public function canChangeDetails(int $userId): bool
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
     *   resets_at: string,
     *   applies: bool
     * }
     */
    public function summaryFor(User $user): array
    {
        $applies = $this->appliesTo($user);

        return [
            'monthly_limit' => $this->monthlyLimit(),
            'changes_used' => $applies ? $this->changesUsedThisMonth($user->id) : 0,
            'changes_remaining' => $applies ? $this->remainingChanges($user->id) : $this->monthlyLimit(),
            'resets_at' => $this->resetsAt(),
            'applies' => $applies,
        ];
    }

    /**
     * @param  list<array{field: string, label: string, old_value: ?string, new_value: ?string}>  $changes
     */
    public function record(User $user, array $changes): ProfileChangeLog
    {
        return ProfileChangeLog::query()->create([
            'user_id' => $user->id,
            'changed_fields' => $changes,
        ]);
    }
}
