<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Driver extends Model
{
    protected $fillable = [
        'user_id',
        'license_number',
        'phone',
        'date_of_birth',
        'current_address',
        'profile_photo',
        'government_id_type',
        'government_id_file',
        'license_file',
        'license_expiry_date',
        'license_restriction',
        'toda_id_file',
        'toda_id_number',
        'toda_association',
        'franchise_permit_file',
        'emergency_contact_name',
        'emergency_contact_number',
        'background_check_consent',
        'platform_rules_accepted',
        'submitted_at',
        'approval_status',
        'status',
        'queue_position',
        'rejection_reason',
    ];

    protected $casts = [
        'date_of_birth' => 'date',
        'license_expiry_date' => 'date',
        'background_check_consent' => 'boolean',
        'platform_rules_accepted' => 'boolean',
        'submitted_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function vehicle(): HasOne
    {
        return $this->hasOne(Vehicle::class);
    }

    public function rides(): HasMany
    {
        return $this->hasMany(Ride::class);
    }

    public function offers(): HasMany
    {
        return $this->hasMany(RideOffer::class);
    }
}
