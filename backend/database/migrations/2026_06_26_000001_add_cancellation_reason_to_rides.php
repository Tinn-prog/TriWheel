<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rides', function (Blueprint $table) {
            $table->string('cancelled_by', 20)->nullable()->after('completed_at');
            $table->string('cancellation_reason_code', 40)->nullable()->after('cancelled_by');
            $table->string('cancellation_reason', 255)->nullable()->after('cancellation_reason_code');
        });
    }

    public function down(): void
    {
        Schema::table('rides', function (Blueprint $table) {
            $table->dropColumn([
                'cancelled_by',
                'cancellation_reason_code',
                'cancellation_reason',
            ]);
        });
    }
};
