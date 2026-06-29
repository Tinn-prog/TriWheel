<?php

use App\Support\RideTypes;

class FareService
{
    /**
     * @return array{base: float, succeeding: float}
     */
    public function fareRuleForRideType(?string $rideType): array
    {
        $normalized = $this->normalizeRideType($rideType);
        $rules = PlatformSetting::fareRules();
        $rule = $rules[$normalized] ?? $rules['tricycle'] ?? null;

        if (! is_array($rule)) {
            $rule = PlatformSetting::defaultFareRules()['tricycle'];
        }

        return [
            'base' => (float) ($rule['base'] ?? 35.0),
            'succeeding' => (float) ($rule['succeeding'] ?? 14.0),
        ];
    }

    public function minimumFareForRideType(?string $rideType): float
    {
        return $this->fareRuleForRideType($rideType)['base'];
    }

    public function distanceKm(float $fromLat, float $fromLng, float $toLat, float $toLng): float
    {
        $earthRadiusKm = 6371.0;
        $latFrom = deg2rad($fromLat);
        $lngFrom = deg2rad($fromLng);
        $latTo = deg2rad($toLat);
        $lngTo = deg2rad($toLng);

        $latDelta = $latTo - $latFrom;
        $lngDelta = $lngTo - $lngFrom;

        $sinLat = sin($latDelta / 2);
        $sinLng = sin($lngDelta / 2);
        $a = ($sinLat * $sinLat)
            + (cos($latFrom) * cos($latTo) * $sinLng * $sinLng);

        return $earthRadiusKm * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }

    public function fareForDistance(float $distanceKm, ?string $rideType = null): float
    {
        $fareRule = $this->fareRuleForRideType($rideType);
        $billableSucceedingKm = max(0, (int) ceil($distanceKm - 1));

        return round(
            $fareRule['base'] + ($billableSucceedingKm * $fareRule['succeeding']),
            2,
        );
    }

    private function normalizeRideType(?string $rideType): string
    {
        return RideTypes::normalize($rideType);
    }
}
