<?php

namespace App\Services;

use App\Models\Driver;
use App\Models\Ride;
use App\Support\RideTypes;
use Illuminate\Database\Eloquent\Collection;

class EmergencyDispatchService
{
    public function __construct(
        private readonly FareService $fareService,
        private readonly RoadRestrictionService $roadRestrictions,
    ) {
    }

    /**
     * @return Collection<int, Driver>
     */
    public function findAvailableDrivers(
        ?float $pickupLat,
        ?float $pickupLng,
        ?float $dropoffLat = null,
        ?float $dropoffLng = null,
    ): Collection {
        $busyDriverIds = Ride::query()
            ->whereIn('status', ['accepted', 'ongoing'])
            ->whereNotNull('driver_id')
            ->pluck('driver_id');

        $drivers = Driver::query()
            ->with(['vehicle', 'user:id,name'])
            ->where('status', 'online')
            ->where('approval_status', 'approved')
            ->when(
                $busyDriverIds->isNotEmpty(),
                fn ($query) => $query->whereNotIn('id', $busyDriverIds),
            )
            ->whereHas('vehicle', function ($query): void {
                $query->where(function ($vehicleQuery): void {
                    $vehicleQuery
                        ->whereRaw('LOWER(vehicle_type) LIKE ?', ['%tricycle%'])
                        ->orWhereRaw('LOWER(vehicle_type) LIKE ?', ['%e-tricycle%'])
                        ->orWhereRaw('LOWER(vehicle_type) LIKE ?', ['%etricycle%'])
                        ->orWhereRaw('LOWER(vehicle_type) LIKE ?', ['%etrike%']);
                })->whereRaw('LOWER(vehicle_type) NOT LIKE ?', ['%pedicab%']);
            })
            ->get()
            ->filter(fn (Driver $driver): bool => $this->isEmergencyEligibleVehicle($driver->vehicle?->vehicle_type))
            ->when(
                $pickupLat !== null && $pickupLng !== null && $dropoffLat !== null && $dropoffLng !== null,
                fn (Collection $drivers) => $drivers->filter(function (Driver $driver) use (
                    $pickupLat,
                    $pickupLng,
                    $dropoffLat,
                    $dropoffLng,
                ): bool {
                    $result = $this->roadRestrictions->checkRide(
                        $driver->vehicle?->vehicle_type ?? 'tricycle',
                        $pickupLat,
                        $pickupLng,
                        $dropoffLat,
                        $dropoffLng,
                        true,
                        $driver,
                    );

                    return $result['allowed'];
                }),
            )
            ->values();

        if ($pickupLat === null || $pickupLng === null) {
            return $drivers->sortBy('id')->values();
        }

        return $drivers
            ->sortBy(function (Driver $driver) use ($pickupLat, $pickupLng): array {
                $location = $this->estimateDriverLocation($driver);

                if ($location === null) {
                    return [1, PHP_FLOAT_MAX, $driver->id];
                }

                return [
                    0,
                    $this->fareService->distanceKm(
                        $pickupLat,
                        $pickupLng,
                        $location['lat'],
                        $location['lng'],
                    ),
                    $driver->id,
                ];
            })
            ->values();
    }

    public function driverHasActiveRide(int $driverId): bool
    {
        return Ride::query()
            ->where('driver_id', $driverId)
            ->whereIn('status', ['accepted', 'ongoing'])
            ->exists();
    }

    public function normalizeVehicleRideType(?string $vehicleType): string
    {
        return RideTypes::normalize($vehicleType);
    }

    private function isEmergencyEligibleVehicle(?string $vehicleType): bool
    {
        $normalized = strtolower((string) preg_replace('/[^a-z0-9_-]+/i', '', $vehicleType ?? ''));

        if ($normalized === '' || str_contains($normalized, 'pedicab')) {
            return false;
        }

        return str_contains($normalized, 'tricycle') || str_contains($normalized, 'etrike');
    }

    /**
     * @return array{lat: float, lng: float}|null
     */
    private function estimateDriverLocation(Driver $driver): ?array
    {
        if (
            $driver->current_lat !== null &&
            $driver->current_lng !== null &&
            $driver->location_updated_at?->greaterThan(now()->subMinutes(10))
        ) {
            return [
                'lat' => (float) $driver->current_lat,
                'lng' => (float) $driver->current_lng,
            ];
        }

        $lastRide = Ride::query()
            ->where('driver_id', $driver->id)
            ->where('status', 'completed')
            ->whereNotNull('dropoff_lat')
            ->whereNotNull('dropoff_lng')
            ->latest('completed_at')
            ->first();

        if (! $lastRide) {
            return null;
        }

        return [
            'lat' => (float) $lastRide->dropoff_lat,
            'lng' => (float) $lastRide->dropoff_lng,
        ];
    }
}
