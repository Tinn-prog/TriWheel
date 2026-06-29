<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Ride extends Model
{
    protected $fillable = [
        'passenger_id',
        'driver_id',
        'pickup_lat',
        'pickup_lng',
        'dropoff_lat',
        'dropoff_lng',
        'pickup_address',
        'dropoff_address',
        'ride_type',
        'terminal',
        'status',
        'is_emergency',
        'fare',
        'rating',
        'passenger_feedback',
        'passenger_rated',
        'driver_rating',
        'driver_feedback',
        'driver_rated',
        'hidden_for_passenger',
        'hidden_for_driver',
        'accepted_at',
        'started_at',
        'completed_at',
        'cancelled_by',
        'cancellation_reason_code',
        'cancellation_reason',
        'compliance_bypassed',
        'compliance_issues',
    ];

    protected $casts = [
        'pickup_lat' => 'decimal:7',
        'pickup_lng' => 'decimal:7',
        'dropoff_lat' => 'decimal:7',
        'dropoff_lng' => 'decimal:7',
        'fare' => 'decimal:2',
        'passenger_rated' => 'boolean',
        'driver_rated' => 'boolean',
        'hidden_for_passenger' => 'boolean',
        'hidden_for_driver' => 'boolean',
        'is_emergency' => 'boolean',
        'compliance_bypassed' => 'boolean',
        'compliance_issues' => 'array',
        'accepted_at' => 'datetime',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function passenger(): BelongsTo
    {
        return $this->belongsTo(User::class, 'passenger_id');
    }

    public function driver(): BelongsTo
    {
        return $this->belongsTo(Driver::class);
    }

    public function offers(): HasMany
    {
        return $this->hasMany(RideOffer::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(RideMessage::class);
    }
}
