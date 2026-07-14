<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->text('restore_appeal_message')->nullable()->after('deletion_reason');
            $table->timestamp('restore_appeal_submitted_at')->nullable()->after('restore_appeal_message');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn([
                'restore_appeal_message',
                'restore_appeal_submitted_at',
            ]);
        });
    }
};
