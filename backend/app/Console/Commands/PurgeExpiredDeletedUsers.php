<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\AdminAuditService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PurgeExpiredDeletedUsers extends Command
{
    protected $signature = 'users:purge-expired-deleted';

    protected $description = 'Permanently purge soft-deleted accounts older than 3 months (anonymized; kept out of Deleted Accounts)';

    public const RETENTION_MONTHS = 3;

    public function handle(AdminAuditService $audit): int
    {
        $cutoff = now()->subMonths(self::RETENTION_MONTHS);

        $expired = User::onlyTrashed()
            ->whereNull('permanently_purged_at')
            ->where('deleted_at', '<=', $cutoff)
            ->get();

        if ($expired->isEmpty()) {
            $this->info('No expired deleted accounts to purge.');

            return self::SUCCESS;
        }

        $purged = 0;
        $systemAdmin = User::query()
            ->where('role', 'admin')
            ->where('admin_role', 'super_admin')
            ->orderBy('id')
            ->first();

        foreach ($expired as $user) {
            $payload = [
                'email' => $user->email,
                'role' => $user->role,
                'deleted_at' => $user->deleted_at?->toIso8601String(),
                'deletion_reason' => $user->deletion_reason,
            ];

            DB::transaction(function () use ($user): void {
                $user->tokens()->delete();

                if ($user->driver) {
                    $user->driver->update(['status' => 'offline']);
                }

                $user->forceFill([
                    'name' => 'Deleted User',
                    'first_name' => 'Deleted',
                    'middle_name' => null,
                    'last_name' => 'User',
                    'email' => 'purged+'.$user->id.'.'.Str::lower(Str::random(8)).'@deleted.local',
                    'contact_number' => null,
                    'current_address' => null,
                    'profile_photo' => null,
                    'government_id_type' => null,
                    'government_id_file' => null,
                    'emergency_contact_name' => null,
                    'emergency_contact_number' => null,
                    'password' => Str::password(32),
                    'deletion_reason' => $user->deletion_reason,
                    'permanently_purged_at' => now(),
                ])->save();
            });

            $audit->log($systemAdmin, 'user.purged', 'user', $user->id, $payload);

            $purged++;
            $this->line("Permanently purged user #{$user->id}");
        }

        $this->info("Permanently purged {$purged} expired account(s) after ".self::RETENTION_MONTHS.' months.');

        return self::SUCCESS;
    }
}
