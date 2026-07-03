<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesAdminUser;
use App\Models\Driver;
use App\Models\PlatformSetting;
use App\Models\Ride;
use App\Models\User;
use App\Services\AdminAuditService;
use App\Services\DriverSuspensionService;
use App\Services\NotificationService;
use App\Support\DocumentUrl;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\Rule;

class AdminController extends Controller
{
    use ResolvesAdminUser;

    public function __construct(
        private readonly AdminAuditService $audit,
        private readonly NotificationService $notifications,
        private readonly DriverSuspensionService $driverSuspensions,
    ) {}

    public function overview(Request $request): JsonResponse
    {
        $this->requireAdmin($request);

        $roleCounts = User::query()
            ->selectRaw('role, COUNT(*) as total')
            ->groupBy('role')
            ->pluck('total', 'role');

        $driverStatusCounts = Driver::query()
            ->selectRaw('approval_status, COUNT(*) as total')
            ->groupBy('approval_status')
            ->pluck('total', 'approval_status');

        $rideStatusCounts = Ride::query()
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $onlineStatusCount = Driver::where('status', 'online')->count();
        $onlineWithLiveGpsCount = Driver::query()->onlineWithLiveGps()->count();

        return response()->json([
            'stats' => [
                'users' => [
                    'total' => User::count(),
                    'admins' => (int) ($roleCounts['admin'] ?? 0),
                    'drivers' => (int) ($roleCounts['driver'] ?? 0),
                    'passengers' => (int) ($roleCounts['passenger'] ?? 0),
                ],
                'drivers' => [
                    'total' => Driver::count(),
                    'approved' => (int) ($driverStatusCounts['approved'] ?? 0),
                    'pending' => (int) ($driverStatusCounts['pending'] ?? 0),
                    'rejected' => (int) ($driverStatusCounts['rejected'] ?? 0),
                    'online' => $onlineStatusCount,
                    'online_with_gps' => $onlineWithLiveGpsCount,
                    'online_without_live_gps' => max(0, $onlineStatusCount - $onlineWithLiveGpsCount),
                    'offline' => Driver::where('status', 'offline')->count(),
                    'live_gps_fresh_minutes' => Driver::LIVE_GPS_FRESH_MINUTES,
                ],
                'rides' => [
                    'total' => Ride::count(),
                    'requested' => (int) ($rideStatusCounts['requested'] ?? 0),
                    'ongoing' => (int) ($rideStatusCounts['ongoing'] ?? 0),
                    'completed' => (int) ($rideStatusCounts['completed'] ?? 0),
                    'cancelled' => (int) ($rideStatusCounts['cancelled'] ?? 0),
                    'revenue' => (float) Ride::where('status', 'completed')->sum('fare'),
                ],
            ],
            'recent_users' => User::query()
                ->latest()
                ->limit(6)
                ->get(['id', 'name', 'email', 'contact_number', 'role', 'created_at']),
            'drivers' => Driver::query()
                ->with(['user:id,name,email,contact_number', 'vehicle:id,driver_id,vehicle_type,plate_number,color'])
                ->latest()
                ->limit(8)
                ->get()
                ->map(fn (Driver $driver): array => [
                    'id' => $driver->id,
                    'name' => $driver->user?->name,
                    'email' => $driver->user?->email,
                    'contact_number' => $driver->user?->contact_number,
                    'license_number' => $driver->license_number,
                    'approval_status' => $driver->approval_status,
                    'status' => $driver->status,
                    'vehicle_type' => $driver->vehicle?->vehicle_type,
                    'plate_number' => $driver->vehicle?->plate_number,
                    'color' => $driver->vehicle?->color,
                ]),
        ]);
    }

    public function users(Request $request): JsonResponse
    {
        $this->requireAdmin($request);

        return response()->json([
            'users' => User::query()
                ->select(['id', 'name', 'email', 'contact_number', 'role', 'admin_role', 'is_verified', 'is_suspended', 'suspension_reason', 'created_at'])
                ->when($request->filled('search'), function ($query) use ($request): void {
                    $term = '%'.$request->string('search').'%';
                    $query->where(function ($inner) use ($term): void {
                        $inner->where('name', 'like', $term)
                            ->orWhere('email', 'like', $term)
                            ->orWhere('contact_number', 'like', $term);
                    });
                })
                ->when($request->filled('role'), fn ($query) => $query->where('role', $request->string('role')))
                ->when($request->filled('admin_role'), fn ($query) => $query->where('admin_role', $request->string('admin_role')))
                ->when($request->has('suspended'), fn ($query) => $query->where('is_suspended', $request->boolean('suspended')))
                ->withCount(['rides'])
                ->latest()
                ->get(),
        ]);
    }

    public function passengers(Request $request): JsonResponse
    {
        $this->requireAdmin($request);

        return response()->json([
            'passengers' => User::query()
                ->select([
                    'id',
                    'name',
                    'email',
                    'contact_number',
                    'date_of_birth',
                    'current_address',
                    'profile_photo',
                    'government_id_type',
                    'government_id_file',
                    'emergency_contact_name',
                    'emergency_contact_number',
                    'safety_terms_accepted',
                    'is_verified',
                    'verification_rejection_reason',
                    'is_suspended',
                    'submitted_at',
                    'created_at',
                ])
                ->where('role', 'passenger')
                ->when($request->filled('search'), function ($query) use ($request): void {
                    $term = '%'.$request->string('search').'%';
                    $query->where(function ($inner) use ($term): void {
                        $inner->where('name', 'like', $term)
                            ->orWhere('email', 'like', $term);
                    });
                })
                ->when($request->has('verified'), fn ($query) => $query->where('is_verified', $request->boolean('verified')))
                ->when($request->has('suspended'), fn ($query) => $query->where('is_suspended', $request->boolean('suspended')))
                ->withCount(['rides'])
                ->latest()
                ->get()
                ->map(fn (User $passenger): array => $this->formatPassenger($passenger)),
        ]);
    }

    public function updatePassengerVerification(Request $request, User $user): JsonResponse
    {
        $admin = $this->requireAdmin($request);

        if ($user->role !== 'passenger') {
            return response()->json([
                'message' => 'Only passenger accounts can be verified here.',
            ], 422);
        }

        $data = $request->validate([
            'is_verified' => ['required', 'boolean'],
            'verification_rejection_reason' => ['nullable', 'string', 'max:255'],
        ]);

        if (! $data['is_verified'] && blank($data['verification_rejection_reason'] ?? null)) {
            return response()->json([
                'message' => 'A rejection reason is required when marking a passenger unverified.',
            ], 422);
        }

        $user->update([
            'is_verified' => (bool) $data['is_verified'],
            'verification_rejection_reason' => $data['is_verified']
                ? null
                : trim((string) $data['verification_rejection_reason']),
        ]);

        $this->audit->log(
            $admin,
            $data['is_verified'] ? 'passenger.verified' : 'passenger.unverified',
            'user',
            $user->id,
            ['reason' => $data['verification_rejection_reason'] ?? null],
        );

        $this->notifications->notify(
            $user,
            $data['is_verified'] ? 'passenger.verified' : 'passenger.unverified',
            $data['is_verified'] ? 'Passenger account verified' : 'Passenger verification update',
            $data['is_verified']
                ? 'Your TriWheel passenger account has been verified. You can now book rides on the platform.'
                : 'Your passenger verification was not approved.'."\n\n".'Reason: '.(string) $data['verification_rejection_reason'],
            '/passenger',
        );

        return response()->json([
            'message' => 'Passenger verification updated successfully.',
            'passenger' => $this->formatPassenger($user->refresh()),
        ]);
    }

    public function drivers(Request $request): JsonResponse
    {
        $this->requireAdmin($request);

        return response()->json([
            'drivers' => Driver::query()
                ->with(['user:id,name,email,contact_number,is_verified,is_suspended,suspension_reason,created_at', 'vehicle:id,driver_id,vehicle_type,plate_number,color,body_number,vehicle_photo,orcr_file,registration_expiry_date'])
                ->when($request->filled('approval_status'), fn ($query) => $query->where('approval_status', $request->string('approval_status')))
                ->when($request->filled('online_status'), fn ($query) => $query->where('status', $request->string('online_status')))
                ->when($request->filled('search'), function ($query) use ($request): void {
                    $term = '%'.$request->string('search').'%';
                    $query->where(function ($inner) use ($term): void {
                        $inner->where('license_number', 'like', $term)
                            ->orWhereHas('user', function ($userQuery) use ($term): void {
                                $userQuery->where('name', 'like', $term)
                                    ->orWhere('email', 'like', $term);
                            });
                    });
                })
                ->latest()
                ->get()
                ->map(fn (Driver $driver): array => $this->formatDriver($driver)),
        ]);
    }

    public function rides(Request $request): JsonResponse
    {
        $this->requireAdmin($request);

        return response()->json([
            'rides' => Ride::query()
                ->with([
                    'passenger:id,name,email,contact_number',
                    'driver.user:id,name,email,contact_number',
                    'driver.vehicle:id,driver_id,vehicle_type,plate_number,color',
                ])
                ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')))
                ->when($request->boolean('emergency'), fn ($query) => $query->where('is_emergency', true))
                ->when($request->filled('search'), function ($query) use ($request): void {
                    $term = '%'.$request->string('search').'%';
                    $query->where(function ($inner) use ($term): void {
                        $inner->where('pickup_address', 'like', $term)
                            ->orWhere('dropoff_address', 'like', $term)
                            ->orWhere('id', 'like', trim($term, '%'));
                    });
                })
                ->latest()
                ->limit(200)
                ->get()
                ->map(fn (Ride $ride): array => $this->formatRide($ride)),
        ]);
    }

    public function updateDriverApproval(Request $request, Driver $driver): JsonResponse
    {
        $admin = $this->requireAdmin($request);

        $this->assertOperatorPolicy($admin, 'operators_can_approve_drivers');

        $data = $request->validate([
            'approval_status' => ['required', Rule::in(['approved', 'rejected'])],
            'rejection_reason' => ['nullable', 'string', 'max:255'],
        ]);

        if ($data['approval_status'] === 'rejected' && $driver->approval_status === 'approved') {
            return response()->json([
                'message' => 'Approved drivers cannot be rejected. Suspend the account instead.',
            ], 422);
        }

        if ($data['approval_status'] === 'rejected' && blank($data['rejection_reason'] ?? null)) {
            return response()->json([
                'message' => 'A rejection reason is required when rejecting a driver.',
            ], 422);
        }

        $driver->update([
            'approval_status' => $data['approval_status'],
            'rejection_reason' => $data['approval_status'] === 'rejected'
                ? trim((string) $data['rejection_reason'])
                : null,
            'status' => $data['approval_status'] === 'approved' ? $driver->status : 'offline',
        ]);

        if ($driver->user) {
            $driver->user->update([
                'is_verified' => $data['approval_status'] === 'approved',
            ]);
        }

        $this->audit->log($admin, 'driver.'.$data['approval_status'], 'driver', $driver->id, [
            'rejection_reason' => $data['rejection_reason'] ?? null,
        ]);

        if ($driver->user) {
            if ($data['approval_status'] === 'approved') {
                $this->notifications->notify(
                    $driver->user,
                    'driver.approved',
                    'Driver application approved',
                    'Good news — your TriWheel driver application has been approved. You can now log in, go online, and start accepting ride requests.',
                    '/driver',
                );
            } else {
                $this->notifications->notify(
                    $driver->user,
                    'driver.rejected',
                    'Driver application rejected',
                    'Your TriWheel driver application was not approved.'."\n\n".'Reason: '.(string) $data['rejection_reason']."\n\n".'You may contact TriWheel support or submit a new application with corrected documents if allowed.',
                    '/driver',
                );
            }
        }

        return response()->json([
            'message' => 'Driver approval status updated successfully.',
            'driver' => $this->formatDriver($driver->refresh()->load(['user', 'vehicle'])),
        ]);
    }

    public function updateDriverAccount(Request $request, Driver $driver): JsonResponse
    {
        $admin = $this->requireAdmin($request);

        if ($driver->approval_status !== 'approved') {
            return response()->json([
                'message' => 'Only approved drivers can be suspended or activated.',
            ], 422);
        }

        $data = $request->validate([
            'action' => ['required', Rule::in(['suspend', 'activate'])],
            'reason' => ['required', 'string', 'max:255'],
        ]);

        $user = $driver->user;

        if (! $user) {
            return response()->json([
                'message' => 'Driver account not found.',
            ], 404);
        }

        if ($data['action'] === 'suspend') {
            if ($user->is_suspended) {
                return response()->json([
                    'message' => 'This driver is already suspended.',
                ], 422);
            }

            $this->driverSuspensions->applySuspension($user, trim($data['reason']));
            $driver->update(['status' => 'offline']);

            $this->audit->log($admin, 'driver.suspended', 'driver', $driver->id, [
                'reason' => trim($data['reason']),
            ]);

            $this->notifications->notify(
                $user,
                'driver.suspended',
                'Driver account suspended',
                trim($data['reason']).' You have 48 hours to submit an appeal from your dashboard.',
                '/driver',
            );

            $message = 'Driver suspended successfully.';
        } else {
            if (! $user->is_suspended) {
                return response()->json([
                    'message' => 'This driver is already active.',
                ], 422);
            }

            $this->driverSuspensions->clearSuspension($user);

            $this->audit->log($admin, 'driver.activated', 'driver', $driver->id, [
                'reason' => trim($data['reason']),
            ]);

            $this->notifications->notify(
                $user,
                'driver.activated',
                'Driver account activated',
                trim($data['reason']),
                '/driver',
            );

            $message = 'Driver activated successfully.';
        }

        return response()->json([
            'message' => $message,
            'driver' => $this->formatDriver($driver->refresh()->load(['user', 'vehicle'])),
        ]);
    }

    public function updatePassengerDetails(Request $request, User $user): JsonResponse
    {
        $admin = $this->requireAdmin($request);

        if ($user->role !== 'passenger') {
            return response()->json([
                'message' => 'Only passenger accounts can be updated here.',
            ], 422);
        }

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'contact_number' => ['nullable', 'string', 'max:30'],
            'current_address' => ['nullable', 'string', 'max:255'],
            'emergency_contact_name' => ['nullable', 'string', 'max:120'],
            'emergency_contact_number' => ['nullable', 'string', 'max:30'],
        ]);

        $user->update($data);

        $this->audit->log($admin, 'passenger.updated', 'user', $user->id, $data);

        return response()->json([
            'message' => 'Passenger updated successfully.',
            'passenger' => $this->formatPassenger($user->refresh()->loadCount('rides')),
        ]);
    }

    public function updatePassengerAccount(Request $request, User $user): JsonResponse
    {
        $admin = $this->requireAdmin($request);

        if ($user->role !== 'passenger') {
            return response()->json([
                'message' => 'Only passenger accounts can be updated here.',
            ], 422);
        }

        $data = $request->validate([
            'is_suspended' => ['required', 'boolean'],
            'suspension_reason' => ['nullable', 'string', 'max:255'],
        ]);

        if ($data['is_suspended'] && blank($data['suspension_reason'] ?? null)) {
            return response()->json([
                'message' => 'A deactivation reason is required.',
            ], 422);
        }

        $user->update([
            'is_suspended' => (bool) $data['is_suspended'],
            'suspension_reason' => $data['is_suspended']
                ? trim((string) $data['suspension_reason'])
                : null,
        ]);

        if ($data['is_suspended']) {
            $user->tokens()->delete();
        }

        $this->audit->log(
            $admin,
            $data['is_suspended'] ? 'passenger.deactivated' : 'passenger.reactivated',
            'user',
            $user->id,
            ['reason' => $data['suspension_reason'] ?? null],
        );

        $this->notifications->notify(
            $user,
            $data['is_suspended'] ? 'passenger.deactivated' : 'passenger.reactivated',
            $data['is_suspended'] ? 'Account deactivated' : 'Account reactivated',
            $data['is_suspended']
                ? (string) $data['suspension_reason']
                : 'Your passenger account has been reactivated.',
            '/passenger',
        );

        return response()->json([
            'message' => $data['is_suspended']
                ? 'Passenger deactivated successfully.'
                : 'Passenger reactivated successfully.',
            'passenger' => $this->formatPassenger($user->refresh()->loadCount('rides')),
        ]);
    }

    public function updateDriverDetails(Request $request, Driver $driver): JsonResponse
    {
        $admin = $this->requireAdmin($request);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'max:255', Rule::unique('users', 'email')->ignore($driver->user_id)],
            'contact_number' => ['nullable', 'string', 'max:30'],
            'phone' => ['nullable', 'string', 'max:30'],
            'license_number' => ['nullable', 'string', 'max:80'],
            'license_restriction' => ['nullable', 'string', 'max:40'],
            'toda_id_number' => ['nullable', 'string', 'max:80'],
            'toda_association' => ['nullable', 'string', 'max:120'],
            'lgu' => ['nullable', 'string', 'max:120'],
            'mtop_number' => ['nullable', 'string', 'max:80'],
            'service_zone_id' => ['nullable', 'string', 'max:80'],
            'vehicle_type' => ['nullable', 'string', 'max:40'],
            'plate_number' => ['nullable', 'string', 'max:40'],
            'body_number' => ['nullable', 'string', 'max:40'],
            'color' => ['nullable', 'string', 'max:40'],
        ]);

        if ($driver->user) {
            $userFields = array_filter([
                'name' => $data['name'] ?? null,
                'email' => $data['email'] ?? null,
                'contact_number' => $data['contact_number'] ?? null,
            ], fn ($value): bool => $value !== null);

            if ($userFields !== []) {
                $driver->user->update($userFields);
            }
        }

        $driverFields = array_filter([
            'phone' => $data['phone'] ?? null,
            'license_number' => $data['license_number'] ?? null,
            'license_restriction' => $data['license_restriction'] ?? null,
            'toda_id_number' => $data['toda_id_number'] ?? null,
            'toda_association' => $data['toda_association'] ?? null,
            'lgu' => $data['lgu'] ?? null,
            'mtop_number' => $data['mtop_number'] ?? null,
            'service_zone_id' => $data['service_zone_id'] ?? null,
        ], fn ($value): bool => $value !== null);

        if ($driverFields !== []) {
            $driver->update($driverFields);
        }

        $vehicleFields = array_filter([
            'vehicle_type' => $data['vehicle_type'] ?? null,
            'plate_number' => $data['plate_number'] ?? null,
            'body_number' => $data['body_number'] ?? null,
            'color' => $data['color'] ?? null,
        ], fn ($value): bool => $value !== null);

        if ($vehicleFields !== [] && $driver->vehicle) {
            $driver->vehicle->update($vehicleFields);
        }

        $this->audit->log($admin, 'driver.updated', 'driver', $driver->id, $data);

        return response()->json([
            'message' => 'Driver updated successfully.',
            'driver' => $this->formatDriver($driver->refresh()->load(['user', 'vehicle'])),
        ]);
    }

    private function formatPassenger(User $passenger): array
    {
        return [
            'id' => $passenger->id,
            'name' => $passenger->name,
            'email' => $passenger->email,
            'contact_number' => $passenger->contact_number,
            'date_of_birth' => $passenger->date_of_birth,
            'current_address' => $passenger->current_address,
            'profile_photo' => $passenger->profile_photo,
            'government_id_type' => $passenger->government_id_type,
            'government_id_file' => $passenger->government_id_file,
            'emergency_contact_name' => $passenger->emergency_contact_name,
            'emergency_contact_number' => $passenger->emergency_contact_number,
            'safety_terms_accepted' => (bool) $passenger->safety_terms_accepted,
            'is_verified' => (bool) $passenger->is_verified,
            'verification_rejection_reason' => $passenger->verification_rejection_reason,
            'is_suspended' => (bool) $passenger->is_suspended,
            'rides_count' => (int) ($passenger->rides_count ?? 0),
            'submitted_at' => $passenger->submitted_at,
            'created_at' => $passenger->created_at,
            'document_urls' => [
                'profile_photo' => DocumentUrl::from($passenger->profile_photo),
                'government_id_file' => DocumentUrl::from($passenger->government_id_file),
            ],
        ];
    }

    private function formatDriver(Driver $driver): array
    {
        return [
            'id' => $driver->id,
            'user_id' => $driver->user_id,
            'name' => $driver->user?->name,
            'email' => $driver->user?->email,
            'contact_number' => $driver->user?->contact_number,
            'is_verified' => (bool) $driver->user?->is_verified,
            'is_suspended' => (bool) $driver->user?->is_suspended,
            'suspension_reason' => $driver->user?->suspension_reason,
            'suspension_appeal_deadline_at' => $driver->user?->suspension_appeal_deadline_at,
            'suspension_appeal_submitted_at' => $driver->user?->suspension_appeal_submitted_at,
            'suspension_appeal_message' => $driver->user?->suspension_appeal_message,
            'suspension_requires_office_visit' => (bool) $driver->user?->suspension_requires_office_visit,
            'account_permanently_closed_at' => $driver->user?->account_permanently_closed_at,
            'license_number' => $driver->license_number,
            'phone' => $driver->phone,
            'date_of_birth' => $driver->date_of_birth,
            'current_address' => $driver->current_address,
            'profile_photo' => $driver->profile_photo,
            'government_id_type' => $driver->government_id_type,
            'government_id_file' => $driver->government_id_file,
            'license_file' => $driver->license_file,
            'license_expiry_date' => $driver->license_expiry_date,
            'license_restriction' => $driver->license_restriction,
            'toda_id_file' => $driver->toda_id_file,
            'toda_id_number' => $driver->toda_id_number,
            'toda_association' => $driver->toda_association,
            'lgu' => $driver->lgu,
            'mtop_number' => $driver->mtop_number,
            'service_zone_id' => $driver->service_zone_id,
            'franchise_permit_file' => $driver->franchise_permit_file,
            'emergency_contact_name' => $driver->emergency_contact_name,
            'emergency_contact_number' => $driver->emergency_contact_number,
            'background_check_consent' => (bool) $driver->background_check_consent,
            'platform_rules_accepted' => (bool) $driver->platform_rules_accepted,
            'submitted_at' => $driver->submitted_at,
            'approval_status' => $driver->approval_status,
            'status' => $driver->status,
            'rejection_reason' => $driver->rejection_reason,
            'vehicle_type' => $driver->vehicle?->vehicle_type,
            'plate_number' => $driver->vehicle?->plate_number,
            'body_number' => $driver->vehicle?->body_number,
            'color' => $driver->vehicle?->color,
            'vehicle_photo' => $driver->vehicle?->vehicle_photo,
            'orcr_file' => $driver->vehicle?->orcr_file,
            'registration_expiry_date' => $driver->vehicle?->registration_expiry_date,
            'created_at' => $driver->created_at,
            'document_urls' => [
                'profile_photo' => DocumentUrl::from($driver->profile_photo),
                'government_id_file' => DocumentUrl::from($driver->government_id_file),
                'license_file' => DocumentUrl::from($driver->license_file),
                'toda_id_file' => DocumentUrl::from($driver->toda_id_file),
                'franchise_permit_file' => DocumentUrl::from($driver->franchise_permit_file),
                'vehicle_photo' => DocumentUrl::from($driver->vehicle?->vehicle_photo),
                'orcr_file' => DocumentUrl::from($driver->vehicle?->orcr_file),
            ],
        ];
    }

    private function formatRide(Ride $ride): array
    {
        return [
            'id' => $ride->id,
            'passenger_name' => $ride->passenger?->name,
            'passenger_email' => $ride->passenger?->email,
            'passenger_phone' => $ride->passenger?->contact_number,
            'driver_name' => $ride->driver?->user?->name,
            'driver_email' => $ride->driver?->user?->email,
            'vehicle_type' => $ride->driver?->vehicle?->vehicle_type,
            'plate_number' => $ride->driver?->vehicle?->plate_number,
            'pickup_address' => $ride->pickup_address,
            'dropoff_address' => $ride->dropoff_address,
            'ride_type' => $ride->ride_type,
            'status' => $ride->status,
            'is_emergency' => (bool) $ride->is_emergency,
            'fare' => $ride->fare ? (float) $ride->fare : null,
            'created_at' => $ride->created_at,
            'accepted_at' => $ride->accepted_at,
            'started_at' => $ride->started_at,
            'completed_at' => $ride->completed_at,
        ];
    }
}
