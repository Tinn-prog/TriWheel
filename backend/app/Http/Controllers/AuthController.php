<?php

namespace App\Http\Controllers;

use App\Mail\TriWheelAlertMail;
use App\Models\Driver;
use App\Models\Ride;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\PlatformSetting;
use App\Services\DriverSuspensionService;
use App\Services\EmailVerificationService;
use App\Services\NotificationService;
use App\Services\PasswordChangeLimitService;
use App\Services\ProfileChangeLimitService;
use App\Support\DocumentUrl;
use App\Support\RideCancellationReasons;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(
        private readonly NotificationService $notifications,
        private readonly ProfileChangeLimitService $profileChangeLimits,
        private readonly PasswordChangeLimitService $passwordChangeLimits,
        private readonly EmailVerificationService $emailVerification,
    ) {}

    public function registerPassenger(Request $request): JsonResponse
    {
        if (! PlatformSetting::accessPolicy()['allow_passenger_registration']) {
            return response()->json([
                'message' => 'Passenger registration is currently closed by the platform administrator.',
            ], 403);
        }

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
            'terms_accepted' => ['accepted'],
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
            'terms_accepted_at' => now(),
            'safety_terms_accepted' => true,
            'submitted_at' => now(),
            'role' => 'passenger',
            'is_verified' => true,
            'password' => $data['password'],
        ]);

        $this->emailVerification->sendVerification($user);

        $this->notifications->notify(
            $user,
            'passenger.application_received',
            'Passenger account created',
            'Your TriWheel passenger account is ready. Log in to book rides on the platform.',
            '/passenger',
        );

        $admins = User::query()
            ->where('role', 'admin')
            ->where('is_suspended', false)
            ->get();

        $this->notifications->notifyMany(
            $admins,
            'passenger.application_submitted',
            'New passenger registration',
            sprintf('%s created a passenger account.', $user->name),
            '/admin/passengers',
        );

        return response()->json([
            'message' => 'Passenger account created successfully. Please check your email to verify your address before logging in.',
            'user_id' => $user->id,
        ], 201);
    }

    public function registerDriver(Request $request): JsonResponse
    {
        if (! PlatformSetting::accessPolicy()['allow_driver_registration']) {
            return response()->json([
                'message' => 'Driver registration is currently closed by the platform administrator.',
            ], 403);
        }

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
            'lgu' => ['required', 'string', 'max:120'],
            'mtop_number' => ['required', 'string', 'max:80'],
            'service_zone_id' => ['nullable', 'string', 'max:80'],
            'emergency_contact_name' => ['required', 'string', 'max:120'],
            'emergency_contact_number' => ['required', 'string', 'max:20'],
            'vehicle_type' => ['required', Rule::in(['pedicab', 'tricycle', 'e-tricycle'])],
            'plate_number' => ['required', 'string', 'max:40'],
            'body_number' => ['nullable', 'string', 'max:40'],
            'color' => ['required', 'string', 'max:40'],
            'registration_expiry_date' => ['required', 'date', 'after:today'],
            'background_check_consent' => ['accepted'],
            'platform_rules_accepted' => ['accepted'],
            'terms_accepted' => ['accepted'],
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
                'terms_accepted_at' => now(),
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
                'lgu' => $data['lgu'],
                'mtop_number' => $data['mtop_number'],
                'service_zone_id' => $data['service_zone_id'] ?? null,
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

        $driver->load('user');

        if ($driver->user) {
            $this->emailVerification->sendVerification($driver->user);

            $this->notifications->notify(
                $driver->user,
                'driver.application_received',
                'Driver application received',
                'We received your TriWheel driver application. Our team will review your documents and email you once your application is approved or rejected.',
                '/driver',
            );
        }

        $admins = User::query()
            ->where('role', 'admin')
            ->where('is_suspended', false)
            ->get();

        $this->notifications->notifyMany(
            $admins,
            'driver.application_submitted',
            'New driver application',
            sprintf(
                '%s submitted a driver application. Review license, vehicle, and documents.',
                $driver->user?->name ?? 'A driver',
            ),
            '/admin/drivers',
        );

        return response()->json([
            'message' => 'Driver application submitted successfully. Please check your email to verify your address before logging in.',
            'driver_id' => $driver->id,
        ], 201);
    }

    public function showProfile(Request $request): JsonResponse
    {
        $data = $request->validate([
            'user_id' => ['required', 'integer', Rule::exists('users', 'id')],
        ]);

        $user = User::query()->findOrFail((int) $data['user_id']);

        return response()->json([
            'user' => $this->serializeUser($user),
            'profile_change_limit' => $this->profileChangeLimits->summaryFor($user),
            'password_change_limit' => $this->passwordChangeLimits->summaryFor($user),
        ]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $data = $request->validate([
            'user_id' => ['required', 'integer', Rule::exists('users', 'id')],
            'name' => ['sometimes', 'string', 'max:255'],
            'first_name' => ['sometimes', 'string', 'max:80'],
            'middle_name' => ['nullable', 'string', 'max:80'],
            'last_name' => ['sometimes', 'string', 'max:80'],
            'email' => ['sometimes', 'email', 'max:255'],
            'contact_number' => ['nullable', 'string', 'max:30'],
            'current_address' => ['sometimes', 'string', 'max:255'],
            'phone' => ['sometimes', 'string', 'max:20'],
            'profile_photo' => ['sometimes', 'file', 'mimes:jpg,jpeg,png', 'max:4096'],
            'profile_photo_base64' => ['sometimes', 'string'],
            'profile_photo_name' => ['nullable', 'string', 'max:255'],
        ]);

        $user = User::query()->findOrFail((int) $data['user_id']);
        $driver = $user->role === 'driver'
            ? Driver::query()->where('user_id', $user->id)->first()
            : null;

        $hasPhotoChange = $request->hasFile('profile_photo')
            || ! empty($data['profile_photo_base64']);

        $detailChanges = $this->detectProfileDetailChanges($user, $driver, $data, $hasPhotoChange);

        if (
            $detailChanges !== []
            && $this->profileChangeLimits->appliesTo($user)
            && ! $this->profileChangeLimits->canChangeDetails($user->id)
        ) {
            return response()->json([
                'message' => 'You have reached the limit of 2 profile detail updates for this month.',
                'profile_change_limit' => $this->profileChangeLimits->summaryFor($user),
            ], 422);
        }

        if (isset($data['email'])) {
            $emailTaken = User::query()
                ->where('email', $data['email'])
                ->where('id', '!=', $user->id)
                ->exists();

            if ($emailTaken) {
                return response()->json([
                    'message' => 'That email is already in use.',
                ], 422);
            }
        }

        if (isset($data['first_name']) || isset($data['last_name']) || array_key_exists('middle_name', $data)) {
            $firstName = $data['first_name'] ?? $user->first_name ?? '';
            $middleName = array_key_exists('middle_name', $data)
                ? ($data['middle_name'] ?? null)
                : $user->middle_name;
            $lastName = $data['last_name'] ?? $user->last_name ?? '';

            $user->first_name = $firstName;
            $user->middle_name = $middleName;
            $user->last_name = $lastName;
            $user->name = trim(implode(' ', array_filter([$firstName, $middleName, $lastName])));
        } elseif (isset($data['name'])) {
            $user->name = $data['name'];
        }

        if (array_key_exists('contact_number', $data)) {
            $user->contact_number = $data['contact_number'];
        }

        if (isset($data['email'])) {
            $user->email = $data['email'];
        }

        if (isset($data['current_address'])) {
            $user->current_address = $data['current_address'];

            if ($driver) {
                $driver->current_address = $data['current_address'];
            }
        }

        if ($request->hasFile('profile_photo')) {
            $this->assignProfilePhotoPath(
                $user,
                $driver,
                $request->file('profile_photo')->store(
                    $user->role === 'driver' ? 'driver-documents' : 'passenger-documents',
                    'public',
                ),
            );
        } elseif (! empty($data['profile_photo_base64'])) {
            if (empty($data['profile_photo_name'])) {
                throw ValidationException::withMessages([
                    'profile_photo_name' => ['Profile photo filename is required.'],
                ]);
            }

            $this->storeProfilePhotoFromBase64(
                $user,
                $driver,
                $data['profile_photo_base64'],
                $data['profile_photo_name'] ?? 'profile.jpg',
            );
        }

        if (isset($data['phone']) && $driver) {
            $driver->phone = $data['phone'];
            $driver->save();
        }

        $user->save();

        if ($detailChanges !== [] && $this->profileChangeLimits->appliesTo($user)) {
            $this->profileChangeLimits->record($user, $detailChanges);
        }

        return response()->json([
            'message' => 'Profile updated successfully.',
            'user' => $this->serializeUser($user->refresh()),
            'profile_change_limit' => $this->profileChangeLimits->summaryFor($user),
            'changed_fields' => $detailChanges,
        ]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'user_id' => ['required', 'integer', Rule::exists('users', 'id')],
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:6', 'confirmed'],
        ]);

        $user = User::query()->findOrFail((int) $data['user_id']);

        if (! $this->passwordChangeLimits->canChangePassword($user->id)) {
            return response()->json([
                'message' => 'You have reached the limit of 2 password changes for this month.',
                'password_change_limit' => $this->passwordChangeLimits->summaryFor($user),
            ], 422);
        }

        if (! Hash::check($data['current_password'], $user->password)) {
            return response()->json([
                'message' => 'Current password is incorrect.',
            ], 422);
        }

        if (Hash::check($data['password'], $user->password)) {
            return response()->json([
                'message' => 'Choose a password that is different from your current one.',
            ], 422);
        }

        $user->password = $data['password'];
        $user->save();

        $this->passwordChangeLimits->record($user);

        return response()->json([
            'message' => 'Password updated successfully.',
            'password_change_limit' => $this->passwordChangeLimits->summaryFor($user),
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return list<array{field: string, label: string, old_value: ?string, new_value: ?string}>
     */
    private function detectProfileDetailChanges(
        User $user,
        ?Driver $driver,
        array $data,
        bool $hasPhotoChange,
    ): array {
        $changes = [];

        $compare = function (
            string $field,
            string $label,
            ?string $oldValue,
            ?string $newValue,
        ) use (&$changes): void {
            $normalizedOld = trim((string) ($oldValue ?? ''));
            $normalizedNew = trim((string) ($newValue ?? ''));

            if ($normalizedOld === $normalizedNew) {
                return;
            }

            $changes[] = [
                'field' => $field,
                'label' => $label,
                'old_value' => $normalizedOld === '' ? null : $normalizedOld,
                'new_value' => $normalizedNew === '' ? null : $normalizedNew,
            ];
        };

        if (isset($data['first_name']) || isset($data['last_name']) || array_key_exists('middle_name', $data)) {
            $firstName = $data['first_name'] ?? $user->first_name ?? '';
            $middleName = array_key_exists('middle_name', $data)
                ? ($data['middle_name'] ?? '')
                : ($user->middle_name ?? '');
            $lastName = $data['last_name'] ?? $user->last_name ?? '';

            $compare('first_name', 'First name', $user->first_name, $firstName);
            $compare('middle_name', 'Middle name', $user->middle_name, $middleName);
            $compare('last_name', 'Last name', $user->last_name, $lastName);
        } elseif (isset($data['name'])) {
            $compare('name', 'Full name', $user->name, $data['name']);
        }

        if (array_key_exists('contact_number', $data)) {
            $compare('contact_number', 'Contact number', $user->contact_number, $data['contact_number']);
        }

        if (isset($data['email'])) {
            $compare('email', 'Email address', $user->email, $data['email']);
        }

        if (isset($data['current_address'])) {
            $currentAddress = $driver?->current_address ?? $user->current_address;
            $compare('current_address', 'Current address', $currentAddress, $data['current_address']);
        }

        if (isset($data['phone']) && $driver) {
            $compare('phone', 'Driver phone', $driver->phone, $data['phone']);
        }

        if ($hasPhotoChange) {
            $changes[] = [
                'field' => 'profile_photo',
                'label' => 'Profile photo',
                'old_value' => 'Previous photo',
                'new_value' => 'New photo',
            ];
        }

        return $changes;
    }

    private function assignProfilePhotoPath(User $user, ?Driver $driver, string $storedPath): void
    {
        if ($driver) {
            $this->deletePublicFile($driver->profile_photo);
            $driver->profile_photo = $storedPath;
            $driver->save();
        } else {
            $this->deletePublicFile($user->profile_photo);
            $user->profile_photo = $storedPath;
        }
    }

    private function storeProfilePhotoFromBase64(
        User $user,
        ?Driver $driver,
        string $base64,
        string $filename,
    ): void {
        $normalized = preg_replace('#^data:image/\w+;base64,#i', '', $base64) ?? $base64;
        $binary = base64_decode($normalized, true);

        if ($binary === false) {
            throw ValidationException::withMessages([
                'profile_photo_base64' => ['Invalid profile photo data.'],
            ]);
        }

        if (strlen($binary) > 4 * 1024 * 1024) {
            throw ValidationException::withMessages([
                'profile_photo_base64' => ['Profile photo must be 4MB or smaller.'],
            ]);
        }

        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));

        if (! in_array($extension, ['jpg', 'jpeg', 'png'], true)) {
            $extension = 'jpg';
        }

        $folder = $user->role === 'driver' ? 'driver-documents' : 'passenger-documents';
        $path = $folder.'/'.Str::uuid().'.'.$extension;

        Storage::disk('public')->put($path, $binary);
        $this->assignProfilePhotoPath($user, $driver, $path);
    }

    private function deletePublicFile(?string $path): void
    {
        if (! $path || str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return;
        }

        if (Storage::disk('public')->exists($path)) {
            Storage::disk('public')->delete($path);
        }
    }

    private function serializeUser(User $user): array
    {
        $driver = $user->role === 'driver'
            ? Driver::query()->where('user_id', $user->id)->first()
            : null;

        $profilePhotoPath = $user->profile_photo;

        if ($driver?->profile_photo) {
            $profilePhotoPath = $driver->profile_photo;
        }

        return [
            'id' => $user->id,
            'name' => $user->name,
            'first_name' => $user->first_name,
            'middle_name' => $user->middle_name,
            'last_name' => $user->last_name,
            'email' => $user->email,
            'role' => $user->role,
            'admin_role' => $user->admin_role,
            'contact_number' => $user->contact_number,
            'current_address' => $driver?->current_address ?? $user->current_address,
            'phone' => $driver?->phone,
            'is_verified' => $user->is_verified,
            'profile_photo_url' => DocumentUrl::from($profilePhotoPath),
        ];
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:255'],
        ]);

        $user = User::query()->where('email', $data['email'])->first();

        if ($user) {
            $token = bin2hex(random_bytes(32));

            $user->forceFill([
                'reset_token' => $token,
                'reset_expiry' => now()->addHours(2),
            ])->save();

            $resetUrl = $this->frontendUrl('/reset-password?token='.$token);

            try {
                Mail::to($user->email)->send(new TriWheelAlertMail(
                    recipientName: $user->name ?? 'TriWheel user',
                    mailSubject: 'Reset your TriWheel password',
                    headline: 'Password reset requested',
                    bodyText: "We received a request to reset your TriWheel password. Use the button below to choose a new password. This link expires in 2 hours.\n\nIf you did not request this, you can ignore this email.",
                    actionUrl: $resetUrl,
                    actionLabel: 'Reset Password',
                ));
            } catch (\Throwable $exception) {
                report($exception);
            }
        }

        return response()->json([
            'message' => 'If an account exists for that email, a password reset link has been sent.',
        ]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
            'password' => ['required', 'string', 'min:6', 'confirmed'],
        ]);

        $user = User::query()
            ->where('reset_token', $data['token'])
            ->where('reset_expiry', '>', now())
            ->first();

        if (! $user) {
            return response()->json([
                'message' => 'This reset link is invalid or has expired. Please request a new password reset.',
            ], 422);
        }

        $user->forceFill([
            'password' => $data['password'],
            'reset_token' => null,
            'reset_expiry' => null,
        ])->save();

        return response()->json([
            'message' => 'Password updated successfully. You can log in with your new password.',
        ]);
    }

    public function verifyEmail(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
        ]);

        $user = $this->emailVerification->verify($data['token']);

        if (! $user) {
            return response()->json([
                'message' => 'This verification link is invalid or has expired. Please request a new verification email.',
            ], 422);
        }

        return response()->json([
            'message' => 'Email verified successfully. You can now log in to TriWheel.',
            'role' => $user->role,
            'email' => $user->email,
        ]);
    }

    public function resendEmailVerification(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:255'],
        ]);

        $user = User::query()->where('email', $data['email'])->first();

        if ($user && ! $user->email_verified_at) {
            $this->emailVerification->sendVerification($user);
        }

        return response()->json([
            'message' => 'If an unverified account exists for that email, a new verification link has been sent.',
        ]);
    }

    private function frontendUrl(string $path): string
    {
        $configured = trim(explode(',', (string) config('app.frontend_url', 'http://localhost:3000'))[0]);

        return rtrim($configured, '/').'/'.ltrim($path, '/');
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'remember' => ['sometimes', 'boolean'],
            'portal' => ['sometimes', Rule::in(['admin', 'superadmin'])],
        ]);

        $user = User::query()
            ->where('email', $credentials['email'])
            ->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if (! $user->email_verified_at) {
            throw ValidationException::withMessages([
                'email' => ['Please verify your email address before logging in. Check your inbox for the verification link.'],
            ]);
        }

        if ($user->is_suspended && $user->role !== 'driver') {
            throw ValidationException::withMessages([
                'email' => [$user->suspension_reason ?: 'This account has been suspended.'],
            ]);
        }

        if ($user->role === 'admin' && isset($credentials['portal'])) {
            $isSuperAdmin = $user->admin_role === 'super_admin';

            if ($credentials['portal'] === 'superadmin' && ! $isSuperAdmin) {
                throw ValidationException::withMessages([
                    'email' => ['This account does not have super admin access. Use the admin operator login instead.'],
                ]);
            }

            if ($credentials['portal'] === 'admin' && $isSuperAdmin) {
                throw ValidationException::withMessages([
                    'email' => ['Super admin accounts must use the Super Admin login.'],
                ]);
            }
        }

        $suspension = null;

        if ($user->is_suspended && $user->role === 'driver') {
            $suspension = app(DriverSuspensionService::class)->suspensionState($user->refresh());
        }

        $remember = (bool) ($credentials['remember'] ?? false);
        $tokenExpiresAt = $remember ? now()->addDays(30) : now()->addHours(12);
        $token = $user->createToken('triwheel-api', ['*'], $tokenExpiresAt)->plainTextToken;

        $redirectTo = match ($user->role) {
            'admin' => $user->admin_role === 'super_admin' ? '/superadmin' : '/admin',
            'driver' => '/driver',
            default => '/passenger',
        };

        return response()->json([
            'message' => 'Login successful.',
            'redirect_to' => $redirectTo,
            'token' => $token,
            'user' => array_merge($this->serializeUser($user), [
                'is_suspended' => (bool) $user->is_suspended,
                'suspension' => $suspension,
            ]),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $data = $request->validate([
            'user_id' => ['required', 'integer', Rule::exists('users', 'id')],
        ]);

        $user = User::query()->with('driver')->findOrFail($data['user_id']);

        if ($user->driver && $user->driver->status === 'online') {
            $user->driver->update([
                'status' => 'offline',
                'queue_position' => null,
                'current_lat' => null,
                'current_lng' => null,
                'location_updated_at' => null,
            ]);
        }

        if ($user->role === 'passenger') {
            $this->cancelPassengerRideSearchesOnLogout($user);
        }

        $user->tokens()->delete();

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }

    private function cancelPassengerRideSearchesOnLogout(User $user): void
    {
        $rides = Ride::query()
            ->with(['driver.user:id,name', 'offers.driver.user:id,name', 'passenger:id,name'])
            ->where('passenger_id', $user->id)
            ->whereIn('status', ['requested', 'accepted'])
            ->get();

        if ($rides->isEmpty()) {
            return;
        }

        $reasonMessage = RideCancellationReasons::resolveMessage('passenger_logged_out');

        foreach ($rides as $ride) {
            $assignedDriver = $ride->driver;
            $passengerName = $ride->passenger?->name ?? 'A passenger';

            $ride->update([
                'status' => 'cancelled',
                'cancelled_by' => 'passenger',
                'cancellation_reason_code' => 'passenger_logged_out',
                'cancellation_reason' => $reasonMessage,
            ]);

            $ride->offers()
                ->whereIn('status', ['pending', 'accepted'])
                ->update(['status' => 'cancelled']);

            $notificationBody = "{$passengerName} cancelled ride #{$ride->id}. Reason: {$reasonMessage}";
            $notifiedUserIds = [];

            if ($assignedDriver?->user) {
                $this->notifications->notify(
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

                $this->notifications->notify(
                    $driverUser,
                    'ride.cancelled',
                    'Ride request cancelled',
                    $notificationBody,
                    '/driver',
                );
                $notifiedUserIds[] = $driverUser->id;
            }
        }
    }
}
