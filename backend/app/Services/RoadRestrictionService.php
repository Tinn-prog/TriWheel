<?php

namespace App\Services;

use App\Models\Driver;
use App\Models\PlatformSetting;
use App\Models\Ride;
use App\Support\RideTypes;

class RoadRestrictionService
{
    /**
     * @return array{
     *   allowed: bool,
     *   level: string,
     *   issues: list<array{code: string, message: string, severity: string}>
     * }
     */
    public function checkRide(
        string $vehicleType,
        ?float $pickupLat,
        ?float $pickupLng,
        ?float $dropoffLat,
        ?float $dropoffLng,
        bool $isEmergency = false,
        ?Driver $driver = null,
    ): array {
        $config = PlatformSetting::roadRestrictions();
        $issues = [];

        if ($isEmergency && ($config['emergency_bypass'] ?? true)) {
            return [
                'allowed' => true,
                'level' => 'ok',
                'issues' => [[
                    'code' => 'emergency_bypass',
                    'message' => 'Emergency ride — road restrictions bypassed for dispatch.',
                    'severity' => 'info',
                ]],
            ];
        }

        $normalizedType = $this->normalizeVehicleType($vehicleType);

        if (
            ($config['require_coordinates'] ?? false)
            && ($pickupLat === null || $pickupLng === null || $dropoffLat === null || $dropoffLng === null)
        ) {
            return [
                'allowed' => false,
                'level' => 'block',
                'issues' => [[
                    'code' => 'missing_coordinates',
                    'message' => 'Pickup and drop-off map pins are required for compliance checks.',
                    'severity' => 'block',
                ]],
            ];
        }

        if ($pickupLat !== null && $pickupLng !== null && $dropoffLat !== null && $dropoffLng !== null) {
            $issues = array_merge(
                $issues,
                $this->checkCorridors($config, $normalizedType, $pickupLat, $pickupLng, $dropoffLat, $dropoffLng),
            );
            $issues = array_merge(
                $issues,
                $this->checkServiceZones($config, $normalizedType, $pickupLat, $pickupLng, $dropoffLat, $dropoffLng, $driver),
            );
        } elseif ($pickupLat !== null && $pickupLng !== null) {
            $issues[] = [
                'code' => 'incomplete_route',
                'message' => 'Set a drop-off pin so TriWheel can check restricted roads.',
                'severity' => 'warn',
            ];
        }

        return $this->summarize($issues);
    }

    public function driverCanServeRide(Driver $driver, Ride $ride): bool
    {
        if (! $this->driverMatchesRideType($driver, $ride)) {
            return false;
        }

        $vehicleType = $driver->vehicle?->vehicle_type ?? $ride->ride_type ?? 'tricycle';
        $result = $this->checkRide(
            $vehicleType,
            $ride->pickup_lat ? (float) $ride->pickup_lat : null,
            $ride->pickup_lng ? (float) $ride->pickup_lng : null,
            $ride->dropoff_lat ? (float) $ride->dropoff_lat : null,
            $ride->dropoff_lng ? (float) $ride->dropoff_lng : null,
            false,
            $driver,
        );

        return $result['allowed'];
    }

    /**
     * @param  array<string, mixed>  $config
     * @return list<array{code: string, message: string, severity: string}>
     */
    private function checkCorridors(
        array $config,
        string $vehicleType,
        float $pickupLat,
        float $pickupLng,
        float $dropoffLat,
        float $dropoffLng,
    ): array {
        if (! ($config['enforce_corridors'] ?? true)) {
            return [];
        }

        $issues = [];
        $points = $this->sampleRoutePoints($pickupLat, $pickupLng, $dropoffLat, $dropoffLng);

        foreach ($config['corridors'] ?? [] as $corridor) {
            if (! ($corridor['enabled'] ?? true)) {
                continue;
            }

            $severity = $corridor['rules'][$vehicleType] ?? 'warn';
            if ($severity === 'allow') {
                continue;
            }

            $bounds = $corridor['bounds'] ?? null;
            if (! is_array($bounds)) {
                continue;
            }

            $matchMode = $corridor['match_mode'] ?? 'any';
            $hitsEndpoint = $this->pointInBounds($pickupLat, $pickupLng, $bounds)
                || $this->pointInBounds($dropoffLat, $dropoffLng, $bounds);
            $hitsRoute = $this->anyPointInBounds($points, $bounds);

            $matched = match ($matchMode) {
                'endpoints' => $hitsEndpoint,
                'route_only' => $hitsRoute && ! $hitsEndpoint,
                default => $hitsEndpoint || $hitsRoute,
            };

            if (! $matched) {
                continue;
            }

            $message = match ($vehicleType) {
                'pedicab' => "{$corridor['name']} is restricted for pedicabs. Use barangay roads and designated crossings only.",
                'e-tricycle' => "{$corridor['name']} is restricted for e-tricycles under LGU rules.",
                default => "{$corridor['name']} may be restricted for tricycles. Use local streets when possible.",
            };

            $issues[] = [
                'code' => 'corridor_'.$corridor['id'],
                'message' => $message,
                'severity' => $severity,
            ];
        }

        return $issues;
    }

    /**
     * @param  array<string, mixed>  $config
     * @return list<array{code: string, message: string, severity: string}>
     */
    private function checkServiceZones(
        array $config,
        string $vehicleType,
        float $pickupLat,
        float $pickupLng,
        float $dropoffLat,
        float $dropoffLng,
        ?Driver $driver,
    ): array {
        if (! ($config['enforce_zones'] ?? true)) {
            return [];
        }

        $zones = $config['zones'] ?? [];
        if ($zones === []) {
            return [];
        }

        $issues = [];

        if ($driver?->service_zone_id) {
            $zone = collect($zones)->firstWhere('id', $driver->service_zone_id);

            if ($zone && ($zone['enabled'] ?? true)) {
                $polygon = $zone['polygon'] ?? [];
                $pickupInside = $this->pointInPolygon($pickupLat, $pickupLng, $polygon);
                $dropoffInside = $this->pointInPolygon($dropoffLat, $dropoffLng, $polygon);

                if (! $pickupInside || ! $dropoffInside) {
                    $issues[] = [
                        'code' => 'driver_zone',
                        'message' => "This trip is outside your assigned service zone ({$zone['name']}).",
                        'severity' => 'block',
                    ];
                }
            }
        } else {
            $matchingZones = collect($zones)
                ->filter(fn (array $zone): bool => ($zone['enabled'] ?? true)
                    && in_array($vehicleType, $zone['vehicle_types'] ?? [], true))
                ->filter(function (array $zone) use ($pickupLat, $pickupLng, $dropoffLat, $dropoffLng): bool {
                    $polygon = $zone['polygon'] ?? [];

                    return $this->pointInPolygon($pickupLat, $pickupLng, $polygon)
                        && $this->pointInPolygon($dropoffLat, $dropoffLng, $polygon);
                });

            if ($matchingZones->isEmpty()) {
                $issues[] = [
                    'code' => 'outside_service_area',
                    'message' => 'Pickup or drop-off is outside configured LGU service zones.',
                    'severity' => 'warn',
                ];
            }
        }

        return $issues;
    }

    /**
     * @param  list<array{code: string, message: string, severity: string}>  $issues
     * @return array{allowed: bool, level: string, issues: list<array{code: string, message: string, severity: string}>}
     */
    private function summarize(array $issues): array
    {
        $hasBlock = collect($issues)->contains(fn (array $issue): bool => $issue['severity'] === 'block');
        $hasWarn = collect($issues)->contains(fn (array $issue): bool => $issue['severity'] === 'warn');

        return [
            'allowed' => ! $hasBlock,
            'level' => $hasBlock ? 'block' : ($hasWarn ? 'warn' : 'ok'),
            'issues' => array_values($issues),
        ];
    }

    private function normalizeVehicleType(string $vehicleType): string
    {
        return RideTypes::normalize($vehicleType);
    }

    public function driverMatchesRideType(Driver $driver, Ride $ride): bool
    {
        $requestedType = RideTypes::normalize($ride->ride_type);
        $driverType = RideTypes::normalize($driver->vehicle?->vehicle_type);

        return $requestedType === $driverType;
    }

    /**
     * @return list<array{lat: float, lng: float}>
     */
    private function sampleRoutePoints(
        float $pickupLat,
        float $pickupLng,
        float $dropoffLat,
        float $dropoffLng,
        int $steps = 8,
    ): array {
        $points = [];

        for ($step = 0; $step <= $steps; $step++) {
            $ratio = $step / $steps;
            $points[] = [
                'lat' => $pickupLat + (($dropoffLat - $pickupLat) * $ratio),
                'lng' => $pickupLng + (($dropoffLng - $pickupLng) * $ratio),
            ];
        }

        return $points;
    }

    /**
     * @param  list<array{lat: float, lng: float}>  $points
     * @param  array{south: float, north: float, west: float, east: float}  $bounds
     */
    private function anyPointInBounds(array $points, array $bounds): bool
    {
        foreach ($points as $point) {
            if ($this->pointInBounds($point['lat'], $point['lng'], $bounds)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  array{south: float, north: float, west: float, east: float}  $bounds
     */
    private function pointInBounds(float $lat, float $lng, array $bounds): bool
    {
        return $lat >= (float) $bounds['south']
            && $lat <= (float) $bounds['north']
            && $lng >= (float) $bounds['west']
            && $lng <= (float) $bounds['east'];
    }

    /**
     * @param  list<array{0: float, 1: float}|array{lat: float, lng: float}>  $polygon
     */
    private function pointInPolygon(float $lat, float $lng, array $polygon): bool
    {
        if (count($polygon) < 3) {
            return true;
        }

        $inside = false;
        $count = count($polygon);

        for ($i = 0, $j = $count - 1; $i < $count; $j = $i++) {
            [$yi, $xi] = $this->normalizePolygonPoint($polygon[$i]);
            [$yj, $xj] = $this->normalizePolygonPoint($polygon[$j]);

            $intersects = (($yi > $lat) !== ($yj > $lat))
                && ($lng < (($xj - $xi) * ($lat - $yi) / (($yj - $yi) ?: 1e-12)) + $xi);

            if ($intersects) {
                $inside = ! $inside;
            }
        }

        return $inside;
    }

    /**
     * @param  array{0: float, 1: float}|array{lat: float, lng: float}  $point
     * @return array{0: float, 1: float}
     */
    private function normalizePolygonPoint(array $point): array
    {
        if (array_is_list($point)) {
            return [(float) $point[0], (float) $point[1]];
        }

        return [(float) $point['lat'], (float) $point['lng']];
    }
}
