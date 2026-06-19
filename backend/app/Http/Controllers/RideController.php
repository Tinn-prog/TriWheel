<?php

namespace App\Http\Controllers;

use App\Models\Ride;
use App\Models\User;
use App\Services\FareService;
use App\Services\RideMatchingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class RideController extends Controller
{
    public function store(
        Request $request,
        FareService $fareService,
        RideMatchingService $rideMatchingService,
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
        ]);

        return response()->json([
            'message' => 'Ride requested successfully.',
            'ride' => $this->formatRide($ride),
        ], 201);
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

    public function cancel(Request $request, Ride $ride): JsonResponse
    {
        $data = $request->validate([
            'user_id' => ['required', 'integer'],
        ]);

        if ((int) $ride->passenger_id !== (int) $data['user_id']) {
            return response()->json([
                'message' => 'This ride does not belong to the passenger.',
            ], 403);
        }

        if ($ride->status !== 'requested') {
            return response()->json([
                'message' => 'Only requested rides can be cancelled by the passenger.',
            ], 422);
        }

        $ride->update(['status' => 'cancelled']);
        $ride->offers()
            ->where('status', 'pending')
            ->update(['status' => 'cancelled']);

        return response()->json([
            'message' => 'Ride cancelled successfully.',
            'ride' => $this->formatRide($ride->refresh()),
        ]);
    }

    public function rateDriver(Request $request, Ride $ride): JsonResponse
    {
        $data = $request->validate([
            'user_id' => ['required', 'integer'],
            'rating' => ['required', Rule::in(['good', 'satisfied', 'neutral', 'dissatisfied', 'very_dissatisfied'])],
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

        return response()->json([
            'message' => 'Thank you! Your driver feedback has been submitted.',
            'ride' => $this->formatRide($ride->refresh()->load('driver.user', 'driver.vehicle')),
        ]);
    }

    public function clearPassengerHistory(Request $request): JsonResponse
    {
        $data = $request->validate([
            'user_id' => ['required', 'integer', Rule::exists('users', 'id')->where('role', 'passenger')],
        ]);

        Ride::query()
            ->where('passenger_id', $data['user_id'])
            ->whereIn('status', ['completed', 'cancelled'])
            ->update(['hidden_for_passenger' => true]);

        return response()->json([
            'message' => 'Ride history hidden successfully.',
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
        $normalized = strtolower((string) preg_replace('/[^a-z0-9_-]+/i', '', $rideType ?? ''));

        return match ($normalized) {
            'tricycle' => 'tricycle',
            'pedicab', 'motorcycle' => 'pedicab',
            'etricycle', 'e-tricycle', 'etrike', 'car' => 'e-tricycle',
            default => 'tricycle',
        };
    }

    private function formatRide(Ride $ride): array
    {
        return [
            'id' => $ride->id,
            'pickup_address' => $ride->pickup_address,
            'dropoff_address' => $ride->dropoff_address,
            'ride_type' => $ride->ride_type,
            'status' => $ride->status,
            'fare' => $ride->fare ? (float) $ride->fare : null,
            'rating' => $ride->rating,
            'passenger_feedback' => $ride->passenger_feedback,
            'passenger_rated' => (bool) $ride->passenger_rated,
            'driver_rating' => $ride->driver_rating,
            'driver_feedback' => $ride->driver_feedback,
            'driver_rated' => (bool) $ride->driver_rated,
            'created_at' => $ride->created_at,
            'driver_name' => $ride->driver?->user?->name,
            'driver_phone' => $ride->driver?->phone,
            'vehicle_type' => $ride->driver?->vehicle?->vehicle_type,
            'plate_number' => $ride->driver?->vehicle?->plate_number,
            'vehicle_color' => $ride->driver?->vehicle?->color,
        ];
    }
}
