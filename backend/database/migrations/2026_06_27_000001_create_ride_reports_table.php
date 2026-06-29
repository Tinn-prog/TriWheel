<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ride_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ride_id')->constrained('rides')->cascadeOnDelete();
            $table->foreignId('reporter_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('reported_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('reporter_role', 20);
            $table->string('report_reason_code', 40);
            $table->string('report_reason', 255);
            $table->string('status', 20)->default('pending');
            $table->timestamps();

            $table->unique(['ride_id', 'reporter_user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ride_reports');
    }
};
