<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProfileChangeLog extends Model
{
    public const MONTHLY_LIMIT = 2;

    protected $fillable = [
        'user_id',
        'changed_fields',
    ];

    protected $casts = [
        'changed_fields' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
