<?php

namespace Database\Seeders;

use App\Models\PlatformSetting;
use Illuminate\Database\Seeder;

class PlatformSettingsSeeder extends Seeder
{
    public function run(): void
    {
        PlatformSetting::query()->updateOrCreate(
            ['key' => 'fare_rules'],
            ['value' => PlatformSetting::defaultFareRules()],
        );

        PlatformSetting::query()->updateOrCreate(
            ['key' => 'road_restrictions'],
            ['value' => PlatformSetting::defaultRoadRestrictions()],
        );

        PlatformSetting::query()->updateOrCreate(
            ['key' => 'system_config'],
            ['value' => PlatformSetting::defaultSystemConfig()],
        );

        PlatformSetting::query()->updateOrCreate(
            ['key' => 'access_policy'],
            ['value' => PlatformSetting::defaultAccessPolicy()],
        );
    }
}
