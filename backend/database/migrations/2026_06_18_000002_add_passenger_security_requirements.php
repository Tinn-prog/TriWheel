<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->date('date_of_birth')->nullable()->after('contact_number');
            $table->string('current_address')->nullable()->after('date_of_birth');
            $table->string('profile_photo')->nullable()->after('current_address');
            $table->string('government_id_type')->nullable()->after('profile_photo');
            $table->string('government_id_file')->nullable()->after('government_id_type');
            $table->string('emergency_contact_name')->nullable()->after('government_id_file');
            $table->string('emergency_contact_number')->nullable()->after('emergency_contact_name');
            $table->boolean('safety_terms_accepted')->default(false)->after('emergency_contact_number');
            $table->timestamp('submitted_at')->nullable()->after('safety_terms_accepted');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'date_of_birth',
                'current_address',
                'profile_photo',
                'government_id_type',
                'government_id_file',
                'emergency_contact_name',
                'emergency_contact_number',
                'safety_terms_accepted',
                'submitted_at',
            ]);
        });
    }
};
