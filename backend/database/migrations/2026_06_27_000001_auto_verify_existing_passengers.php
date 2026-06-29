<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('users')
            ->where('role', 'passenger')
            ->update([
                'is_verified' => true,
                'verification_rejection_reason' => null,
            ]);
    }

    public function down(): void
    {
        // No-op: previous verification state cannot be restored safely.
    }
};
