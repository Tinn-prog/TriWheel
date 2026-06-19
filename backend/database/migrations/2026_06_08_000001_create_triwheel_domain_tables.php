<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('drivers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('license_number')->nullable();
            $table->string('phone')->nullable();
            $table->string('license_file')->nullable();
            $table->string('toda_id_file')->nullable();
            $table->enum('approval_status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->enum('status', ['offline', 'online'])->default('offline');
            $table->unsignedInteger('queue_position')->nullable()->index();
            $table->string('rejection_reason')->nullable();
            $table->timestamps();
        });

        Schema::create('vehicles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('driver_id')->constrained()->cascadeOnDelete();
            $table->string('vehicle_type')->nullable();
            $table->string('plate_number')->nullable();
            $table->string('color')->nullable();
            $table->timestamps();
        });

        Schema::create('rides', function (Blueprint $table) {
            $table->id();
            $table->foreignId('passenger_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('driver_id')->nullable()->constrained('drivers')->nullOnDelete();
            $table->decimal('pickup_lat', 10, 7)->nullable();
            $table->decimal('pickup_lng', 10, 7)->nullable();
            $table->decimal('dropoff_lat', 10, 7)->nullable();
            $table->decimal('dropoff_lng', 10, 7)->nullable();
            $table->string('pickup_address');
            $table->string('dropoff_address');
            $table->string('ride_type')->nullable();
            $table->string('terminal', 50)->nullable();
            $table->enum('status', ['requested', 'accepted', 'ongoing', 'completed', 'cancelled'])->default('requested')->index();
            $table->decimal('fare', 10, 2)->nullable();
            $table->string('rating')->nullable();
            $table->text('passenger_feedback')->nullable();
            $table->boolean('passenger_rated')->default(false);
            $table->string('driver_rating')->nullable();
            $table->text('driver_feedback')->nullable();
            $table->boolean('driver_rated')->default(false);
            $table->boolean('hidden_for_passenger')->default(false);
            $table->boolean('hidden_for_driver')->default(false);
            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('admin_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('admin_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('action', 80);
            $table->string('target_type', 40);
            $table->unsignedBigInteger('target_id');
            $table->text('details')->nullable();
            $table->timestamps();

            $table->index(['target_type', 'target_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_audit_logs');
        Schema::dropIfExists('rides');
        Schema::dropIfExists('vehicles');
        Schema::dropIfExists('drivers');
    }
};
