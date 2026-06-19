<?php

namespace App\Services;

class FareService
{
    /**
     * @return array{base: float, succeeding: float}
     */
    public function fareRuleForRideType(?string $rideType): array
    {
        return match ($this->normalizeRideType($rideType)) {
            'pedicab' => ['base' => 25.00, 'succeeding' => 10.00],
            'e-tricycle' => ['base' => 40.00, 'succeeding' => 16.00],
            default => ['base' => 35.00, 'succeeding' => 14.00],
        };
    }

    public function minimumFareForRideType(?string $rideType): float
    {
        return $this->fareRuleForRideType($rideType)['base'];
    }

    public function distanceKm(float $fromLat, float $fromLng, float $toLat, float $toLng): float
    {
        $earthRadiusKm = 6371;
        $latFrom = deg2rad($fromLat);
        $lngFrom = deg2rad($fromLng);
        $latTo = deg2rad($toLat);
        $lngTo = deg2rad($toLng);

        $latDelta = $latTo - $latFrom;
        $lngDelta = $lngTo - $lngFrom;

        $a = sin($latDelta / 2) ** 2
            + cos($latFrom) * cos($latTo) * sin($lngDelta / 2) ** 2;

        return $earthRadiusKm * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }

    public function fareForDistance(float $distanceKm, ?string $rideType = null): float
    {
        $fareRule = $this->fareRuleForRideType($rideType);
        $baseFare = $fareRule['base'];
        $succeedingKmRate = $fareRule['succeeding'];
        $billableSucceedingKm = max(0, (int) ceil($distanceKm - 1));

        return round($baseFare + ($billableSucceedingKm * $succeedingKmRate), 2);
    }

    private function normalizeRideType(?string $rideType): string
    {
        $normalized = strtolower((string) preg_replace('/[^a-z0-9_-]+/i', '', $rideType ?? ''));

        return match ($normalized) {
            'pedicab', 'motorcycle' => 'pedicab',
            'etricycle', 'e-tricycle', 'etrike', 'car' => 'e-tricycle',
            default => 'tricycle',
        };
    }
}
