<?php

namespace App\Http\Controllers\Concerns;

use App\Models\User;
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

        if ($admin->admin_role !== 'super_admin') {
            throw new HttpResponseException(response()->json([
                'message' => 'Super admin access is required for this action.',
            ], 403));
        }

        return $admin;
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
