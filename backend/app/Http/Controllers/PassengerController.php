<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\BlocksSuspendedUsers;
use App\Models\Driver;
use App\Models\Ride;
use App\Models\RideOffer;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Services\NotificationService;
use App\Support\RideReportReasons;
use Illuminate\Support\Facades\DB;

class PassengerController extends Controller
{
    use BlocksSuspendedUsers;

    public function overview(Request $request): JsonResponse
    {
        $userId = (int) $request->query('user_id');

        if ($userId <= 0) {
            return response()->json([
                'message' => 'A passenger user_id is required.',
            ], 422);
        }

        $passenger = User::query()
            ->where('role', 'passenger')
            ->findOrFail($userId);

        $this->ensureActiveUser($passenger);

        $busyDriverIds = Ride::query()
            ->whereIn('status', ['accepted', 'ongoing'])
            ->whereNotNull('driver_id')
            ->pluck('driver_id');

        $activeRide = Ride::query()
            ->with([
                'driver.user:id,name',
                'driver.vehicle:id,driver_id,vehicle_type,plate_number,color',
                'offers' => fn ($query) => $query
                    ->where('status', 'pending')
                    ->when(
                        $busyDriverIds->isNotEmpty(),
                        fn ($offerQuery) => $offerQuery->whereNotIn('driver_id', $busyDriverIds),
                    )
                    ->with([
                        'driver.user:id,name,email,contact_number',
                        'driver.vehicle:id,driver_id,vehicle_type,plate_number,color',
                    ])
                    ->latest(),
            ])
            ->where('passenger_id', $passenger->id)
            ->whereIn('status', ['requested', 'accepted', 'ongoing'])
            ->latest()
            ->first();

        $rideHistory = Ride::query()
            ->with([
                'driver.user:id,name',
                'driver.vehicle:id,driver_id,vehicle_type,plate_number,color',
            ])
            ->where('passenger_id', $passenger->id)
            ->where('hidden_for_passenger', false)
            ->latest()
            ->limit(8)
            ->get();

        $driverIds = $rideHistory
            ->pluck('driver_id')
            ->filter()
            ->all();

        if ($activeRide?->driver_id) {
            $driverIds[] = $activeRide->driver_id;
        }

        if ($activeRide?->relationLoaded('offers')) {
            $driverIds = array_merge(
                $driverIds,
                $activeRide->offers->pluck('driver_id')->filter()->all(),
            );
        }

        $pendingRatingRide = Ride::query()
            ->with([
                'driver.user:id,name',
                'driver.vehicle:id,driver_id,vehicle_type,plate_number,color',
            ])
            ->where('passenger_id', $passenger->id)
            ->where('status', 'completed')
            ->where('passenger_rated', false)
            ->latest()
            ->first();

        if ($pendingRatingRide?->driver_id) {
            $driverIds[] = $pendingRatingRide->driver_id;
        }

        $driverRatingStats = $this->driverRatingStatsMap($driverIds);

        $completedCount = Ride::where('passenger_id', $passenger->id)
            ->where('status', 'completed')
            ->count();
        $cancelledCount = Ride::where('passenger_id', $passenger->id)
            ->where('status', 'cancelled')
            ->count();

        return response()->json([
            'passenger' => [
                'id' => $passenger->id,
                'name' => $passenger->name,
                'email' => $passenger->email,
                'contact_number' => $passenger->contact_number,
            ],
            'stats' => [
                'total_rides' => Ride::where('passenger_id', $passenger->id)->count(),
                'completed' => $completedCount,
                'cancelled' => $cancelledCount,
                'active' => $activeRide ? 1 : 0,
            ],
            'active_ride' => $this->formatRide($activeRide, $passenger, $driverRatingStats),
            'pending_rating_ride' => $this->formatRide($pendingRatingRide, $passenger, $driverRatingStats),
            'ride_history' => $rideHistory->map(
                fn (Ride $ride): ?array => $this->formatRide($ride, $passenger, $driverRatingStats),
            ),
            'hidden_history_count' => Ride::query()
                ->where('passenger_id', $passenger->id)
                ->where('hidden_for_passenger', true)
                ->whereIn('status', ['completed', 'cancelled'])
                ->count(),
        ]);
    }

    public function chooseOffer(Request $request, RideOffer $offer, NotificationService $notifications): JsonResponse
    {
        $data = $request->validate([
            'user_id' => ['required', 'integer'],
        ]);

        $passenger = User::query()->findOrFail((int) $data['user_id']);

        return DB::transaction(function () use ($data, $notifications, $offer, $passenger): JsonResponse {
            $lockedOffer = RideOffer::query()
                ->whereKey($offer->id)
                ->lockForUpdate()
                ->firstOrFail();

            $ride = Ride::query()
                ->whereKey($lockedOffer->ride_id)
                ->lockForUpdate()
                ->firstOrFail();

            if ((int) $ride->passenger_id !== (int) $data['user_id']) {
                return response()->json([
                    'message' => 'This offer does not belong to the passenger ride.',
                ], 403);
            }

            if ($ride->status !== 'requested' || $lockedOffer->status !== 'pending') {
                return response()->json([
                    'message' => 'Only pending offers for requested rides can be chosen.',
                ], 422);
            }

            Driver::query()
                ->whereKey($lockedOffer->driver_id)
                ->lockForUpdate()
                ->firstOrFail();

            $driverBusy = Ride::query()
                ->where('driver_id', $lockedOffer->driver_id)
                ->whereIn('status', ['accepted', 'ongoing'])
                ->exists();

            if ($driverBusy) {
                $lockedOffer->update(['status' => 'rejected']);

                $lockedOffer->loadMissing('driver.user:id,name');
                $driverName = $lockedOffer->driver?->user?->name ?? 'This driver';

                $notifications->notify(
                    $passenger,
                    'ride.driver_unavailable',
                    'Driver no longer available',
                    "{$driverName} was just selected by another passenger. Please choose a different driver for your ride.",
                    '/passenger#active-ride',
                );

                return response()->json([
                    'message' => 'This driver is already assigned to another ride. Please choose a different driver.',
                ], 409);
            }

            $ride->update([
                'driver_id' => $lockedOffer->driver_id,
                'status' => 'accepted',
                'accepted_at' => now(),
            ]);

            $rejectedOffers = RideOffer::query()
                ->where('ride_id', $ride->id)
                ->whereKeyNot($lockedOffer->id)
                ->where('status', 'pending')
                ->with('driver.user:id,name')
                ->get();

            if ($rejectedOffers->isNotEmpty()) {
                RideOffer::query()
                    ->whereIn('id', $rejectedOffers->pluck('id'))
                    ->update(['status' => 'rejected']);
            }

            $lockedOffer->update(['status' => 'accepted']);

            $lockedOffer->loadMissing('driver.user:id,name');
            $driverName = $lockedOffer->driver?->user?->name ?? 'This driver';
            $passengerName = $passenger->name;

            foreach ($rejectedOffers as $rejectedOffer) {
                if (! $rejectedOffer->driver?->user) {
                    continue;
                }

                $notifications->notify(
                    $rejectedOffer->driver->user,
                    'ride.offer_not_chosen',
                    'Passenger chose another driver',
                    "{$passengerName} booked another driver for ride #{$ride->id}. Your offer was not selected.",
                    '/driver',
                );
            }

            $otherPendingOffers = RideOffer::query()
                ->where('driver_id', $lockedOffer->driver_id)
                ->where('ride_id', '!=', $ride->id)
                ->where('status', 'pending')
                ->with('ride.passenger:id,name')
                ->get();

            if ($otherPendingOffers->isNotEmpty()) {
                RideOffer::query()
                    ->whereIn('id', $otherPendingOffers->pluck('id'))
                    ->update(['status' => 'rejected']);

                foreach ($otherPendingOffers as $otherOffer) {
                    if (! $otherOffer->ride?->passenger) {
                        continue;
                    }

                    $notifications->notify(
                        $otherOffer->ride->passenger,
                        'ride.driver_unavailable',
                        'Driver no longer available',
                        "{$driverName} was selected by another passenger and is no longer available for your ride. Please choose another driver.",
                        '/passenger#active-ride',
                    );
                }
            }

            if ($lockedOffer->driver?->user) {
                $notifications->notify(
                    $lockedOffer->driver->user,
                    'ride.offer_chosen',
                    'Passenger chose your offer',
                    "You were selected for ride #{$ride->id}. Head to pickup now.",
                    '/driver',
                );
            }

            return response()->json([
                'message' => 'Driver selected successfully.',
                'ride' => $this->formatRide(
                    $ride
                        ->refresh()
                        ->load([
                            'driver.user:id,name',
                            'driver.vehicle:id,driver_id,vehicle_type,plate_number,color',
                        ]),
                    $passenger,
                    $this->driverRatingStatsMap([$ride->driver_id]),
                ),
            ]);
        });
    }

    private function formatRide(?Ride $ride, ?User $viewer = null, array $driverRatingStats = []): ?array
    {
        if (! $ride) {
            return null;
        }

        $reportFlags = $viewer
            ? RideReportReasons::viewerFlags($ride, $viewer)
            : ['can_report' => false, 'report_submitted' => false];

        $driverStats = $ride->driver_id
            ? ($driverRatingStats[$ride->driver_id] ?? [
                'average' => null,
                'count' => 0,
                'emergency_average' => null,
                'emergency_count' => 0,
            ])
            : [
                'average' => null,
                'count' => 0,
                'emergency_average' => null,
                'emergency_count' => 0,
            ];

        return [
            'id' => $ride->id,
            'pickup_address' => $ride->pickup_address,
            'dropoff_address' => $ride->dropoff_address,
            'pickup_lat' => $ride->pickup_lat ? (float) $ride->pickup_lat : null,
            'pickup_lng' => $ride->pickup_lng ? (float) $ride->pickup_lng : null,
            'dropoff_lat' => $ride->dropoff_lat ? (float) $ride->dropoff_lat : null,
            'dropoff_lng' => $ride->dropoff_lng ? (float) $ride->dropoff_lng : null,
            'ride_type' => $ride->ride_type,
            'status' => $ride->status,
            'is_emergency' => (bool) $ride->is_emergency,
            'fare' => $ride->fare ? (float) $ride->fare : null,
            'rating' => $ride->rating,
            'passenger_feedback' => $ride->passenger_feedback,
            'passenger_rated' => (bool) $ride->passenger_rated,
            'driver_rating' => $ride->driver_rating,
            'driver_feedback' => $ride->driver_feedback,
            'driver_rated' => (bool) $ride->driver_rated,
            'cancelled_by' => $ride->cancelled_by,
            'cancellation_reason_code' => $ride->cancellation_reason_code,
            'cancellation_reason' => $ride->cancellation_reason,
            'created_at' => $ride->created_at,
            'driver_name' => $ride->driver?->user?->name,
            'driver_phone' => $ride->driver?->phone,
            'driver_average_rating' => $driverStats['average'],
            'driver_rating_count' => $driverStats['count'],
            'driver_emergency_average_rating' => $driverStats['emergency_average'],
            'driver_emergency_rating_count' => $driverStats['emergency_count'],
            'driver_lat' => $this->shareableDriverLat($ride),
            'driver_lng' => $this->shareableDriverLng($ride),
            'driver_location_updated_at' => $this->shareableDriverLocationUpdatedAt($ride),
            'vehicle_type' => $ride->driver?->vehicle?->vehicle_type,
            'plate_number' => $ride->driver?->vehicle?->plate_number,
            'vehicle_color' => $ride->driver?->vehicle?->color,
            'offers' => $ride->relationLoaded('offers')
                ? $ride->offers
                    ->map(fn (RideOffer $offer): array => $this->formatOffer($offer, $driverRatingStats))
                    ->values()
                : [],
            'can_report' => $reportFlags['can_report'],
            'report_submitted' => $reportFlags['report_submitted'],
        ];
    }

    private function formatOffer(RideOffer $offer, array $driverRatingStats = []): array
    {
        $driverStats = $driverRatingStats[$offer->driver_id] ?? [
            'average' => null,
            'count' => 0,
            'emergency_average' => null,
            'emergency_count' => 0,
        ];

        return [
            'id' => $offer->id,
            'status' => $offer->status,
            'driver_id' => $offer->driver_id,
            'driver_name' => $offer->driver?->user?->name,
            'driver_phone' => $offer->driver?->phone,
            'driver_status' => $offer->driver?->status,
            'driver_average_rating' => $driverStats['average'],
            'driver_rating_count' => $driverStats['count'],
            'vehicle_type' => $offer->driver?->vehicle?->vehicle_type,
            'plate_number' => $offer->driver?->vehicle?->plate_number,
            'vehicle_color' => $offer->driver?->vehicle?->color,
            'created_at' => $offer->created_at,
        ];
    }

    /**
     * @param  list<int|string|null>  $driverIds
     * @return array<int, array{average: float|null, count: int, emergency_average: float|null, emergency_count: int}>
     */
    private function driverRatingStatsMap(array $driverIds): array
    {
        $normalizedIds = array_values(array_unique(array_filter(
            array_map(static fn ($id): int => (int) $id, $driverIds),
            static fn (int $id): bool => $id > 0,
        )));

        if ($normalizedIds === []) {
            return [];
        }

        $stats = [];

        foreach ($normalizedIds as $driverId) {
            $stats[$driverId] = [
                'average' => null,
                'count' => 0,
                'emergency_average' => null,
                'emergency_count' => 0,
            ];
        }

        $ratings = Ride::query()
            ->whereIn('driver_id', $normalizedIds)
            ->where('passenger_rated', true)
            ->whereNotNull('rating')
            ->get(['driver_id', 'rating', 'is_emergency']);

        foreach ($ratings->groupBy('driver_id') as $driverId => $driverRatings) {
            $regularScores = $driverRatings
                ->where('is_emergency', false)
                ->pluck('rating')
                ->map(static fn ($rating): int => (int) $rating)
                ->filter(static fn (int $rating): bool => $rating >= 1 && $rating <= 5)
                ->values();

            $emergencyScores = $driverRatings
                ->where('is_emergency', true)
                ->pluck('rating')
                ->map(static fn ($rating): int => (int) $rating)
                ->filter(static fn (int $rating): bool => $rating >= 1 && $rating <= 5)
                ->values();

            $stats[(int) $driverId] = [
                'average' => $regularScores->isNotEmpty()
                    ? round((float) $regularScores->avg(), 1)
                    : null,
                'count' => $regularScores->count(),
                'emergency_average' => $emergencyScores->isNotEmpty()
                    ? round((float) $emergencyScores->avg(), 1)
                    : null,
                'emergency_count' => $emergencyScores->count(),
            ];
        }

        return $stats;
    }

    private function canShareDriverLocation(Ride $ride): bool
    {
        if (! in_array($ride->status, ['accepted', 'ongoing'], true)) {
            return false;
        }

        $driver = $ride->driver;

        if (
            $driver?->current_lat === null ||
            $driver?->current_lng === null ||
            $driver?->location_updated_at === null
        ) {
            return false;
        }

        return $driver->location_updated_at->greaterThan(now()->subMinutes(10));
    }

    private function shareableDriverLat(Ride $ride): ?float
    {
        if (! $this->canShareDriverLocation($ride)) {
            return null;
        }

        return (float) $ride->driver->current_lat;
    }

    private function shareableDriverLng(Ride $ride): ?float
    {
        if (! $this->canShareDriverLocation($ride)) {
            return null;
        }

        return (float) $ride->driver->current_lng;
    }

    private function shareableDriverLocationUpdatedAt(Ride $ride): ?string
    {
        if (! $this->canShareDriverLocation($ride)) {
            return null;
        }

        return $ride->driver->location_updated_at?->toIso8601String();
    }
}
