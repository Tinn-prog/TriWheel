<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Vehicle extends Model
{
    protected $fillable = [
        'driver_id',
        'vehicle_type',
        'plate_number',
        'body_number',
        'color',
        'vehicle_photo',
        'orcr_file',
        'registration_expiry_date',
    ];

    protected $casts = [
        'registration_expiry_date' => 'date',
    ];

    public function driver(): BelongsTo
    {
        return $this->belongsTo(Driver::class);
    }
}
