<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesAdminUser;
use App\Models\AdminAuditLog;
use App\Models\Driver;
use App\Models\PlatformSetting;
use App\Models\Ride;
use App\Models\RideReport;
use App\Models\User;
use App\Services\AdminAuditService;
use App\Support\RideReportReasons;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminManagementController extends Controller
{
    use ResolvesAdminUser;

    public function __construct(private readonly AdminAuditService $audit) {}

    public function showRide(Request $request, Ride $ride): JsonResponse
    {
        $this->requireAdmin($request);

        $ride->load([
            'passenger:id,name,email,contact_number',
            'driver.user:id,name,email,contact_number',
            'driver.vehicle:id,driver_id,vehicle_type,plate_number,color',
            'offers.driver.user:id,name',
        ]);

        return response()->json([
            'ride' => $this->formatRideDetail($ride),
        ]);
    }

    public function cancelRide(Request $request, Ride $ride): JsonResponse
    {
        $admin = $this->requireAdmin($request);

        if (in_array($ride->status, ['completed', 'cancelled'], true)) {
            return response()->json([
                'message' => 'This ride can no longer be cancelled.',
            ], 422);
        }

        $previousStatus = $ride->status;

        $ride->update([
            'status' => 'cancelled',
            'driver_id' => null,
        ]);

        $ride->offers()
            ->whereIn('status', ['pending', 'accepted'])
            ->update(['status' => 'cancelled']);

        $this->audit->log($admin, 'ride.cancelled', 'ride', $ride->id, [
            'previous_status' => $previousStatus,
        ]);

        return response()->json([
            'message' => 'Ride cancelled by admin.',
            'ride' => $this->formatRideDetail($ride->refresh()),
        ]);
    }

    public function reassignRide(Request $request, Ride $ride): JsonResponse
    {
        $admin = $this->requireAdmin($request);

        $data = $request->validate([
            'driver_id' => ['required', 'integer', 'exists:drivers,id'],
        ]);

        if (! in_array($ride->status, ['requested', 'accepted'], true)) {
            return response()->json([
                'message' => 'Only requested or accepted rides can be reassigned.',
            ], 422);
        }

        $driver = Driver::query()
            ->where('id', $data['driver_id'])
            ->where('approval_status', 'approved')
            ->first();

        if (! $driver) {
            return response()->json([
                'message' => 'Selected driver is not approved.',
            ], 422);
        }

        $previousDriverId = $ride->driver_id;

        $ride->update([
            'driver_id' => $driver->id,
            'status' => 'accepted',
            'accepted_at' => now(),
        ]);

        $ride->offers()
            ->whereIn('status', ['pending', 'accepted'])
            ->update(['status' => 'cancelled']);

        $this->audit->log($admin, 'ride.reassigned', 'ride', $ride->id, [
            'previous_driver_id' => $previousDriverId,
            'new_driver_id' => $driver->id,
        ]);

        return response()->json([
            'message' => 'Ride reassigned successfully.',
            'ride' => $this->formatRideDetail($ride->refresh()->load([
                'passenger:id,name,email,contact_number',
                'driver.user:id,name,email,contact_number',
                'driver.vehicle:id,driver_id,vehicle_type,plate_number,color',
            ])),
        ]);
    }

    public function driverLocations(Request $request): JsonResponse
    {
        $this->requireAdmin($request);

        $drivers = Driver::query()
            ->with(['user:id,name,contact_number', 'vehicle:id,driver_id,vehicle_type,plate_number,color'])
            ->onlineWithLiveGps()
            ->get()
            ->map(fn (Driver $driver): array => [
                'id' => $driver->id,
                'name' => $driver->user?->name,
                'phone' => $driver->phone ?? $driver->user?->contact_number,
                'status' => $driver->status,
                'lat' => (float) $driver->current_lat,
                'lng' => (float) $driver->current_lng,
                'location_updated_at' => $driver->location_updated_at,
                'vehicle_type' => $driver->vehicle?->vehicle_type,
                'plate_number' => $driver->vehicle?->plate_number,
                'color' => $driver->vehicle?->color,
            ]);

        return response()->json([
            'drivers' => $drivers,
            'live_gps_fresh_minutes' => Driver::LIVE_GPS_FRESH_MINUTES,
            'online_with_gps' => $drivers->count(),
        ]);
    }

    public function ratings(Request $request): JsonResponse
    {
        $this->requireSuperAdmin($request);

        $completed = Ride::query()->where('status', 'completed');

        $passengerRatings = (clone $completed)
            ->where('passenger_rated', true)
            ->whereNotNull('rating')
            ->pluck('rating')
            ->map(fn ($rating) => (int) $rating)
            ->filter(fn (int $rating) => $rating >= 1 && $rating <= 5);

        $driverRatings = (clone $completed)
            ->where('driver_rated', true)
            ->whereNotNull('driver_rating')
            ->pluck('driver_rating')
            ->map(fn ($rating) => (int) $rating)
            ->filter(fn (int $rating) => $rating >= 1 && $rating <= 5);

        $recent = Ride::query()
            ->with([
                'passenger:id,name',
                'driver.user:id,name',
            ])
            ->where('status', 'completed')
            ->where(function ($query): void {
                $query->where('passenger_rated', true)
                    ->orWhere('driver_rated', true);
            })
            ->latest('completed_at')
            ->limit(20)
            ->get()
            ->map(fn (Ride $ride): array => [
                'id' => $ride->id,
                'passenger_name' => $ride->passenger?->name,
                'driver_name' => $ride->driver?->user?->name,
                'passenger_rating' => $ride->passenger_rated ? (int) $ride->rating : null,
                'passenger_feedback' => $ride->passenger_feedback,
                'driver_rating' => $ride->driver_rated ? (int) $ride->driver_rating : null,
                'driver_feedback' => $ride->driver_feedback,
                'completed_at' => $ride->completed_at,
            ]);

        return response()->json([
            'summary' => [
                'passenger_to_driver' => [
                    'count' => $passengerRatings->count(),
                    'average' => $passengerRatings->count() > 0
                        ? round($passengerRatings->avg(), 2)
                        : null,
                ],
                'driver_to_passenger' => [
                    'count' => $driverRatings->count(),
                    'average' => $driverRatings->count() > 0
                        ? round($driverRatings->avg(), 2)
                        : null,
                ],
            ],
            'recent' => $recent,
        ]);
    }

    public function settings(Request $request): JsonResponse
    {
        $this->requireSuperAdmin($request);

        return response()->json([
            'fare_rules' => PlatformSetting::fareRules(),
            'defaults' => PlatformSetting::defaultFareRules(),
            'road_restrictions' => PlatformSetting::roadRestrictions(),
            'road_restrictions_defaults' => PlatformSetting::defaultRoadRestrictions(),
            'service_zones' => PlatformSetting::serviceZoneOptions(),
            'system_config' => PlatformSetting::systemConfig(),
            'access_policy' => PlatformSetting::accessPolicy(),
            'admin_accounts' => User::query()
                ->where('role', 'admin')
                ->orderBy('name')
                ->get(['id', 'name', 'email', 'admin_role', 'is_suspended'])
                ->map(fn (User $user): array => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'admin_role' => $user->admin_role ?? 'operator',
                    'is_suspended' => (bool) $user->is_suspended,
                ]),
        ]);
    }

    public function updateSettings(Request $request): JsonResponse
    {
        $admin = $this->requireSuperAdmin($request);

        $data = $request->validate([
            'fare_rules' => ['sometimes', 'array'],
            'fare_rules.tricycle' => ['required_with:fare_rules', 'array'],
            'fare_rules.tricycle.base' => ['required_with:fare_rules', 'numeric', 'min:0'],
            'fare_rules.tricycle.succeeding' => ['required_with:fare_rules', 'numeric', 'min:0'],
            'fare_rules.pedicab' => ['required_with:fare_rules', 'array'],
            'fare_rules.pedicab.base' => ['required_with:fare_rules', 'numeric', 'min:0'],
            'fare_rules.pedicab.succeeding' => ['required_with:fare_rules', 'numeric', 'min:0'],
            'fare_rules.e-tricycle' => ['required_with:fare_rules', 'array'],
            'fare_rules.e-tricycle.base' => ['required_with:fare_rules', 'numeric', 'min:0'],
            'fare_rules.e-tricycle.succeeding' => ['required_with:fare_rules', 'numeric', 'min:0'],
            'road_restrictions' => ['sometimes', 'array'],
            'system_config' => ['sometimes', 'array'],
            'system_config.platform_name' => ['sometimes', 'string', 'max:80'],
            'system_config.default_language' => ['sometimes', Rule::in(['en', 'fil'])],
            'system_config.timezone' => ['sometimes', 'string', 'max:80'],
            'system_config.date_format' => ['sometimes', Rule::in(['en-PH', 'en-US', 'iso'])],
            'system_config.currency_code' => ['sometimes', 'string', 'max:8'],
            'system_config.currency_symbol' => ['sometimes', 'string', 'max:8'],
            'access_policy' => ['sometimes', 'array'],
            'access_policy.allow_passenger_registration' => ['sometimes', 'boolean'],
            'access_policy.allow_driver_registration' => ['sometimes', 'boolean'],
            'access_policy.require_driver_admin_approval' => ['sometimes', 'boolean'],
            'access_policy.operators_can_suspend_users' => ['sometimes', 'boolean'],
            'access_policy.operators_can_manage_reports' => ['sometimes', 'boolean'],
            'access_policy.operators_can_approve_drivers' => ['sometimes', 'boolean'],
        ]);

        if (isset($data['fare_rules'])) {
            PlatformSetting::updateFareRules($data['fare_rules']);

            $this->audit->log($admin, 'settings.fare_rules_updated', 'platform_setting', 0, [
                'fare_rules' => $data['fare_rules'],
            ]);
        }

        if (isset($data['road_restrictions'])) {
            PlatformSetting::updateRoadRestrictions($data['road_restrictions']);

            $this->audit->log($admin, 'settings.road_restrictions_updated', 'platform_setting', 0, [
                'road_restrictions' => $data['road_restrictions'],
            ]);
        }

        if (isset($data['system_config'])) {
            PlatformSetting::updateSystemConfig($data['system_config']);

            $this->audit->log($admin, 'settings.system_config_updated', 'platform_setting', 0, [
                'system_config' => $data['system_config'],
            ]);
        }

        if (isset($data['access_policy'])) {
            PlatformSetting::updateAccessPolicy($data['access_policy']);

            $this->audit->log($admin, 'settings.access_policy_updated', 'platform_setting', 0, [
                'access_policy' => $data['access_policy'],
            ]);
        }

        return response()->json([
            'message' => 'Platform settings updated successfully.',
            'fare_rules' => PlatformSetting::fareRules(),
            'road_restrictions' => PlatformSetting::roadRestrictions(),
            'system_config' => PlatformSetting::systemConfig(),
            'access_policy' => PlatformSetting::accessPolicy(),
        ]);
    }

    public function updateDriverCompliance(Request $request, Driver $driver): JsonResponse
    {
        $admin = $this->requireAdmin($request);

        $data = $request->validate([
            'lgu' => ['nullable', 'string', 'max:120'],
            'mtop_number' => ['nullable', 'string', 'max:80'],
            'service_zone_id' => ['nullable', 'string', 'max:80'],
        ]);

        $driver->update($data);

        $this->audit->log($admin, 'driver.compliance_updated', 'driver', $driver->id, $data);

        return response()->json([
            'message' => 'Driver compliance profile updated.',
            'driver' => $driver->refresh()->only(['id', 'lgu', 'mtop_number', 'service_zone_id']),
        ]);
    }

    public function auditLogs(Request $request): JsonResponse
    {
        $this->requireSuperAdmin($request);

        $logs = $this->filteredAuditLogsQuery($request)
            ->limit(200)
            ->get()
            ->map(fn (AdminAuditLog $log): array => $this->formatAuditLog($log));

        return response()->json(['logs' => $logs]);
    }

    public function exportAuditLogs(Request $request): StreamedResponse
    {
        $this->requireSuperAdmin($request);

        $logs = $this->filteredAuditLogsQuery($request)
            ->limit(5000)
            ->get();

        return $this->streamCsv('audit-logs.csv', [
            'ID', 'When', 'Admin', 'Admin Email', 'Admin Role', 'Action', 'Target Type', 'Target ID', 'Details',
        ], $logs->map(function (AdminAuditLog $log): array {
            $details = $log->details ? json_decode($log->details, true) : null;

            return [
                $log->id,
                $log->created_at?->toDateTimeString() ?? '',
                $log->admin?->name ?? '',
                $log->admin?->email ?? '',
                $log->admin?->admin_role ?? '',
                $log->action,
                $log->target_type,
                $log->target_id,
                $details ? json_encode($details) : '',
            ];
        }));
    }

    public function storeAdminUser(Request $request): JsonResponse
    {
        $admin = $this->requireSuperAdmin($request);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6', 'max:255'],
            'contact_number' => ['nullable', 'string', 'max:30'],
        ]);

        $nameParts = preg_split('/\s+/', trim($data['name']), 2) ?: [];

        $user = User::create([
            'name' => $data['name'],
            'first_name' => $nameParts[0] ?? $data['name'],
            'last_name' => $nameParts[1] ?? '',
            'email' => $data['email'],
            'contact_number' => $data['contact_number'] ?? null,
            'password' => $data['password'],
            'role' => 'admin',
            'admin_role' => 'operator',
            'is_verified' => true,
        ]);

        $user->forceFill(['email_verified_at' => now()])->save();

        $this->audit->log($admin, 'admin.operator_created', 'user', $user->id, [
            'email' => $user->email,
            'name' => $user->name,
        ]);

        return response()->json([
            'message' => 'Admin operator account created successfully.',
            'user' => $this->formatAdminUser($user->refresh()),
        ], 201);
    }

    public function importUsers(Request $request): JsonResponse
    {
        $admin = $this->requireSuperAdmin($request);

        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:5120'],
        ]);

        $handle = fopen($request->file('file')->getRealPath(), 'r');

        if ($handle === false) {
            return response()->json([
                'message' => 'Unable to read the uploaded CSV file.',
            ], 422);
        }

        $headerRow = fgetcsv($handle) ?: [];
        $headers = collect($headerRow)
            ->map(fn ($value) => Str::of((string) $value)->trim()->lower()->toString())
            ->all();

        $columnIndex = fn (string $name): ?int => ($index = array_search($name, $headers, true)) === false ? null : $index;

        $nameIndex = $columnIndex('name');
        $emailIndex = $columnIndex('email');
        $roleIndex = $columnIndex('role');
        $adminRoleIndex = $columnIndex('admin role');
        $contactIndex = $columnIndex('contact');
        $passwordIndex = $columnIndex('password');

        if ($nameIndex === null || $emailIndex === null || $roleIndex === null) {
            fclose($handle);

            return response()->json([
                'message' => 'CSV must include Name, Email, and Role columns.',
            ], 422);
        }

        $created = 0;
        $skipped = 0;
        $errors = [];

        while (($row = fgetcsv($handle)) !== false) {
            $email = trim((string) ($row[$emailIndex] ?? ''));

            if ($email === '') {
                continue;
            }

            if (User::query()->where('email', $email)->exists()) {
                $skipped++;
                continue;
            }

            $role = Str::of((string) ($row[$roleIndex] ?? ''))->trim()->lower()->toString();

            if (! in_array($role, ['passenger', 'admin'], true)) {
                $errors[] = "Skipped {$email}: role must be passenger or admin.";
                $skipped++;
                continue;
            }

            $password = trim((string) ($row[$passwordIndex] ?? ''));

            if ($password === '') {
                $errors[] = "Skipped {$email}: password is required for new accounts.";
                $skipped++;
                continue;
            }

            if (strlen($password) < 6) {
                $errors[] = "Skipped {$email}: password must be at least 6 characters.";
                $skipped++;
                continue;
            }

            $name = trim((string) ($row[$nameIndex] ?? ''));
            $nameParts = preg_split('/\s+/', $name, 2) ?: [];
            $adminRole = Str::of((string) ($row[$adminRoleIndex] ?? 'operator'))->trim()->lower()->replace(' ', '_')->toString();

            if ($role === 'admin' && $adminRole !== 'operator') {
                $errors[] = "Skipped {$email}: only admin operator accounts can be imported.";
                $skipped++;
                continue;
            }

            $user = User::create([
                'name' => $name !== '' ? $name : $email,
                'first_name' => $nameParts[0] ?? ($name !== '' ? $name : $email),
                'last_name' => $nameParts[1] ?? '',
                'email' => $email,
                'contact_number' => trim((string) ($row[$contactIndex] ?? '')) ?: null,
                'password' => $password,
                'role' => $role,
                'admin_role' => $role === 'admin' ? 'operator' : null,
                'is_verified' => true,
            ]);

            $user->forceFill(['email_verified_at' => now()])->save();

            $created++;
        }

        fclose($handle);

        $this->audit->log($admin, 'users.imported', 'platform_setting', 0, [
            'created' => $created,
            'skipped' => $skipped,
        ]);

        return response()->json([
            'message' => "Import finished. {$created} created, {$skipped} skipped.",
            'created' => $created,
            'skipped' => $skipped,
            'errors' => array_slice($errors, 0, 20),
        ]);
    }

    public function updateUser(Request $request, User $user): JsonResponse
    {
        $admin = $this->requireSuperAdmin($request);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'contact_number' => ['nullable', 'string', 'max:30'],
            'role' => ['sometimes', Rule::in(['admin', 'driver', 'passenger'])],
            'admin_role' => ['nullable', Rule::in(['super_admin', 'operator'])],
            'is_verified' => ['sometimes', 'boolean'],
        ]);

        if (($data['role'] ?? $user->role) !== 'admin') {
            $data['admin_role'] = null;
        }

        if (($data['role'] ?? $user->role) === 'admin' && blank($data['admin_role'] ?? $user->admin_role)) {
            $data['admin_role'] = 'operator';
        }

        if (
            $user->admin_role === 'super_admin'
            && ($data['admin_role'] ?? $user->admin_role) !== 'super_admin'
        ) {
            $remainingSuperAdmins = User::query()
                ->where('role', 'admin')
                ->where('admin_role', 'super_admin')
                ->where('id', '!=', $user->id)
                ->count();

            if ($remainingSuperAdmins < 1) {
                return response()->json([
                    'message' => 'At least one super admin account must remain active.',
                ], 422);
            }
        }

        $user->update($data);

        $this->audit->log($admin, 'user.updated', 'user', $user->id, $data);

        return response()->json([
            'message' => 'User updated successfully.',
            'user' => $this->formatAdminUser($user->refresh()),
        ]);
    }

    public function suspendUser(Request $request, User $user): JsonResponse
    {
        $admin = $this->requireAdmin($request);

        $this->assertAdminCanManageUser($admin, $user);
        $this->assertOperatorPolicy($admin, 'operators_can_suspend_users');

        if ($user->id === $admin->id) {
            return response()->json([
                'message' => 'You cannot suspend your own account.',
            ], 422);
        }

        $data = $request->validate([
            'is_suspended' => ['required', 'boolean'],
            'suspension_reason' => ['nullable', 'string', 'max:255'],
        ]);

        if ($data['is_suspended'] && blank($data['suspension_reason'] ?? null)) {
            return response()->json([
                'message' => 'A suspension reason is required.',
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

            if ($user->driver) {
                $user->driver->update(['status' => 'offline']);
            }
        }

        $this->audit->log($admin, $data['is_suspended'] ? 'user.suspended' : 'user.unsuspended', 'user', $user->id, [
            'reason' => $data['suspension_reason'] ?? null,
        ]);

        return response()->json([
            'message' => $data['is_suspended']
                ? 'User suspended successfully.'
                : 'User suspension removed.',
            'user' => $this->formatAdminUser($user->refresh()),
        ]);
    }

    public function exportUsers(Request $request): StreamedResponse
    {
        $this->requireSuperAdmin($request);

        return $this->streamCsv('users.csv', [
            'ID', 'Name', 'Email', 'Role', 'Admin Role', 'Contact', 'Verified', 'Suspended', 'Rides', 'Joined',
        ], User::query()
            ->select(['id', 'name', 'email', 'role', 'admin_role', 'contact_number', 'is_verified', 'is_suspended', 'created_at'])
            ->withCount('rides')
            ->latest()
            ->get()
            ->map(fn (User $user): array => [
                $user->id,
                $user->name,
                $user->email,
                $user->role,
                $user->admin_role ?? '',
                $user->contact_number ?? '',
                $user->is_verified ? 'yes' : 'no',
                $user->is_suspended ? 'yes' : 'no',
                (string) ($user->rides_count ?? 0),
                $user->created_at?->toDateTimeString() ?? '',
            ]));
    }

    public function exportDrivers(Request $request): StreamedResponse
    {
        $this->requireSuperAdmin($request);

        return $this->streamCsv('drivers.csv', [
            'ID', 'Name', 'Email', 'Approval', 'Online Status', 'License', 'LGU', 'MTOP', 'Service Zone', 'Vehicle', 'Plate', 'Applied',
        ], Driver::query()
            ->with(['user:id,name,email', 'vehicle:id,driver_id,vehicle_type,plate_number'])
            ->latest()
            ->get()
            ->map(fn (Driver $driver): array => [
                $driver->id,
                $driver->user?->name ?? '',
                $driver->user?->email ?? '',
                $driver->approval_status,
                $driver->status,
                $driver->license_number ?? '',
                $driver->lgu ?? '',
                $driver->mtop_number ?? '',
                $driver->service_zone_id ?? '',
                $driver->vehicle?->vehicle_type ?? '',
                $driver->vehicle?->plate_number ?? '',
                $driver->submitted_at?->toDateTimeString() ?? '',
            ]));
    }

    public function exportRides(Request $request): StreamedResponse
    {
        $this->requireSuperAdmin($request);

        return $this->streamCsv('rides.csv', [
            'ID', 'Passenger', 'Driver', 'Pickup', 'Dropoff', 'Status', 'Emergency', 'Fare', 'Created',
        ], Ride::query()
            ->with(['passenger:id,name', 'driver.user:id,name'])
            ->latest()
            ->limit(5000)
            ->get()
            ->map(fn (Ride $ride): array => [
                $ride->id,
                $ride->passenger?->name ?? '',
                $ride->driver?->user?->name ?? '',
                $ride->pickup_address,
                $ride->dropoff_address,
                $ride->status,
                $ride->is_emergency ? 'yes' : 'no',
                $ride->fare !== null ? (string) $ride->fare : '',
                $ride->created_at?->toDateTimeString() ?? '',
            ]));
    }

    public function approvedDrivers(Request $request): JsonResponse
    {
        $this->requireAdmin($request);

        $drivers = Driver::query()
            ->with('user:id,name')
            ->where('approval_status', 'approved')
            ->orderBy('user_id')
            ->get(['id', 'user_id', 'status', 'approval_status'])
            ->map(fn (Driver $driver): array => [
                'id' => $driver->id,
                'name' => $driver->user?->name,
                'status' => $driver->status,
            ]);

        return response()->json(['drivers' => $drivers]);
    }

    private function streamCsv(string $filename, array $headers, $rows): StreamedResponse
    {
        return response()->streamDownload(function () use ($headers, $rows): void {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, $headers);

            foreach ($rows as $row) {
                fputcsv($handle, $row);
            }

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv',
        ]);
    }

    /**
     * @return \Illuminate\Database\Eloquent\Builder<AdminAuditLog>
     */
    private function filteredAuditLogsQuery(Request $request)
    {
        $data = $request->validate([
            'search' => ['sometimes', 'string', 'max:100'],
            'action' => ['sometimes', 'string', 'max:80'],
            'target_type' => ['sometimes', 'string', 'max:40'],
        ]);

        return AdminAuditLog::query()
            ->with('admin:id,name,email,admin_role')
            ->when(filled($data['action'] ?? null), fn ($query) => $query->where('action', $data['action']))
            ->when(filled($data['target_type'] ?? null), fn ($query) => $query->where('target_type', $data['target_type']))
            ->when(filled($data['search'] ?? null), function ($query) use ($data): void {
                $term = '%'.$data['search'].'%';

                $query->where(function ($inner) use ($term): void {
                    $inner->where('action', 'like', $term)
                        ->orWhere('target_type', 'like', $term)
                        ->orWhere('target_id', 'like', trim($term, '%'))
                        ->orWhereHas('admin', function ($adminQuery) use ($term): void {
                            $adminQuery->where('name', 'like', $term)
                                ->orWhere('email', 'like', $term);
                        });
                });
            })
            ->latest();
    }

    private function formatAuditLog(AdminAuditLog $log): array
    {
        return [
            'id' => $log->id,
            'admin_name' => $log->admin?->name,
            'admin_email' => $log->admin?->email,
            'admin_role' => $log->admin?->admin_role,
            'action' => $log->action,
            'target_type' => $log->target_type,
            'target_id' => $log->target_id,
            'details' => $log->details ? json_decode($log->details, true) : null,
            'created_at' => $log->created_at,
        ];
    }

    private function formatAdminUser(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'contact_number' => $user->contact_number,
            'role' => $user->role,
            'admin_role' => $user->admin_role,
            'is_verified' => (bool) $user->is_verified,
            'is_suspended' => (bool) $user->is_suspended,
            'suspension_reason' => $user->suspension_reason,
            'verification_rejection_reason' => $user->verification_rejection_reason,
            'rides_count' => (int) $user->rides()->count(),
            'created_at' => $user->created_at,
        ];
    }

    private function formatRideDetail(Ride $ride): array
    {
        return [
            'id' => $ride->id,
            'passenger_id' => $ride->passenger_id,
            'passenger_name' => $ride->passenger?->name,
            'passenger_email' => $ride->passenger?->email,
            'passenger_phone' => $ride->passenger?->contact_number,
            'driver_id' => $ride->driver_id,
            'driver_name' => $ride->driver?->user?->name,
            'driver_email' => $ride->driver?->user?->email,
            'driver_phone' => $ride->driver?->user?->contact_number,
            'vehicle_type' => $ride->driver?->vehicle?->vehicle_type,
            'plate_number' => $ride->driver?->vehicle?->plate_number,
            'pickup_address' => $ride->pickup_address,
            'dropoff_address' => $ride->dropoff_address,
            'pickup_lat' => $ride->pickup_lat,
            'pickup_lng' => $ride->pickup_lng,
            'dropoff_lat' => $ride->dropoff_lat,
            'dropoff_lng' => $ride->dropoff_lng,
            'ride_type' => $ride->ride_type,
            'status' => $ride->status,
            'is_emergency' => (bool) $ride->is_emergency,
            'fare' => $ride->fare ? (float) $ride->fare : null,
            'rating' => $ride->rating,
            'passenger_feedback' => $ride->passenger_feedback,
            'driver_rating' => $ride->driver_rating,
            'driver_feedback' => $ride->driver_feedback,
            'created_at' => $ride->created_at,
            'accepted_at' => $ride->accepted_at,
            'started_at' => $ride->started_at,
            'completed_at' => $ride->completed_at,
            'offers_count' => $ride->relationLoaded('offers') ? $ride->offers->count() : null,
        ];
    }

    public function reports(Request $request): JsonResponse
    {
        $this->requireAdmin($request);

        $data = $request->validate([
            'status' => ['sometimes', Rule::in(['pending', 'reviewed', 'dismissed'])],
            'search' => ['sometimes', 'string', 'max:100'],
            'severity' => ['sometimes', Rule::in(['critical', 'high', 'medium', 'low'])],
            'emergency' => ['sometimes', 'boolean'],
        ]);

        $reportsQuery = RideReport::query()
            ->with([
                'ride:id,pickup_address,dropoff_address,status,is_emergency',
                'reporter:id,name,email,role,is_suspended',
                'reportedUser:id,name,email,role,is_suspended',
            ])
            ->latest();

        if (filled($data['status'] ?? null)) {
            $reportsQuery->where('status', $data['status']);
        }

        if (filled($data['severity'] ?? null)) {
            $reportsQuery->whereIn('report_reason_code', RideReportReasons::codesForSeverity($data['severity']));
        }

        if ($request->boolean('emergency')) {
            $reportsQuery->whereHas('ride', fn ($rideQuery) => $rideQuery->where('is_emergency', true));
        }

        if (filled($data['search'] ?? null)) {
            $term = '%'.$data['search'].'%';

            $reportsQuery->where(function ($query) use ($term): void {
                $query->where('report_reason', 'like', $term)
                    ->orWhere('ride_id', 'like', trim($term, '%'))
                    ->orWhereHas('reporter', function ($reporterQuery) use ($term): void {
                        $reporterQuery->where('name', 'like', $term)
                            ->orWhere('email', 'like', $term);
                    })
                    ->orWhereHas('reportedUser', function ($reportedQuery) use ($term): void {
                        $reportedQuery->where('name', 'like', $term)
                            ->orWhere('email', 'like', $term);
                    });
            });
        }

        $reports = $reportsQuery
            ->limit(200)
            ->get();

        $rideReportCounts = $reports
            ->groupBy('ride_id')
            ->map(fn ($group) => $group->count());

        $reports = $reports->map(fn (RideReport $report): array => [
            'id' => $report->id,
            'ride_id' => $report->ride_id,
            'ride_status' => $report->ride?->status,
            'ride_pickup' => $report->ride?->pickup_address,
            'ride_dropoff' => $report->ride?->dropoff_address,
            'is_emergency' => (bool) $report->ride?->is_emergency,
            'reporter_user_id' => $report->reporter_user_id,
            'reported_user_id' => $report->reported_user_id,
            'reporter_role' => $report->reporter_role,
            'reported_role' => $report->reportedUser?->role,
            'reporter_name' => $report->reporter?->name,
            'reporter_email' => $report->reporter?->email,
            'reporter_is_suspended' => (bool) $report->reporter?->is_suspended,
            'reported_name' => $report->reportedUser?->name,
            'reported_email' => $report->reportedUser?->email,
            'reported_is_suspended' => (bool) $report->reportedUser?->is_suspended,
            'report_reason_code' => $report->report_reason_code,
            'report_reason' => $report->report_reason,
            'severity' => RideReportReasons::severity($report->report_reason_code),
            'status' => $report->status,
            'admin_notes' => $report->admin_notes,
            'ride_report_count' => $rideReportCounts->get($report->ride_id, 1),
            'created_at' => $report->created_at,
        ]);

        return response()->json([
            'reports' => $reports->values(),
        ]);
    }

    public function updateReport(Request $request, RideReport $report): JsonResponse
    {
        $admin = $this->requireAdmin($request);

        $this->assertOperatorPolicy($admin, 'operators_can_manage_reports');

        $data = $request->validate([
            'status' => ['required', Rule::in(['pending', 'reviewed', 'dismissed'])],
            'admin_notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $previousStatus = $report->status;
        $report->update([
            'status' => $data['status'],
            'admin_notes' => array_key_exists('admin_notes', $data)
                ? ($data['admin_notes'] ?? null)
                : $report->admin_notes,
        ]);

        $this->audit->log($admin, 'ride_report.updated', 'ride_report', $report->id, [
            'previous_status' => $previousStatus,
            'status' => $data['status'],
            'admin_notes' => $report->admin_notes,
        ]);

        return response()->json([
            'message' => 'Report status updated.',
            'report' => [
                'id' => $report->id,
                'status' => $report->status,
                'admin_notes' => $report->admin_notes,
            ],
        ]);
    }
}
