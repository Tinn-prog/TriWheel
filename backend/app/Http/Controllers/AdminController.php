<?php

namespace App\Http\Controllers;

use App\Models\Driver;
use App\Models\Ride;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminController extends Controller
{
    public function overview(): JsonResponse
    {
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
                    'online' => Driver::where('status', 'online')->count(),
                    'offline' => Driver::where('status', 'offline')->count(),
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

    public function users(): JsonResponse
    {
        return response()->json([
            'users' => User::query()
                ->select(['id', 'name', 'email', 'contact_number', 'role', 'is_verified', 'created_at'])
                ->withCount(['rides'])
                ->latest()
                ->get(),
        ]);
    }

    public function passengers(): JsonResponse
    {
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
                    'submitted_at',
                    'created_at',
                ])
                ->where('role', 'passenger')
                ->withCount(['rides'])
                ->latest()
                ->get(),
        ]);
    }

    public function updatePassengerVerification(Request $request, User $user): JsonResponse
    {
        if ($user->role !== 'passenger') {
            return response()->json([
                'message' => 'Only passenger accounts can be verified here.',
            ], 422);
        }

        $data = $request->validate([
            'is_verified' => ['required', 'boolean'],
        ]);

        $user->update([
            'is_verified' => (bool) $data['is_verified'],
        ]);

        return response()->json([
            'message' => 'Passenger verification updated successfully.',
            'passenger' => $user->refresh(),
        ]);
    }

    public function drivers(): JsonResponse
    {
        return response()->json([
            'drivers' => Driver::query()
                ->with(['user:id,name,email,contact_number,is_verified,created_at', 'vehicle:id,driver_id,vehicle_type,plate_number,color'])
                ->latest()
                ->get()
                ->map(fn (Driver $driver): array => $this->formatDriver($driver)),
        ]);
    }

    public function rides(): JsonResponse
    {
        return response()->json([
            'rides' => Ride::query()
                ->with([
                    'passenger:id,name,email,contact_number',
                    'driver.user:id,name,email,contact_number',
                    'driver.vehicle:id,driver_id,vehicle_type,plate_number,color',
                ])
                ->latest()
                ->limit(100)
                ->get()
                ->map(fn (Ride $ride): array => $this->formatRide($ride)),
        ]);
    }

    public function updateDriverApproval(Request $request, Driver $driver): JsonResponse
    {
        $data = $request->validate([
            'approval_status' => ['required', Rule::in(['approved', 'rejected', 'pending'])],
            'rejection_reason' => ['nullable', 'string', 'max:255'],
        ]);

        $driver->update([
            'approval_status' => $data['approval_status'],
            'rejection_reason' => $data['approval_status'] === 'rejected'
                ? ($data['rejection_reason'] ?? 'Rejected by admin.')
                : null,
            'status' => $data['approval_status'] === 'approved' ? $driver->status : 'offline',
        ]);

        if ($driver->user) {
            $driver->user->update([
                'is_verified' => $data['approval_status'] === 'approved',
            ]);
        }

        return response()->json([
            'message' => 'Driver approval status updated successfully.',
            'driver' => $this->formatDriver($driver->refresh()->load(['user', 'vehicle'])),
        ]);
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
            'fare' => $ride->fare ? (float) $ride->fare : null,
            'created_at' => $ride->created_at,
            'accepted_at' => $ride->accepted_at,
            'started_at' => $ride->started_at,
            'completed_at' => $ride->completed_at,
        ];
    }
}
