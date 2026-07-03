<?php

namespace App\Http\Controllers\Concerns;

use App\Models\User;
use App\Models\PlatformSetting;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

trait ResolvesAdminUser
{
    protected function requireAdmin(Request $request): User
    {
        $user = $this->resolveAdminFromToken($request);

        if ($user) {
            return $user;
        }

        $userId = (int) ($request->input('user_id') ?? $request->query('user_id'));

        if ($userId <= 0) {
            throw new HttpResponseException(response()->json([
                'message' => 'Admin authentication is required.',
            ], 401));
        }

        $user = User::query()
            ->where('role', 'admin')
            ->where('is_suspended', false)
            ->find($userId);

        if (! $user) {
            throw new HttpResponseException(response()->json([
                'message' => 'Unauthorized admin access.',
            ], 403));
        }

        return $user;
    }

    protected function requireSuperAdmin(Request $request): User
    {
        $admin = $this->requireAdmin($request);

        if (! $this->isSuperAdminUser($admin)) {
            throw new HttpResponseException(response()->json([
                'message' => 'Super admin access is required for this action.',
            ], 403));
        }

        return $admin;
    }

    protected function isSuperAdminUser(User $user): bool
    {
        return $user->role === 'admin' && $user->admin_role === 'super_admin';
    }

    protected function isOperatorUser(User $user): bool
    {
        return $user->role === 'admin' && $user->admin_role !== 'super_admin';
    }

    protected function assertAdminCanManageUser(User $admin, User $target): void
    {
        if ($this->isSuperAdminUser($admin)) {
            return;
        }

        if ($target->role === 'admin') {
            throw new HttpResponseException(response()->json([
                'message' => 'Admin operator accounts cannot manage other admin accounts.',
            ], 403));
        }
    }

    protected function assertOperatorPolicy(User $admin, string $policyKey): void
    {
        if ($this->isSuperAdminUser($admin)) {
            return;
        }

        if (! (PlatformSetting::accessPolicy()[$policyKey] ?? false)) {
            throw new HttpResponseException(response()->json([
                'message' => 'You do not have permission to perform this action.',
            ], 403));
        }
    }

    protected function resolveAdminFromToken(Request $request): ?User
    {
        $token = $request->bearerToken();

        if (! $token) {
            return null;
        }

        $accessToken = PersonalAccessToken::findToken($token);

        if (! $accessToken) {
            return null;
        }

        $user = $accessToken->tokenable;

        if (! $user instanceof User || $user->role !== 'admin' || $user->is_suspended) {
            return null;
        }

        return $user;
    }
}
