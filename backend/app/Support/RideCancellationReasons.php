<?php

namespace App\Support;

class RideCancellationReasons
{
    public const PASSENGER_CODES = [
        'changed_plans',
        'wrong_location',
        'wait_too_long',
        'found_another_ride',
        'driver_unavailable',
        'booked_by_mistake',
        'other',
    ];

    public const DRIVER_CODES = [
        'passenger_no_show',
        'wrong_location',
        'vehicle_issue',
        'personal_emergency',
        'passenger_requested',
        'unsafe_conditions',
        'other',
    ];

    /**
     * @return array<string, string>
     */
    public static function passengerLabels(): array
    {
        return [
            'changed_plans' => 'Change of plans',
            'wrong_location' => 'Wrong pickup or drop-off',
            'wait_too_long' => 'Wait time was too long',
            'found_another_ride' => 'Found another ride',
            'driver_unavailable' => 'Driver was unavailable',
            'booked_by_mistake' => 'Booked by mistake',
            'other' => 'Other reason',
        ];
    }

    /**
     * @return array<string, string>
     */
    public static function driverLabels(): array
    {
        return [
            'passenger_no_show' => 'Passenger no-show',
            'wrong_location' => 'Incorrect pickup or drop-off',
            'vehicle_issue' => 'Vehicle problem',
            'personal_emergency' => 'Personal emergency',
            'passenger_requested' => 'Passenger requested cancellation',
            'unsafe_conditions' => 'Unsafe conditions',
            'other' => 'Other reason',
        ];
    }

    public static function label(string $code, string $actor = 'passenger'): string
    {
        $labels = $actor === 'driver'
            ? static::driverLabels()
            : static::passengerLabels();

        return $labels[$code] ?? $code;
    }

    public static function resolveMessage(string $code, ?string $detail = null, string $actor = 'passenger'): string
    {
        if ($code === 'other') {
            return trim((string) $detail);
        }

        return static::label($code, $actor);
    }
}
