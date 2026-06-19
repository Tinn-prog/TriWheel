<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'first_name',
        'middle_name',
        'last_name',
        'email',
        'contact_number',
        'date_of_birth',
        'current_address',
        'profile_photo',
        'government_id_type',
        'government_id_file',
        'emergency_contact_name',
        'emergency_contact_number',
        'safety_terms_accepted',
        'submitted_at',
        'role',
        'is_verified',
        'password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'date_of_birth' => 'date',
            'is_verified' => 'boolean',
            'safety_terms_accepted' => 'boolean',
            'submitted_at' => 'datetime',
            'password' => 'hashed',
            'reset_expiry' => 'datetime',
        ];
    }

    public function driver(): HasOne
    {
        return $this->hasOne(Driver::class);
    }

    public function rides(): HasMany
    {
        return $this->hasMany(Ride::class, 'passenger_id');
    }
}
