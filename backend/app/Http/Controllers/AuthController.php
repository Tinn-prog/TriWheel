<?php

namespace App\Http\Controllers;

use App\Models\Driver;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function registerPassenger(Request $request): JsonResponse
    {
        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:80'],
            'middle_name' => ['nullable', 'string', 'max:80'],
            'last_name' => ['required', 'string', 'max:80'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'contact_number' => ['required', 'string', 'max:20'],
            'password' => ['required', 'string', 'min:6', 'confirmed'],
            'date_of_birth' => ['required', 'date', 'before:-18 years'],
            'current_address' => ['required', 'string', 'max:255'],
            'government_id_type' => ['required', 'string', 'max:80'],
            'emergency_contact_name' => ['required', 'string', 'max:120'],
            'emergency_contact_number' => ['required', 'string', 'max:20'],
            'safety_terms_accepted' => ['accepted'],
            'profile_photo' => ['required', 'file', 'mimes:jpg,jpeg,png', 'max:4096'],
            'government_id_file' => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:4096'],
        ]);

        $fullName = trim(implode(' ', array_filter([
            $data['first_name'],
            $data['middle_name'] ?? null,
            $data['last_name'],
        ])));

        $user = User::create([
            'name' => $fullName,
            'first_name' => $data['first_name'],
            'middle_name' => $data['middle_name'] ?? null,
            'last_name' => $data['last_name'],
            'email' => $data['email'],
            'contact_number' => $data['contact_number'],
            'date_of_birth' => $data['date_of_birth'],
            'current_address' => $data['current_address'],
            'profile_photo' => $request->file('profile_photo')?->store('passenger-documents', 'public'),
            'government_id_type' => $data['government_id_type'],
            'government_id_file' => $request->file('government_id_file')?->store('passenger-documents', 'public'),
            'emergency_contact_name' => $data['emergency_contact_name'],
            'emergency_contact_number' => $data['emergency_contact_number'],
            'safety_terms_accepted' => true,
            'submitted_at' => now(),
            'role' => 'passenger',
            'is_verified' => false,
            'password' => $data['password'],
        ]);

        return response()->json([
            'message' => 'Passenger account submitted successfully. Please wait for admin verification.',
            'user_id' => $user->id,
        ], 201);
    }

    public function registerDriver(Request $request): JsonResponse
    {
        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:80'],
            'middle_name' => ['nullable', 'string', 'max:80'],
            'last_name' => ['required', 'string', 'max:80'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'contact_number' => ['required', 'string', 'max:20'],
            'password' => ['required', 'string', 'min:6', 'confirmed'],
            'date_of_birth' => ['required', 'date', 'before:-18 years'],
            'current_address' => ['required', 'string', 'max:255'],
            'government_id_type' => ['required', 'string', 'max:80'],
            'license_number' => ['required', 'string', 'max:80'],
            'license_expiry_date' => ['required', 'date', 'after:today'],
            'license_restriction' => ['required', 'string', 'max:80'],
            'phone' => ['required', 'string', 'max:20'],
            'toda_id_number' => ['nullable', 'string', 'max:80'],
            'toda_association' => ['required', 'string', 'max:120'],
            'emergency_contact_name' => ['required', 'string', 'max:120'],
            'emergency_contact_number' => ['required', 'string', 'max:20'],
            'vehicle_type' => ['required', Rule::in(['pedicab', 'tricycle', 'e-tricycle'])],
            'plate_number' => ['required', 'string', 'max:40'],
            'body_number' => ['nullable', 'string', 'max:40'],
            'color' => ['required', 'string', 'max:40'],
            'registration_expiry_date' => ['required', 'date', 'after:today'],
            'background_check_consent' => ['accepted'],
            'platform_rules_accepted' => ['accepted'],
            'profile_photo' => ['required', 'file', 'mimes:jpg,jpeg,png', 'max:4096'],
            'government_id_file' => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:4096'],
            'license_doc' => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:4096'],
            'toda_id_doc' => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:4096'],
            'franchise_permit_file' => ['nullable', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:4096'],
            'vehicle_photo' => ['required', 'file', 'mimes:jpg,jpeg,png', 'max:4096'],
            'orcr_file' => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:4096'],
        ]);

        $driver = DB::transaction(function () use ($data, $request): Driver {
            $fullName = trim(implode(' ', array_filter([
                $data['first_name'],
                $data['middle_name'] ?? null,
                $data['last_name'],
            ])));

            $user = User::create([
                'name' => $fullName,
                'first_name' => $data['first_name'],
                'middle_name' => $data['middle_name'] ?? null,
                'last_name' => $data['last_name'],
                'email' => $data['email'],
                'contact_number' => $data['contact_number'],
                'role' => 'driver',
                'is_verified' => false,
                'password' => $data['password'],
            ]);

            $driver = Driver::create([
                'user_id' => $user->id,
                'license_number' => $data['license_number'],
                'phone' => $data['phone'],
                'date_of_birth' => $data['date_of_birth'],
                'current_address' => $data['current_address'],
                'profile_photo' => $request->file('profile_photo')?->store('driver-documents', 'public'),
                'government_id_type' => $data['government_id_type'],
                'government_id_file' => $request->file('government_id_file')?->store('driver-documents', 'public'),
                'license_file' => $request->file('license_doc')?->store('driver-documents', 'public'),
                'license_expiry_date' => $data['license_expiry_date'],
                'license_restriction' => $data['license_restriction'],
                'toda_id_file' => $request->file('toda_id_doc')?->store('driver-documents', 'public'),
                'toda_id_number' => $data['toda_id_number'] ?? null,
                'toda_association' => $data['toda_association'],
                'franchise_permit_file' => $request->file('franchise_permit_file')?->store('driver-documents', 'public'),
                'emergency_contact_name' => $data['emergency_contact_name'],
                'emergency_contact_number' => $data['emergency_contact_number'],
                'background_check_consent' => true,
                'platform_rules_accepted' => true,
                'submitted_at' => now(),
                'approval_status' => 'pending',
                'status' => 'offline',
            ]);

            Vehicle::create([
                'driver_id' => $driver->id,
                'vehicle_type' => $data['vehicle_type'],
                'plate_number' => $data['plate_number'],
                'body_number' => $data['body_number'] ?? null,
                'color' => $data['color'],
                'vehicle_photo' => $request->file('vehicle_photo')?->store('driver-documents', 'public'),
                'orcr_file' => $request->file('orcr_file')?->store('driver-documents', 'public'),
                'registration_expiry_date' => $data['registration_expiry_date'],
            ]);

            return $driver;
        });

        return response()->json([
            'message' => 'Driver application submitted successfully. Please wait for admin approval.',
            'driver_id' => $driver->id,
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::query()
            ->where('email', $credentials['email'])
            ->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $redirectTo = match ($user->role) {
            'admin' => '/admin',
            'driver' => '/driver',
            default => '/passenger',
        };

        return response()->json([
            'message' => 'Login successful.',
            'redirect_to' => $redirectTo,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'is_verified' => $user->is_verified,
            ],
        ]);
    }
}
