<?php

namespace App\Models;

use App\Support\RoadRestrictionDefaults;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class PlatformSetting extends Model
{
    protected $fillable = [
        'key',
        'value',
    ];

    protected function casts(): array
    {
        return [
            'value' => 'array',
        ];
    }

    public static function fareRules(): array
    {
        return Cache::remember('platform.fare_rules', 300, function (): array {
            $stored = static::query()
                ->where('key', 'fare_rules')
                ->value('value');

            if (is_array($stored) && $stored !== []) {
                return $stored;
            }

            return static::defaultFareRules();
        });
    }

    public static function defaultFareRules(): array
    {
        return [
            'tricycle' => ['base' => 35.00, 'succeeding' => 14.00],
            'pedicab' => ['base' => 25.00, 'succeeding' => 10.00],
            'e-tricycle' => ['base' => 40.00, 'succeeding' => 16.00],
        ];
    }

    public static function updateFareRules(array $rules): void
    {
        static::query()->updateOrCreate(
            ['key' => 'fare_rules'],
            ['value' => $rules],
        );

        Cache::forget('platform.fare_rules');
    }

    /**
     * @return array<string, mixed>
     */
    public static function roadRestrictions(): array
    {
        return Cache::remember('platform.road_restrictions', 300, function (): array {
            $stored = static::query()
                ->where('key', 'road_restrictions')
                ->value('value');

            if (is_array($stored) && $stored !== []) {
                return $stored;
            }

            return RoadRestrictionDefaults::config();
        });
    }

    /**
     * @return array<string, mixed>
     */
    public static function defaultRoadRestrictions(): array
    {
        return RoadRestrictionDefaults::config();
    }

    public static function updateRoadRestrictions(array $rules): void
    {
        static::query()->updateOrCreate(
            ['key' => 'road_restrictions'],
            ['value' => $rules],
        );

        Cache::forget('platform.road_restrictions');
    }

    /**
     * @return array<string, mixed>
     */
    public static function systemConfig(): array
    {
        return Cache::remember('platform.system_config', 300, function (): array {
            $stored = static::query()
                ->where('key', 'system_config')
                ->value('value');

            if (is_array($stored) && $stored !== []) {
                return array_merge(static::defaultSystemConfig(), $stored);
            }

            return static::defaultSystemConfig();
        });
    }

    /**
     * @return array<string, mixed>
     */
    public static function defaultSystemConfig(): array
    {
        return [
            'platform_name' => 'TriWheel',
            'default_language' => 'en',
            'timezone' => 'Asia/Manila',
            'date_format' => 'en-PH',
            'currency_code' => 'PHP',
            'currency_symbol' => '₱',
        ];
    }

    public static function updateSystemConfig(array $config): void
    {
        static::query()->updateOrCreate(
            ['key' => 'system_config'],
            ['value' => array_merge(static::defaultSystemConfig(), $config)],
        );

        Cache::forget('platform.system_config');
    }

    /**
     * @return array<string, mixed>
     */
    public static function accessPolicy(): array
    {
        return Cache::remember('platform.access_policy', 300, function (): array {
            $stored = static::query()
                ->where('key', 'access_policy')
                ->value('value');

            if (is_array($stored) && $stored !== []) {
                return array_merge(static::defaultAccessPolicy(), $stored);
            }

            return static::defaultAccessPolicy();
        });
    }

    /**
     * @return array<string, mixed>
     */
    public static function defaultAccessPolicy(): array
    {
        return [
            'allow_passenger_registration' => true,
            'allow_driver_registration' => true,
            'require_driver_admin_approval' => true,
            'operators_can_suspend_users' => false,
            'operators_can_manage_reports' => true,
            'operators_can_approve_drivers' => true,
        ];
    }

    public static function updateAccessPolicy(array $policy): void
    {
        static::query()->updateOrCreate(
            ['key' => 'access_policy'],
            ['value' => array_merge(static::defaultAccessPolicy(), $policy)],
        );

        Cache::forget('platform.access_policy');
    }

    /**
     * @return list<array{id: string, name: string, lgu: string}>
     */
    public static function serviceZoneOptions(): array
    {
        return collect(static::roadRestrictions()['zones'] ?? [])
            ->filter(fn (array $zone): bool => (bool) ($zone['enabled'] ?? true))
            ->map(fn (array $zone): array => [
                'id' => (string) $zone['id'],
                'name' => (string) $zone['name'],
                'lgu' => (string) ($zone['lgu'] ?? ''),
            ])
            ->values()
            ->all();
    }
}
