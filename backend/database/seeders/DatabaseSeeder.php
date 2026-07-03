<?php

namespace Database\Seeders;

use App\Models\Driver;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $password = Hash::make('password123');
        $verifiedAt = now();

        $this->seedTestUser([
            'email' => 'admin@triwheel.test',
        ], [
            'name' => 'TriWheel Super Admin',
            'first_name' => 'TriWheel',
            'middle_name' => null,
            'last_name' => 'Super Admin',
            'contact_number' => '09170000001',
            'role' => 'admin',
            'admin_role' => 'super_admin',
            'is_verified' => true,
            'password' => $password,
        ], $verifiedAt);

        $this->seedTestUser([
            'email' => 'operator@triwheel.test',
        ], [
            'name' => 'TriWheel Admin Operator',
            'first_name' => 'TriWheel',
            'middle_name' => null,
            'last_name' => 'Operator',
            'contact_number' => '09170000004',
            'role' => 'admin',
            'admin_role' => 'operator',
            'is_verified' => true,
            'password' => $password,
        ], $verifiedAt);

        $this->seedTestUser([
            'email' => 'passenger@triwheel.test',
        ], [
            'name' => 'Pat Passenger',
            'first_name' => 'Pat',
            'middle_name' => null,
            'last_name' => 'Passenger',
            'contact_number' => '09170000002',
            'role' => 'passenger',
            'is_verified' => true,
            'password' => $password,
        ], $verifiedAt);

        $driverUser = $this->seedTestUser([
            'email' => 'driver@triwheel.test',
        ], [
            'name' => 'Drew Driver',
            'first_name' => 'Drew',
            'middle_name' => null,
            'last_name' => 'Driver',
            'contact_number' => '09170000003',
            'role' => 'driver',
            'is_verified' => true,
            'password' => $password,
        ], $verifiedAt);

        $driver = Driver::updateOrCreate([
            'user_id' => $driverUser->id,
        ], [
            'license_number' => 'DRV-TEST-001',
            'phone' => '09170000003',
            'license_file' => 'seeded/driver-license.pdf',
            'toda_id_file' => 'seeded/toda-id.pdf',
            'approval_status' => 'approved',
            'status' => 'offline',
            'queue_position' => null,
            'rejection_reason' => null,
        ]);

        Vehicle::updateOrCreate([
            'driver_id' => $driver->id,
        ], [
            'vehicle_type' => 'tricycle',
            'plate_number' => 'TRI-001',
            'color' => 'Orange',
        ]);

        $this->call(PlatformSettingsSeeder::class);
    }

    /**
     * @param  array<string, mixed>  $keys
     * @param  array<string, mixed>  $values
     */
    private function seedTestUser(array $keys, array $values, \DateTimeInterface $verifiedAt): User
    {
        $user = User::updateOrCreate($keys, $values);

        if (! $user->email_verified_at) {
            $user->forceFill(['email_verified_at' => $verifiedAt])->save();
        }

        return $user;
    }
}
