<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, SoftDeletes, \Illuminate\Notifications\Notifiable;

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
        'terms_accepted_at',
        'submitted_at',
        'role',
        'is_verified',
        'is_suspended',
        'suspension_reason',
        'suspended_at',
        'suspension_appeal_deadline_at',
        'suspension_appeal_message',
        'suspension_appeal_submitted_at',
        'suspension_requires_office_visit',
        'account_permanently_closed_at',
        'verification_rejection_reason',
        'admin_role',
        'password',
        'deleted_by',
        'deletion_reason',
        'restore_appeal_message',
        'restore_appeal_submitted_at',
        'permanently_purged_at',
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
            'is_suspended' => 'boolean',
            'suspended_at' => 'datetime',
            'suspension_appeal_deadline_at' => 'datetime',
            'suspension_appeal_submitted_at' => 'datetime',
            'suspension_requires_office_visit' => 'boolean',
            'account_permanently_closed_at' => 'datetime',
            'safety_terms_accepted' => 'boolean',
            'terms_accepted_at' => 'datetime',
            'submitted_at' => 'datetime',
            'password' => 'hashed',
            'reset_expiry' => 'datetime',
            'deleted_at' => 'datetime',
            'restore_appeal_submitted_at' => 'datetime',
            'permanently_purged_at' => 'datetime',
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

    public function deletedByAdmin(): BelongsTo
    {
        return $this->belongsTo(self::class, 'deleted_by');
    }

    protected static function booted(): void
    {
        static::saving(function (User $user): void {
            if ($user->role === 'admin') {
                if (blank($user->admin_role)) {
                    $user->admin_role = 'operator';
                }

                return;
            }

            $user->admin_role = null;
        });
    }
}
