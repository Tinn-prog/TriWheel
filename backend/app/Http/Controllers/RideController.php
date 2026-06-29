<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\BlocksSuspendedUsers;
use App\Models\Driver;
use App\Models\Ride;
use App\Models\RideOffer;
use App\Models\User;
use App\Services\EmergencyDispatchService;
use App\Services\FareService;
use App\Services\NotificationService;
use App\Services\RoadRestrictionService;
use App\Services\RideMatchingService;
use App\Support\RideTypes;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class RideController extends Controller
{
    use BlocksSuspendedUsers;

    public function store(
        Request $request,
        FareService $fareService,
        RideMatchingService $rideMatchingService,
        NotificationService $notifications,
        RoadRestrictionService $roadRestrictions,
    ): JsonResponse {
        $data = $request->validate([
            'user_id' => ['required', 'integer', Rule::exists('users', 'id')->where('role', 'passenger')],
            'pickup_address' => ['required', 'string', 'max:255'],
            'dropoff_address' => ['required', 'string', 'max:255'],
            'ride_type' => ['nullable', 'string', 'max:40'],
            'pickup_lat' => ['nullable', 'numeric'],
            'pickup_lng' => ['nullable', 'numeric'],
            'dropoff_lat' => ['nullable', 'numeric'],
            'dropoff_lng' => ['nullable', 'numeric'],
        ]);

        $passenger = User::query()
            ->where('role', 'passenger')
            ->findOrFail($data['user_id']);

        $this->ensureActiveUser($passenger);

        $activeRide = Ride::query()
            ->where('passenger_id', $passenger->id)
            ->whereIn('status', ['requested', 'accepted', 'ongoing'])
            ->first();

        if ($activeRide) {
            return response()->json([
                'message' => 'You already have an active ride.',
                'ride' => $this->formatRide($activeRide),
            ], 409);
        }

        $rideType = $this->normalizeRideType($data['ride_type'] ?? null);

        $compliance = $roadRestrictions->checkRide(
            $rideType,
            isset($data['pickup_lat']) ? (float) $data['pickup_lat'] : null,
            isset($data['pickup_lng']) ? (float) $data['pickup_lng'] : null,
            isset($data['dropoff_lat']) ? (float) $data['dropoff_lat'] : null,
            isset($data['dropoff_lng']) ? (float) $data['dropoff_lng'] : null,
        );

        if (! $compliance['allowed']) {
            return response()->json([
                'message' => collect($compliance['issues'])
                    ->where('severity', 'block')
                    ->pluck('message')
                    ->first() ?? 'This route is not allowed for the selected vehicle type.',
                'compliance' => $compliance,
            ], 422);
        }

        $terminal = $rideMatchingService->detectTerminal($data['pickup_address'])
            ?? $rideMatchingService->detectTerminal($data['dropoff_address']);
        $fare = $this->calculateFare($data, $fareService, $rideType);

        $ride = Ride::create([
            'passenger_id' => $passenger->id,
            'pickup_lat' => $data['pickup_lat'] ?? null,
            'pickup_lng' => $data['pickup_lng'] ?? null,
            'dropoff_lat' => $data['dropoff_lat'] ?? null,
            'dropoff_lng' => $data['dropoff_lng'] ?? null,
            'pickup_address' => $data['pickup_address'],
            'dropoff_address' => $data['dropoff_address'],
            'ride_type' => $rideType,
            'terminal' => $terminal,
            'status' => 'requested',
            'fare' => $fare,
            'compliance_issues' => $compliance['issues'] ?: null,
        ]);

        $onlineDrivers = Driver::query()
            ->where('status', 'online')
            ->where('approval_status', 'approved')
            ->with(['user:id', 'vehicle'])
            ->get()
            ->filter(fn (Driver $driver): bool => $roadRestrictions->driverCanServeRide($driver, $ride));

        $notifications->notifyMany(
            $onlineDrivers->map(fn (Driver $driver) => $driver->user)->filter(),
            'ride.new_request',
            'New ride request',
            "Pickup at {$ride->pickup_address}. Open requests to send an offer.",
            '/driver',
        );

        return response()->json([
            'message' => 'Ride requested successfully.',
            'ride' => $this->formatRide($ride),
            'compliance' => $compliance,
        ], 201);
    }

    public function storeEmergency(
        Request $request,
        FareService $fareService,
        EmergencyDispatchService $emergencyDispatchService,
        NotificationService $notifications,
    ): JsonResponse {
        $data = $request->validate([
            'user_id' => ['required', 'integer', Rule::exists('users', 'id')->where('role', 'passenger')],
            'pickup_address' => ['required', 'string', 'max:255'],
            'pickup_lat' => ['required', 'numeric'],
            'pickup_lng' => ['required', 'numeric'],
            'dropoff_address' => ['nullable', 'string', 'max:255'],
            'dropoff_lat' => ['nullable', 'numeric'],
            'dropoff_lng' => ['nullable', 'numeric'],
        ]);

        $passenger = User::query()
            ->where('role', 'passenger')
            ->findOrFail($data['user_id']);

        $this->ensureActiveUser($passenger);

        $activeRide = Ride::query()
            ->where('passenger_id', $passenger->id)
            ->whereIn('status', ['requested', 'accepted', 'ongoing'])
            ->first();

        if ($activeRide) {
            return response()->json([
                'message' => 'You already have an active ride.',
                'ride' => $this->formatRide($activeRide->load('driver.user', 'driver.vehicle')),
            ], 409);
        }

        $pickupLat = (float) $data['pickup_lat'];
        $pickupLng = (float) $data['pickup_lng'];
        $dropoffAddress = trim($data['dropoff_address'] ?? '') ?: $data['pickup_address'];
        $dropoffLat = isset($data['dropoff_lat']) ? (float) $data['dropoff_lat'] : $pickupLat;
        $dropoffLng = isset($data['dropoff_lng']) ? (float) $data['dropoff_lng'] : $pickupLng;

        $candidates = $emergencyDispatchService->findAvailableDrivers(
            $pickupLat,
            $pickupLng,
            $dropoffLat,
            $dropoffLng,
        );

        if ($candidates->isEmpty()) {
            return response()->json([
                'message' => 'No available tricycle or e-tricycle drivers are online right now. Please try again or request a normal ride.',
            ], 503);
        }

        foreach ($candidates as $candidate) {
            try {
                $ride = DB::transaction(function () use (
                    $candidate,
                    $data,
                    $dropoffAddress,
                    $dropoffLat,
                    $dropoffLng,
                    $emergencyDispatchService,
                    $fareService,
                    $passenger,
                    $pickupLat,
                    $pickupLng,
                ) {
                    $driver = $candidate->newQuery()->whereKey($candidate->id)->lockForUpdate()->first();

                    if (! $driver || $emergencyDispatchService->driverHasActiveRide($driver->id)) {
                        throw new \RuntimeException('Driver is no longer available.');
                    }

                    $driver->loadMissing('vehicle');
                    $rideType = $emergencyDispatchService->normalizeVehicleRideType($driver->vehicle?->vehicle_type);
                    $fare = $this->calculateFare([
                        'pickup_lat' => $pickupLat,
                        'pickup_lng' => $pickupLng,
                        'dropoff_lat' => $dropoffLat,
                        'dropoff_lng' => $dropoffLng,
                    ], $fareService, $rideType);

                    $ride = Ride::create([
                        'passenger_id' => $passenger->id,
                        'driver_id' => $driver->id,
                        'pickup_lat' => $pickupLat,
                        'pickup_lng' => $pickupLng,
                        'dropoff_lat' => $dropoffLat,
                        'dropoff_lng' => $dropoffLng,
                        'pickup_address' => $data['pickup_address'],
                        'dropoff_address' => $dropoffAddress,
                        'ride_type' => $rideType,
                        'status' => 'accepted',
                        'is_emergency' => true,
                        'fare' => $fare,
                        'compliance_bypassed' => true,
                        'compliance_issues' => [[
                            'code' => 'emergency_bypass',
                            'message' => 'Emergency ride — road restrictions bypassed for dispatch.',
                            'severity' => 'info',
                        ]],
                        'accepted_at' => now(),
                    ]);

                    RideOffer::create([
                        'ride_id' => $ride->id,
                        'driver_id' => $driver->id,
                        'status' => 'accepted',
                    ]);

                    return $ride;
                });

                $ride->loadMissing('driver.user');
                if ($ride->driver?->user) {
                    $notifications->notify(
                        $ride->driver->user,
                        'ride.emergency_assigned',
                        'Emergency ride assigned',
                        "Emergency pickup at {$ride->pickup_address}. Head to the passenger now.",
                        '/driver',
                    );
                }

                return response()->json([
                    'message' => 'Emergency ride dispatched. A nearby driver has been assigned.',
                    'ride' => $this->formatRide(
                        $ride->load([
                            'driver.user:id,name',
                            'driver.vehicle:id,driver_id,vehicle_type,plate_number,color',
                        ]),
                    ),
                ], 201);
            } catch (\RuntimeException) {
                continue;
            } catch (\Throwable $exception) {
                report($exception);

                return response()->json([
                    'message' => 'Unable to dispatch emergency ride right now. Please try again.',
                ], 500);
            }
        }

        return response()->json([
            'message' => 'All nearby drivers became unavailable. Please try again in a moment.',
        ], 503);
    }

    public function status(Ride $ride): JsonResponse
    {
        $ride->load([
            'driver.user:id,name',
            'driver.vehicle:id,driver_id,vehicle_type,plate_number,color',
        ]);

        return response()->json([
            'ride' => $this->formatRide($ride),
        ]);
    }

    public function cancel(Request $request, Ride $ride, NotificationService $notifications): JsonResponse
    {
        $data = $request->validate([
            'user_id' => ['required', 'integer'],
            'cancellation_reason_code' => ['required', Rule::in(RideCancellationReasons::PASSENGER_CODES)],
            'cancellation_reason_detail' => ['nullable', 'string', 'max:255'],
        ]);

        if ((int) $ride->passenger_id !== (int) $data['user_id']) {
            return response()->json([
                'message' => 'This ride does not belong to the passenger.',
            ], 403);
        }

        $canCancel = $ride->status === 'requested'
            || ($ride->status === 'accepted' && $ride->is_emergency);

        if (! $canCancel) {
            return response()->json([
                'message' => 'Only requested rides can be cancelled by the passenger.',
            ], 422);
        }

        if ($data['cancellation_reason_code'] === 'other' && blank($data['cancellation_reason_detail'] ?? null)) {
            return response()->json([
                'message' => 'Please describe your cancellation reason.',
            ], 422);
        }

        $reasonMessage = RideCancellationReasons::resolveMessage(
            $data['cancellation_reason_code'],
            $data['cancellation_reason_detail'] ?? null,
        );

        $assignedDriver = $ride->driver()->with('user:id,name')->first();
        $ride->loadMissing(['passenger:id,name', 'offers.driver.user:id,name']);

        $ride->update([
            'status' => 'cancelled',
            'cancelled_by' => 'passenger',
            'cancellation_reason_code' => $data['cancellation_reason_code'],
            'cancellation_reason' => $reasonMessage,
        ]);
        $ride->offers()
            ->whereIn('status', ['pending', 'accepted'])
            ->update(['status' => 'cancelled']);

        $passengerName = $ride->passenger?->name ?? 'A passenger';
        $notificationBody = "{$passengerName} cancelled ride #{$ride->id}. Reason: {$reasonMessage}";

        $notifiedUserIds = [];

        if ($assignedDriver?->user) {
            $notifications->notify(
                $assignedDriver->user,
                'ride.cancelled',
                'Ride cancelled by passenger',
                $notificationBody,
                '/driver',
            );
            $notifiedUserIds[] = $assignedDriver->user->id;
        }

        foreach ($ride->offers as $offer) {
            $driverUser = $offer->driver?->user;

            if (! $driverUser || in_array($driverUser->id, $notifiedUserIds, true)) {
                continue;
            }

            $notifications->notify(
                $driverUser,
                'ride.cancelled',
                'Ride request cancelled',
                $notificationBody,
                '/driver',
            );
            $notifiedUserIds[] = $driverUser->id;
        }

        return response()->json([
            'message' => 'Ride cancelled successfully.',
            'ride' => $this->formatRide($ride->refresh()),
        ]);
    }

    public function rateDriver(Request $request, Ride $ride): JsonResponse
    {
        $data = $request->validate([
            'user_id' => ['required', 'integer'],
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'feedback' => ['nullable', 'string', 'max:1000'],
        ]);

        if ((int) $ride->passenger_id !== (int) $data['user_id']) {
            return response()->json([
                'message' => 'This ride does not belong to the passenger.',
            ], 403);
        }

        if ($ride->status !== 'completed') {
            return response()->json([
                'message' => 'Only completed rides can be rated.',
            ], 422);
        }

        if ($ride->passenger_rated) {
            return response()->json([
                'message' => 'You already submitted feedback for this ride.',
            ], 409);
        }

        $ride->update([
            'rating' => $data['rating'],
            'passenger_feedback' => $data['feedback'] ?? null,
            'passenger_rated' => true,
        ]);

        $message = $ride->is_emergency
            ? 'Thank you! Your emergency response feedback has been submitted.'
            : 'Thank you! Your driver feedback has been submitted.';

        return response()->json([
            'message' => $message,
            'ride' => $this->formatRide($ride->refresh()->load('driver.user', 'driver.vehicle')),
        ]);
    }

    public function clearPassengerHistory(Request $request): JsonResponse
    {
        $data = $request->validate([
            'user_id' => ['required', 'integer', Rule::exists('users', 'id')->where('role', 'passenger')],
            'action' => ['sometimes', 'string', Rule::in(['hide', 'unhide'])],
        ]);

        $hide = ($data['action'] ?? 'hide') !== 'unhide';

        Ride::query()
            ->where('passenger_id', $data['user_id'])
            ->whereIn('status', ['completed', 'cancelled'])
            ->update(['hidden_for_passenger' => $hide]);

        return response()->json([
            'message' => $hide
                ? 'Ride history hidden successfully.'
                : 'Ride history restored successfully.',
        ]);
    }

    /**
     * @param array<string, mixed> $data
     */
    private function calculateFare(array $data, FareService $fareService, string $rideType): float
    {
        if (
            ! isset($data['pickup_lat'], $data['pickup_lng'], $data['dropoff_lat'], $data['dropoff_lng'])
        ) {
            return $fareService->minimumFareForRideType($rideType);
        }

        $distanceKm = $fareService->distanceKm(
            (float) $data['pickup_lat'],
            (float) $data['pickup_lng'],
            (float) $data['dropoff_lat'],
            (float) $data['dropoff_lng'],
        );

        return $fareService->fareForDistance($distanceKm, $rideType);
    }

    private function normalizeRideType(?string $rideType): string
    {
        return RideTypes::normalize($rideType);
    }

    private function formatRide(Ride $ride): array
    {
        return [
            'id' => $ride->id,
            'pickup_address' => $ride->pickup_address,
            'dropoff_address' => $ride->dropoff_address,
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
            'vehicle_type' => $ride->driver?->vehicle?->vehicle_type,
            'plate_number' => $ride->driver?->vehicle?->plate_number,
            'vehicle_color' => $ride->driver?->vehicle?->color,
        ];
    }
}
