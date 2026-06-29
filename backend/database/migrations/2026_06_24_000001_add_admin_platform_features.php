<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_suspended')->default(false)->after('is_verified');
            $table->string('suspension_reason')->nullable()->after('is_suspended');
            $table->string('verification_rejection_reason')->nullable()->after('suspension_reason');
            $table->string('admin_role', 32)->nullable()->after('role');
        });

        Schema::create('platform_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->json('value');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('platform_settings');

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'is_suspended',
                'suspension_reason',
                'verification_rejection_reason',
                'admin_role',
            ]);
        });
    }
};
