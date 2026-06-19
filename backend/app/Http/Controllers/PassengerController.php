<?php

namespace App\Http\Controllers;

use App\Models\Ride;
use App\Models\RideOffer;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PassengerController extends Controller
{
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

        $activeRide = Ride::query()
            ->with([
                'driver.user:id,name',
                'driver.vehicle:id,driver_id,vehicle_type,plate_number,color',
                'offers' => fn ($query) => $query
                    ->where('status', 'pending')
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
            'active_ride' => $this->formatRide($activeRide),
            'ride_history' => $rideHistory->map(fn (Ride $ride): ?array => $this->formatRide($ride)),
        ]);
    }

    public function chooseOffer(Request $request, RideOffer $offer): JsonResponse
    {
        $data = $request->validate([
            'user_id' => ['required', 'integer'],
        ]);

        $offer->load([
            'ride',
            'driver.user:id,name,email,contact_number',
            'driver.vehicle:id,driver_id,vehicle_type,plate_number,color',
        ]);

        if ((int) $offer->ride->passenger_id !== (int) $data['user_id']) {
            return response()->json([
                'message' => 'This offer does not belong to the passenger ride.',
            ], 403);
        }

        if ($offer->ride->status !== 'requested' || $offer->status !== 'pending') {
            return response()->json([
                'message' => 'Only pending offers for requested rides can be chosen.',
            ], 422);
        }

        return DB::transaction(function () use ($offer): JsonResponse {
            $offer->ride->update([
                'driver_id' => $offer->driver_id,
                'status' => 'accepted',
                'accepted_at' => now(),
            ]);

            RideOffer::query()
                ->where('ride_id', $offer->ride_id)
                ->whereKeyNot($offer->id)
                ->where('status', 'pending')
                ->update(['status' => 'rejected']);

            $offer->update(['status' => 'accepted']);

            return response()->json([
                'message' => 'Driver selected successfully.',
                'ride' => $this->formatRide(
                    $offer->ride
                        ->refresh()
                        ->load([
                            'driver.user:id,name',
                            'driver.vehicle:id,driver_id,vehicle_type,plate_number,color',
                        ]),
                ),
            ]);
        });
    }

    private function formatRide(?Ride $ride): ?array
    {
        if (! $ride) {
            return null;
        }

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
            'offers' => $ride->relationLoaded('offers')
                ? $ride->offers->map(fn (RideOffer $offer): array => $this->formatOffer($offer))->values()
                : [],
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
