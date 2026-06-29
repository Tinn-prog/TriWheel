<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->timestamp('suspended_at')->nullable()->after('suspension_reason');
            $table->timestamp('suspension_appeal_deadline_at')->nullable()->after('suspended_at');
            $table->text('suspension_appeal_message')->nullable()->after('suspension_appeal_deadline_at');
            $table->timestamp('suspension_appeal_submitted_at')->nullable()->after('suspension_appeal_message');
            $table->boolean('suspension_requires_office_visit')->default(false)->after('suspension_appeal_submitted_at');
            $table->timestamp('account_permanently_closed_at')->nullable()->after('suspension_requires_office_visit');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn([
                'suspended_at',
                'suspension_appeal_deadline_at',
                'suspension_appeal_message',
                'suspension_appeal_submitted_at',
                'suspension_requires_office_visit',
                'account_permanently_closed_at',
            ]);
        });
    }
};
