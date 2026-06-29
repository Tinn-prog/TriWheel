<?php

namespace App\Http\Controllers;

use App\Models\Driver;
use App\Models\Ride;
use App\Models\RideOffer;
use App\Models\User;
use App\Models\Vehicle;
use App\Services\DriverSuspensionService;
use App\Services\FareService;
use App\Services\NotificationService;
use App\Services\RoadRestrictionService;
use App\Support\RideCancellationReasons;
use App\Support\RideReportReasons;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Controllers\Concerns\BlocksSuspendedUsers;
use Illuminate\Validation\Rule;

class DriverController extends Controller
{
    use BlocksSuspendedUsers;

    public function __construct(
        private readonly DriverSuspensionService $driverSuspensions,
    ) {}

    public function overview(Request $request): JsonResponse
    {
        $driver = $this->driverForUser((int) $request->query('user_id'));

        if (! $driver) {
            return response()->json([
                'message' => 'Driver profile not found.',
            ], 404);
        }

        $driver->load(['user', 'vehicle']);
        $suspension = $driver->user
            ? $this->driverSuspensions->suspensionState($driver->user)
            : null;

        if ($suspension) {
            return response()->json([
                'driver' => $this->formatDriver($driver),
                'suspension' => $suspension,
                'stats' => [
                    'total_rides' => Ride::where('driver_id', $driver->id)->count(),
                    'completed' => Ride::where('driver_id', $driver->id)->where('status', 'completed')->count(),
                    'cancelled' => Ride::where('driver_id', $driver->id)->where('status', 'cancelled')->count(),
                    'active' => 0,
                ],
                'active_ride' => null,
                'available_requests' => [],
                'ride_history' => [],
            ]);
        }

        $activeRide = $this->activeRideQuery($driver)->first();
        $completedCount = Ride::where('driver_id', $driver->id)
            ->where('status', 'completed')
            ->count();
        $cancelledCount = Ride::where('driver_id', $driver->id)
            ->where('status', 'cancelled')
            ->count();

        return response()->json([
            'driver' => $this->formatDriver($driver),
            'stats' => [
                'total_rides' => Ride::where('driver_id', $driver->id)->count(),
                'completed' => $completedCount,
                'cancelled' => $cancelledCount,
                'active' => $activeRide ? 1 : 0,
            ],
            'active_ride' => $activeRide ? $this->formatRide($activeRide, $driver) : null,
            'available_requests' => Ride::query()
                ->with([
                    'passenger:id,name,email,contact_number',
                    'offers' => fn ($query) => $query->where('driver_id', $driver->id),
                ])
                ->where('status', 'requested')
                ->whereDoesntHave(
                    'offers',
                    fn ($query) => $query
                        ->where('driver_id', $driver->id)
                        ->where('status', 'cancelled'),
                )
                ->oldest()
                ->limit(10)
                ->get()
                ->filter(fn (Ride $ride): bool => app(RoadRestrictionService::class)->driverCanServeRide($driver, $ride))
                ->values()
                ->map(fn (Ride $ride): array => $this->formatRide($ride, $driver)),
            'ride_history' => Ride::query()
                ->with('passenger:id,name,email,contact_number')
                ->where('driver_id', $driver->id)
                ->where('hidden_for_driver', false)
                ->latest()
                ->limit(10)
                ->get()
                ->map(fn (Ride $ride): array => $this->formatRide($ride, $driver)),
            'hidden_history_count' => Ride::query()
                ->where('driver_id', $driver->id)
                ->where('hidden_for_driver', true)
                ->whereIn('status', ['completed', 'cancelled'])
                ->count(),
        ]);
    }

    public function submitSuspensionAppeal(Request $request, NotificationService $notifications): JsonResponse
    {
        $data = $request->validate([
            'user_id' => ['required', 'integer', Rule::exists('users', 'id')->where('role', 'driver')],
            'message' => ['required', 'string', 'min:20', 'max:2000'],
        ]);

        $driver = $this->driverForUser((int) $data['user_id']);

        if (! $driver?->user) {
            return response()->json(['message' => 'Driver profile not found.'], 404);
        }

        $user = $driver->user;

        if (! $this->driverSuspensions->canSubmitAppeal($user)) {
            return response()->json([
                'message' => $user->suspension_requires_office_visit
                    ? 'The 48-hour appeal window has closed. Visit the TriWheel office in person to resolve your account.'
                    : 'You cannot submit an appeal right now.',
            ], 422);
        }

        $user->update([
            'suspension_appeal_message' => trim($data['message']),
            'suspension_appeal_submitted_at' => now(),
        ]);

        $driverName = $user->name ?? 'A driver';

        $admins = User::query()
            ->where('role', 'admin')
            ->where('is_suspended', false)
            ->get();

        $this->notifications->notifyMany(
            $admins,
            'driver.suspension_appeal',
            'Driver suspension appeal',
            "{$driverName} submitted an appeal: ".str($user->suspension_appeal_message)->limit(160),
            '/admin/drivers',
        );

        return response()->json([
            'message' => 'Appeal submitted successfully. An admin will review your case.',
            'suspension' => $this->driverSuspensions->suspensionState($user->refresh()),
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

        if ($response = $this->blockedBySuspension($driver)) {
            return $response;
        }

        if ($driver->approval_status !== 'approved') {
            return response()->json([
                'message' => 'Your account must be approved by an admin before you can go online.',
            ], 422);
        }

        if ($data['status'] === 'offline') {
            $hasActiveRide = $this->activeRideQuery($driver)->exists();

            if ($hasActiveRide) {
                return response()->json([
                    'message' => 'Complete or cancel your active ride before going offline.',
                ], 422);
            }
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
                'current_lat' => null,
                'current_lng' => null,
                'location_updated_at' => null,
            ]);
        }

        return response()->json([
            'message' => 'Driver status updated successfully.',
            'driver' => $this->formatDriver($driver->refresh()->load(['user', 'vehicle'])),
        ]);
    }

    public function updateAutoAccept(Request $request): JsonResponse
    {
        $data = $request->validate([
            'auto_accept' => ['required', 'boolean'],
            'user_id' => ['required', 'integer', Rule::exists('users', 'id')->where('role', 'driver')],
        ]);

        $driver = $this->driverForUser((int) $data['user_id']);

        if (! $driver) {
            return response()->json(['message' => 'Driver profile not found.'], 404);
        }

        if ($response = $this->blockedBySuspension($driver)) {
            return $response;
        }

        if ($driver->approval_status !== 'approved') {
            return response()->json([
                'message' => 'Your driver profile must be approved before changing auto-accept.',
            ], 422);
        }

        $driver->update([
            'auto_accept' => $data['auto_accept'],
        ]);

        return response()->json([
            'auto_accept' => (bool) $driver->auto_accept,
            'driver' => $this->formatDriver($driver->refresh()->load(['user', 'vehicle'])),
            'message' => $data['auto_accept']
                ? 'Auto-accept enabled. New ride requests will receive your offer automatically while you are online.'
                : 'Auto-accept disabled. You will send offers manually again.',
        ]);
    }

    public function updateLocation(Request $request): JsonResponse
    {
        $data = $request->validate([
            'user_id' => ['required', 'integer', Rule::exists('users', 'id')->where('role', 'driver')],
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
        ]);

        $driver = $this->driverForUser((int) $data['user_id']);

        if (! $driver) {
            return response()->json(['message' => 'Driver profile not found.'], 404);
        }

        if ($response = $this->blockedBySuspension($driver)) {
            return $response;
        }

        if ($driver->status !== 'online') {
            $hasActiveTrip = $driver->rides()
                ->whereIn('status', ['accepted', 'ongoing'])
                ->exists();

            if (! $hasActiveTrip) {
                return response()->json([
                    'message' => 'Go online before sharing your live location.',
                ], 422);
            }
        }

        $driver->update([
            'current_lat' => $data['lat'],
            'current_lng' => $data['lng'],
            'location_updated_at' => now(),
        ]);

        return response()->json([
            'message' => 'Driver location updated.',
        ]);
    }

    public function updateVehicle(Request $request): JsonResponse
    {
        $data = $request->validate([
            'user_id' => ['required', 'integer', Rule::exists('users', 'id')->where('role', 'driver')],
            'vehicle_type' => ['required', Rule::in(['tricycle', 'pedicab', 'e-tricycle'])],
            'plate_number' => ['required', 'string', 'max:50'],
            'body_number' => ['nullable', 'string', 'max:50'],
            'color' => ['required', 'string', 'max:50'],
            'registration_expiry_date' => ['nullable', 'date'],
        ]);

        $driver = $this->driverForUser((int) $data['user_id']);

        if (! $driver) {
            return response()->json(['message' => 'Driver profile not found.'], 404);
        }

        if ($response = $this->blockedBySuspension($driver)) {
            return $response;
        }

        $vehicle = $driver->vehicle;

        if (! $vehicle) {
            $vehicle = $driver->vehicle()->create([
                'vehicle_type' => $data['vehicle_type'],
                'plate_number' => $data['plate_number'],
                'body_number' => $data['body_number'] ?? null,
                'color' => $data['color'],
                'registration_expiry_date' => $data['registration_expiry_date'] ?? null,
            ]);
        } else {
            $vehicle->update([
                'vehicle_type' => $data['vehicle_type'],
                'plate_number' => $data['plate_number'],
                'body_number' => $data['body_number'] ?? null,
                'color' => $data['color'],
                'registration_expiry_date' => $data['registration_expiry_date'] ?? null,
            ]);
        }

        return response()->json([
            'driver' => $this->formatDriver($driver->refresh()->load(['user', 'vehicle'])),
            'message' => 'Vehicle information updated.',
        ]);
    }

    public function offerRide(Request $request, Ride $ride, NotificationService $notifications): JsonResponse
    {
        $data = $request->validate([
            'user_id' => ['required', 'integer'],
        ]);

        $driver = $this->driverForUser((int) $data['user_id']);

        if (! $driver) {
            return response()->json(['message' => 'Driver profile not found.'], 404);
        }

        if ($response = $this->blockedBySuspension($driver)) {
            return $response;
        }

        if (! app(RoadRestrictionService::class)->driverCanServeRide($driver->loadMissing('vehicle'), $ride)) {
            return response()->json([
                'message' => 'This ride is outside your assigned service zone or uses restricted roads for your vehicle.',
            ], 422);
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

        if (RideOffer::driverWithdrewFromRide($driver->id, $ride->id)) {
            return response()->json([
                'message' => 'You cannot send an offer for a ride you previously cancelled.',
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

        if ($existingOffer?->status === 'pending') {
            return response()->json([
                'message' => 'You already sent an offer for this ride.',
                'offer' => $this->formatOffer($existingOffer->load('driver.user', 'driver.vehicle')),
            ], 409);
        }

        if ($existingOffer && in_array($existingOffer->status, ['rejected', 'accepted'], true)) {
            $existingOffer->update(['status' => 'pending']);
            $offer = $existingOffer->fresh();
        } else {
            $offer = RideOffer::create([
                'ride_id' => $ride->id,
                'driver_id' => $driver->id,
                'status' => 'pending',
            ]);
        }

        $ride->loadMissing('passenger:id,name');
        if ($ride->passenger) {
            $driverName = $driver->user?->name ?? 'A driver';
            $notifications->notify(
                $ride->passenger,
                'ride.offer_received',
                'New driver offer',
                "{$driverName} sent an offer for your ride request.",
                '/passenger#active-ride',
            );
        }

        return response()->json([
            'message' => 'Offer sent to passenger successfully.',
            'offer' => $this->formatOffer($offer->load('driver.user', 'driver.vehicle')),
        ], 201);
    }

    public function startRide(Request $request, Ride $ride, NotificationService $notifications): JsonResponse
    {
        $driver = $this->driverForUser((int) $request->input('user_id'));

        if (! $driver) {
            return response()->json(['message' => 'Driver profile not found.'], 404);
        }

        if ($response = $this->blockedBySuspension($driver)) {
            return $response;
        }

        if ($ride->driver_id !== $driver->id || $ride->status !== 'accepted') {
            return response()->json([
                'message' => 'Only accepted rides assigned to you can be started.',
            ], 422);
        }

        $ride->update([
            'status' => 'ongoing',
            'started_at' => now(),
        ]);

        $ride->loadMissing('passenger:id');
        if ($ride->passenger) {
            $notifications->notify(
                $ride->passenger,
                'ride.started',
                'Ride started',
                'Your driver has started the trip.',
                '/passenger#active-ride',
            );
        }

        return response()->json([
            'message' => 'Ride started successfully.',
            'ride' => $this->formatRide($ride->refresh()->load('passenger'), $driver),
        ]);
    }

    public function completeRide(Request $request, Ride $ride, FareService $fareService, NotificationService $notifications): JsonResponse
    {
        $driver = $this->driverForUser((int) $request->input('user_id'));

        if (! $driver) {
            return response()->json(['message' => 'Driver profile not found.'], 404);
        }

        if ($response = $this->blockedBySuspension($driver)) {
            return $response;
        }

        if ($ride->driver_id !== $driver->id || $ride->status !== 'ongoing') {
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

        $ride->loadMissing('passenger:id');
        if ($ride->passenger) {
            $notifications->notify(
                $ride->passenger,
                'ride.completed',
                'Ride completed',
                'Your trip has been completed. You can rate your driver from the dashboard.',
                '/passenger/history',
            );
        }

        return response()->json([
            'message' => 'Ride completed successfully.',
            'ride' => $this->formatRide($ride->refresh()->load('passenger'), $driver),
        ]);
    }

    public function cancelRide(
        Request $request,
        Ride $ride,
        NotificationService $notifications,
        RoadRestrictionService $roadRestrictions,
    ): JsonResponse {
        $data = $request->validate([
            'user_id' => ['required', 'integer'],
            'cancellation_reason_code' => ['required', Rule::in(RideCancellationReasons::DRIVER_CODES)],
            'cancellation_reason_detail' => ['nullable', 'string', 'max:255'],
        ]);

        $driver = $this->driverForUser((int) $data['user_id']);

        if (! $driver) {
            return response()->json(['message' => 'Driver profile not found.'], 404);
        }

        if ($response = $this->blockedBySuspension($driver)) {
            return $response;
        }

        if ($ride->driver_id !== $driver->id || ! in_array($ride->status, ['accepted', 'ongoing'], true)) {
            return response()->json([
                'message' => 'Only active rides assigned to you can be cancelled.',
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
            'driver',
        );

        $driver->loadMissing('user:id,name');

        $ride->update([
            'status' => 'requested',
            'driver_id' => null,
            'accepted_at' => null,
            'started_at' => null,
            'cancelled_by' => 'driver',
            'cancellation_reason_code' => $data['cancellation_reason_code'],
            'cancellation_reason' => $reasonMessage,
        ]);

        $ride->offers()
            ->where('driver_id', $driver->id)
            ->update(['status' => 'cancelled']);

        $ride->offers()
            ->where('status', 'rejected')
            ->update(['status' => 'pending']);

        $ride->loadMissing('passenger:id,name');
        if ($ride->passenger) {
            $driverName = $driver->user?->name ?? 'Your driver';
            $notifications->notify(
                $ride->passenger,
                'ride.driver_withdrew',
                'Finding another driver',
                "{$driverName} cancelled ride #{$ride->id}. Reason: {$reasonMessage} We are looking for another driver.",
                '/passenger',
            );
        }

        $onlineDrivers = Driver::query()
            ->where('status', 'online')
            ->where('approval_status', 'approved')
            ->where('id', '!=', $driver->id)
            ->with(['user:id', 'vehicle'])
            ->get()
            ->filter(fn (Driver $candidate): bool => $roadRestrictions->driverCanServeRide($candidate, $ride));

        $notifications->notifyMany(
            $onlineDrivers->map(fn (Driver $candidate) => $candidate->user)->filter(),
            'ride.new_request',
            'Ride available again',
            "Pickup at {$ride->pickup_address}. A previous driver cancelled — send an offer if you are available.",
            '/driver/requests',
        );

        return response()->json([
            'message' => 'Ride cancelled. The passenger is being matched with another driver.',
            'ride' => $this->formatRide($ride->refresh()->load('passenger'), $driver),
        ]);
    }

    public function clearHistory(Request $request): JsonResponse
    {
        $data = $request->validate([
            'user_id' => ['required', 'integer'],
            'action' => ['sometimes', 'string', Rule::in(['hide', 'unhide'])],
        ]);

        $driver = $this->driverForUser((int) $data['user_id']);

        if (! $driver) {
            return response()->json(['message' => 'Driver profile not found.'], 404);
        }

        if ($response = $this->blockedBySuspension($driver)) {
            return $response;
        }

        $hide = ($data['action'] ?? 'hide') !== 'unhide';

        Ride::query()
            ->where('driver_id', $driver->id)
            ->whereIn('status', ['completed', 'cancelled'])
            ->update(['hidden_for_driver' => $hide]);

        return response()->json([
            'message' => $hide
                ? 'Ride history hidden successfully.'
                : 'Ride history restored successfully.',
        ]);
    }

    public function ratePassenger(Request $request, Ride $ride): JsonResponse
    {
        $data = $request->validate([
            'user_id' => ['required', 'integer'],
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'feedback' => ['nullable', 'string', 'max:1000'],
        ]);

        $driver = $this->driverForUser((int) $data['user_id']);

        if (! $driver) {
            return response()->json(['message' => 'Driver profile not found.'], 404);
        }

        if ($response = $this->blockedBySuspension($driver)) {
            return $response;
        }

        if ((int) $ride->driver_id !== (int) $driver->id) {
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

        $message = $ride->is_emergency
            ? 'Thank you! Your emergency trip feedback has been submitted.'
            : 'Thank you! Your passenger feedback has been submitted.';

        return response()->json([
            'message' => $message,
            'ride' => $this->formatRide($ride->refresh()->load('passenger'), $driver),
        ]);
    }

    private function driverForUser(int $userId): ?Driver
    {
        if ($userId <= 0) {
            return null;
        }

        return Driver::query()
            ->where('user_id', $userId)
            ->with('user')
            ->first();
    }

    private function blockedBySuspension(Driver $driver): ?JsonResponse
    {
        $driver->loadMissing('user');

        if (! $driver->user?->is_suspended) {
            return null;
        }

        return response()->json([
            'message' => 'Your account is suspended. You can only submit an appeal from your dashboard.',
        ], 403);
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
            'auto_accept' => (bool) $driver->auto_accept,
            'queue_position' => null,
            'license_number' => $driver->license_number,
            'license_expiry_date' => $driver->license_expiry_date?->toDateString(),
            'toda_id_number' => $driver->toda_id_number,
            'toda_association' => $driver->toda_association,
            'lgu' => $driver->lgu,
            'mtop_number' => $driver->mtop_number,
            'service_zone_id' => $driver->service_zone_id,
            'vehicle_type' => $driver->vehicle?->vehicle_type,
            'plate_number' => $driver->vehicle?->plate_number,
            'vehicle_color' => $driver->vehicle?->color,
            'vehicle' => $driver->vehicle ? $this->formatVehicle($driver->vehicle) : null,
        ];
    }

    private function formatVehicle(Vehicle $vehicle): array
    {
        return [
            'body_number' => $vehicle->body_number,
            'color' => $vehicle->color,
            'has_orcr_file' => filled($vehicle->orcr_file),
            'has_vehicle_photo' => filled($vehicle->vehicle_photo),
            'plate_number' => $vehicle->plate_number,
            'registration_expiry_date' => $vehicle->registration_expiry_date?->toDateString(),
            'vehicle_type' => $vehicle->vehicle_type,
        ];
    }

    private function formatRide(Ride $ride, ?Driver $currentDriver = null): array
    {
        if ($currentDriver) {
            $currentDriver->loadMissing('user');
        }

        $currentDriverOffer = null;

        if ($currentDriver) {
            $currentDriverOffer = $ride->relationLoaded('offers')
                ? $ride->offers->firstWhere('driver_id', $currentDriver->id)
                : $ride->offers()->where('driver_id', $currentDriver->id)->first();
        }

        $reportFlags = $currentDriver?->user
            ? RideReportReasons::viewerFlags($ride, $currentDriver->user, $currentDriver)
            : ['can_report' => false, 'report_submitted' => false];

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
            'is_emergency' => (bool) $ride->is_emergency,
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
            'cancelled_by' => $ride->cancelled_by,
            'cancellation_reason_code' => $ride->cancellation_reason_code,
            'cancellation_reason' => $ride->cancellation_reason,
            'driver_offer_status' => $this->driverOfferStatusForRide($currentDriverOffer, $ride),
            'can_report' => $reportFlags['can_report'],
            'report_submitted' => $reportFlags['report_submitted'],
        ];
    }

    private function driverOfferStatusForRide(?RideOffer $offer, Ride $ride): ?string
    {
        if (! $offer) {
            return null;
        }

        if ($ride->status === 'requested') {
            return $offer->status === 'pending' ? 'pending' : null;
        }

        return $offer->status;
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
