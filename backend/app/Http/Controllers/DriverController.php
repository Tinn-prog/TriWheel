<?php

namespace App\Http\Controllers;

use App\Models\Driver;
use App\Models\Ride;
use App\Models\RideOffer;
use App\Models\User;
use App\Services\FareService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DriverController extends Controller
{
    public function overview(Request $request): JsonResponse
    {
        $driver = $this->driverForUser((int) $request->query('user_id'));

        if (! $driver) {
            return response()->json([
                'message' => 'Driver profile not found.',
            ], 404);
        }

        $driver->load(['user:id,name,email,contact_number', 'vehicle']);
        $activeRide = $this->activeRideQuery($driver)->first();

        return response()->json([
            'driver' => $this->formatDriver($driver),
            'active_ride' => $activeRide ? $this->formatRide($activeRide) : null,
            'available_requests' => Ride::query()
                ->with([
                    'passenger:id,name,email,contact_number',
                    'offers' => fn ($query) => $query->where('driver_id', $driver->id),
                ])
                ->where('status', 'requested')
                ->oldest()
                ->limit(10)
                ->get()
                ->map(fn (Ride $ride): array => $this->formatRide($ride, $driver)),
            'ride_history' => Ride::query()
                ->with('passenger:id,name,email,contact_number')
                ->where('driver_id', $driver->id)
                ->where('hidden_for_driver', false)
                ->latest()
                ->limit(10)
                ->get()
                ->map(fn (Ride $ride): array => $this->formatRide($ride)),
        ]);
    }

    public function updateStatus(Request $request): JsonResponse
    {
        $data = $request->validate([
            'user_id' => ['required', 'integer', Rule::exists('users', 'id')->where('role', 'driver')],
            'status' => ['required', Rule::in(['online', 'offline'])],
        ]);

        $driver = $this->driverForUser((int) $data['user_id']);

        if (! $driver) {
            return response()->json(['message' => 'Driver profile not found.'], 404);
        }

        if ($driver->approval_status !== 'approved') {
            return response()->json([
                'message' => 'Your account must be approved by an admin before you can go online.',
            ], 422);
        }

        if ($data['status'] === 'online') {
            $driver->update([
                'status' => 'online',
                'queue_position' => null,
            ]);
        } else {
            $driver->update([
                'status' => 'offline',
                'queue_position' => null,
            ]);
        }

        return response()->json([
            'message' => 'Driver status updated successfully.',
            'driver' => $this->formatDriver($driver->refresh()->load(['user', 'vehicle'])),
        ]);
    }

    public function offerRide(Request $request, Ride $ride): JsonResponse
    {
        $data = $request->validate([
            'user_id' => ['required', 'integer'],
        ]);

        $driver = $this->driverForUser((int) $data['user_id']);

        if (! $driver) {
            return response()->json(['message' => 'Driver profile not found.'], 404);
        }

        if ($driver->approval_status !== 'approved') {
            return response()->json([
                'message' => 'Your driver profile must be approved before sending offers.',
            ], 422);
        }

        if ($driver->status !== 'online') {
            return response()->json([
                'message' => 'You must be online before sending ride offers.',
            ], 422);
        }

        if ($ride->status !== 'requested') {
            return response()->json([
                'message' => 'Only requested rides can receive driver offers.',
            ], 422);
        }

        if ($this->activeRideQuery($driver)->exists()) {
            return response()->json([
                'message' => 'Finish or cancel your current ride before accepting another request.',
            ], 409);
        }

        $existingOffer = RideOffer::query()
            ->where('ride_id', $ride->id)
            ->where('driver_id', $driver->id)
            ->first();

        if ($existingOffer) {
            return response()->json([
                'message' => 'You already sent an offer for this ride.',
                'offer' => $this->formatOffer($existingOffer->load('driver.user', 'driver.vehicle')),
            ], 409);
        }

        $offer = RideOffer::create([
            'ride_id' => $ride->id,
            'driver_id' => $driver->id,
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => 'Offer sent to passenger successfully.',
            'offer' => $this->formatOffer($offer->load('driver.user', 'driver.vehicle')),
        ], 201);
    }

    public function startRide(Request $request, Ride $ride): JsonResponse
    {
        $driver = $this->driverForUser((int) $request->input('user_id'));

        if (! $driver || $ride->driver_id !== $driver->id || $ride->status !== 'accepted') {
            return response()->json([
                'message' => 'Only accepted rides assigned to you can be started.',
            ], 422);
        }

        $ride->update([
            'status' => 'ongoing',
            'started_at' => now(),
        ]);

        return response()->json([
            'message' => 'Ride started successfully.',
            'ride' => $this->formatRide($ride->refresh()->load('passenger')),
        ]);
    }

    public function completeRide(Request $request, Ride $ride, FareService $fareService): JsonResponse
    {
        $driver = $this->driverForUser((int) $request->input('user_id'));

        if (! $driver || $ride->driver_id !== $driver->id || $ride->status !== 'ongoing') {
            return response()->json([
                'message' => 'Only ongoing rides assigned to you can be completed.',
            ], 422);
        }

        $fare = $ride->fare ? (float) $ride->fare : $this->fareForRide($ride, $fareService);
        $ride->update([
            'status' => 'completed',
            'fare' => $fare,
            'completed_at' => now(),
        ]);

        return response()->json([
            'message' => 'Ride completed successfully.',
            'ride' => $this->formatRide($ride->refresh()->load('passenger')),
        ]);
    }

    public function cancelRide(Request $request, Ride $ride): JsonResponse
    {
        $driver = $this->driverForUser((int) $request->input('user_id'));

        if (! $driver || $ride->driver_id !== $driver->id || ! in_array($ride->status, ['accepted', 'ongoing'], true)) {
            return response()->json([
                'message' => 'Only active rides assigned to you can be cancelled.',
            ], 422);
        }

        $ride->update(['status' => 'cancelled']);
        $ride->offers()
            ->whereIn('status', ['accepted', 'pending'])
            ->update(['status' => 'cancelled']);

        return response()->json([
            'message' => 'Ride cancelled successfully.',
            'ride' => $this->formatRide($ride->refresh()->load('passenger')),
        ]);
    }

    public function clearHistory(Request $request): JsonResponse
    {
        $driver = $this->driverForUser((int) $request->input('user_id'));

        if (! $driver) {
            return response()->json(['message' => 'Driver profile not found.'], 404);
        }

        Ride::query()
            ->where('driver_id', $driver->id)
            ->whereIn('status', ['completed', 'cancelled'])
            ->update(['hidden_for_driver' => true]);

        return response()->json(['message' => 'Ride history hidden successfully.']);
    }

    public function ratePassenger(Request $request, Ride $ride): JsonResponse
    {
        $data = $request->validate([
            'user_id' => ['required', 'integer'],
            'rating' => ['required', Rule::in(['good', 'satisfied', 'neutral', 'dissatisfied', 'very_dissatisfied'])],
            'feedback' => ['nullable', 'string', 'max:1000'],
        ]);

        $driver = $this->driverForUser((int) $data['user_id']);

        if (! $driver || (int) $ride->driver_id !== (int) $driver->id) {
            return response()->json([
                'message' => 'This ride is not assigned to this driver.',
            ], 403);
        }

        if ($ride->status !== 'completed') {
            return response()->json([
                'message' => 'Only completed rides can be rated.',
            ], 422);
        }

        if ($ride->driver_rated) {
            return response()->json([
                'message' => 'You already submitted feedback for this passenger.',
            ], 409);
        }

        $ride->update([
            'driver_rating' => $data['rating'],
            'driver_feedback' => $data['feedback'] ?? null,
            'driver_rated' => true,
        ]);

        return response()->json([
            'message' => 'Thank you! Your passenger feedback has been submitted.',
            'ride' => $this->formatRide($ride->refresh()->load('passenger')),
        ]);
    }

    private function driverForUser(int $userId): ?Driver
    {
        if ($userId <= 0) {
            return null;
        }

        return Driver::query()
            ->where('user_id', $userId)
            ->first();
    }

    private function activeRideQuery(Driver $driver)
    {
        return Ride::query()
            ->with('passenger:id,name,email,contact_number')
            ->where('driver_id', $driver->id)
            ->whereIn('status', ['accepted', 'ongoing'])
            ->latest();
    }

    private function fareForRide(Ride $ride, FareService $fareService): float
    {
        if (! $ride->pickup_lat || ! $ride->pickup_lng || ! $ride->dropoff_lat || ! $ride->dropoff_lng) {
            return $fareService->minimumFareForRideType($ride->ride_type);
        }

        return $fareService->fareForDistance($fareService->distanceKm(
            (float) $ride->pickup_lat,
            (float) $ride->pickup_lng,
            (float) $ride->dropoff_lat,
            (float) $ride->dropoff_lng,
        ), $ride->ride_type);
    }

    private function formatDriver(Driver $driver): array
    {
        return [
            'id' => $driver->id,
            'name' => $driver->user?->name,
            'email' => $driver->user?->email,
            'phone' => $driver->phone,
            'status' => $driver->status,
            'approval_status' => $driver->approval_status,
            'queue_position' => null,
            'license_number' => $driver->license_number,
            'vehicle_type' => $driver->vehicle?->vehicle_type,
            'plate_number' => $driver->vehicle?->plate_number,
            'vehicle_color' => $driver->vehicle?->color,
        ];
    }

    private function formatRide(Ride $ride, ?Driver $currentDriver = null): array
    {
        $currentDriverOffer = $currentDriver
            ? $ride->offers->firstWhere('driver_id', $currentDriver->id)
            : null;

        return [
            'id' => $ride->id,
            'passenger_name' => $ride->passenger?->name,
            'passenger_phone' => $ride->passenger?->contact_number,
            'pickup_address' => $ride->pickup_address,
            'dropoff_address' => $ride->dropoff_address,
            'pickup_lat' => $ride->pickup_lat ? (float) $ride->pickup_lat : null,
            'pickup_lng' => $ride->pickup_lng ? (float) $ride->pickup_lng : null,
            'dropoff_lat' => $ride->dropoff_lat ? (float) $ride->dropoff_lat : null,
            'dropoff_lng' => $ride->dropoff_lng ? (float) $ride->dropoff_lng : null,
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
            'accepted_at' => $ride->accepted_at,
            'started_at' => $ride->started_at,
            'completed_at' => $ride->completed_at,
            'driver_offer_status' => $currentDriverOffer?->status,
        ];
    }

    private function formatOffer(RideOffer $offer): array
    {
        return [
            'id' => $offer->id,
            'status' => $offer->status,
            'driver_id' => $offer->driver_id,
            'driver_name' => $offer->driver?->user?->name,
            'driver_phone' => $offer->driver?->phone,
            'driver_status' => $offer->driver?->status,
            'vehicle_type' => $offer->driver?->vehicle?->vehicle_type,
            'plate_number' => $offer->driver?->vehicle?->plate_number,
            'vehicle_color' => $offer->driver?->vehicle?->color,
            'created_at' => $offer->created_at,
        ];
    }
}
