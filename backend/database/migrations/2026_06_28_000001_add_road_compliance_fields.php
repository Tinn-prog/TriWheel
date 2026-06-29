<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('drivers', function (Blueprint $table) {
            $table->string('lgu', 120)->nullable()->after('toda_association');
            $table->string('mtop_number', 80)->nullable()->after('lgu');
            $table->string('service_zone_id', 80)->nullable()->after('mtop_number');
        });

        Schema::table('rides', function (Blueprint $table) {
            $table->boolean('compliance_bypassed')->default(false)->after('cancellation_reason');
            $table->json('compliance_issues')->nullable()->after('compliance_bypassed');
        });
    }

    public function down(): void
    {
        Schema::table('drivers', function (Blueprint $table) {
            $table->dropColumn(['lgu', 'mtop_number', 'service_zone_id']);
        });

        Schema::table('rides', function (Blueprint $table) {
            $table->dropColumn(['compliance_bypassed', 'compliance_issues']);
        });
    }
};
