<?php

namespace App\Http\Controllers\Concerns;

use App\Models\User;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;

trait BlocksSuspendedUsers
{
    protected function ensureActiveUser(User $user): void
    {
        if ($user->is_suspended) {
            throw new HttpResponseException(response()->json([
                'message' => $user->suspension_reason ?: 'This account has been suspended.',
            ], 403));
        }
    }

    protected function findActiveUser(int $userId, ?string $role = null): User
    {
        $query = User::query()->where('id', $userId);

        if ($role) {
            $query->where('role', $role);
        }

        $user = $query->first();

        if (! $user) {
            throw new HttpResponseException(response()->json([
                'message' => 'User not found.',
            ], 404));
        }

        $this->ensureActiveUser($user);

        return $user;
    }
}
