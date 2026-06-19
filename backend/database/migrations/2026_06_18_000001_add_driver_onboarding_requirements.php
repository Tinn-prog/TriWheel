<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('drivers', function (Blueprint $table) {
            $table->date('date_of_birth')->nullable()->after('phone');
            $table->string('current_address')->nullable()->after('date_of_birth');
            $table->string('profile_photo')->nullable()->after('current_address');
            $table->string('government_id_type')->nullable()->after('profile_photo');
            $table->string('government_id_file')->nullable()->after('government_id_type');
            $table->date('license_expiry_date')->nullable()->after('license_file');
            $table->string('license_restriction')->nullable()->after('license_expiry_date');
            $table->string('toda_id_number')->nullable()->after('toda_id_file');
            $table->string('toda_association')->nullable()->after('toda_id_number');
            $table->string('franchise_permit_file')->nullable()->after('toda_association');
            $table->string('emergency_contact_name')->nullable()->after('franchise_permit_file');
            $table->string('emergency_contact_number')->nullable()->after('emergency_contact_name');
            $table->boolean('background_check_consent')->default(false)->after('emergency_contact_number');
            $table->boolean('platform_rules_accepted')->default(false)->after('background_check_consent');
            $table->timestamp('submitted_at')->nullable()->after('platform_rules_accepted');
        });

        Schema::table('vehicles', function (Blueprint $table) {
            $table->string('body_number')->nullable()->after('plate_number');
            $table->string('vehicle_photo')->nullable()->after('color');
            $table->string('orcr_file')->nullable()->after('vehicle_photo');
            $table->date('registration_expiry_date')->nullable()->after('orcr_file');
        });
    }

    public function down(): void
    {
        Schema::table('vehicles', function (Blueprint $table) {
            $table->dropColumn([
                'body_number',
                'vehicle_photo',
                'orcr_file',
                'registration_expiry_date',
            ]);
        });

        Schema::table('drivers', function (Blueprint $table) {
            $table->dropColumn([
                'date_of_birth',
                'current_address',
                'profile_photo',
                'government_id_type',
                'government_id_file',
                'license_expiry_date',
                'license_restriction',
                'toda_id_number',
                'toda_association',
                'franchise_permit_file',
                'emergency_contact_name',
                'emergency_contact_number',
                'background_check_consent',
                'platform_rules_accepted',
                'submitted_at',
            ]);
        });
    }
};
