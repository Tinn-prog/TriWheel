<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RideOffer extends Model
{
    protected $fillable = [
        'ride_id',
        'driver_id',
        'status',
    ];

    public function ride(): BelongsTo
    {
        return $this->belongsTo(Ride::class);
    }

    public function driver(): BelongsTo
    {
        return $this->belongsTo(Driver::class);
    }

    public static function driverWithdrewFromRide(int $driverId, int $rideId): bool
    {
        return static::query()
            ->where('ride_id', $rideId)
            ->where('driver_id', $driverId)
            ->where('status', 'cancelled')
            ->exists();
    }
}
