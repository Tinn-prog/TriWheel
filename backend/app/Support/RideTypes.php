<?php

namespace App\Support;

class RideTypes
{
    public static function normalize(?string $rideType): string
    {
        $normalized = strtolower((string) preg_replace('/[^a-z0-9_-]+/i', '', $rideType ?? ''));

        return match ($normalized) {
            'tricycle' => 'tricycle',
            'pedicab', 'motorcycle' => 'pedicab',
            'etricycle', 'e-tricycle', 'etrike', 'car' => 'e-tricycle',
            default => 'tricycle',
        };
    }
}
