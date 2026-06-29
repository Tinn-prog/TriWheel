<?php

namespace App\Support;

use App\Models\Driver;
use App\Models\Ride;
use App\Models\RideReport;

class RideReportReasons
{
    public const PASSENGER_CODES = [
        'rude_behavior',
        'unsafe_driving',
        'wrong_route',
        'vehicle_condition',
        'harassment',
        'fare_dispute',
        'no_show',
        'other',
    ];

    public const DRIVER_CODES = [
        'rude_behavior',
        'harassment',
        'no_show',
        'wrong_location',
        'unsafe_behavior',
        'fare_dispute',
        'other',
    ];

    public const REPORTABLE_STATUSES = [
        'accepted',
        'ongoing',
        'completed',
        'cancelled',
    ];

    /**
     * @return array<string, string>
     */
    public static function passengerLabels(): array
    {
        return [
            'rude_behavior' => 'Rude or disrespectful behavior',
            'unsafe_driving' => 'Unsafe driving',
            'wrong_route' => 'Wrong route or detour',
            'vehicle_condition' => 'Poor vehicle condition',
            'harassment' => 'Harassment or threats',
            'fare_dispute' => 'Fare dispute',
            'no_show' => 'Driver never arrived',
            'other' => 'Other concern',
        ];
    }

    /**
     * @return array<string, string>
     */
    public static function driverLabels(): array
    {
        return [
            'rude_behavior' => 'Rude or disrespectful behavior',
            'harassment' => 'Harassment or threats',
            'no_show' => 'Passenger no-show',
            'wrong_location' => 'Wrong pickup information',
            'unsafe_behavior' => 'Unsafe or disruptive behavior',
            'fare_dispute' => 'Fare payment dispute',
            'other' => 'Other concern',
        ];
    }

    public static function label(string $code, string $reporterRole): string
    {
        $labels = $reporterRole === 'driver'
            ? static::driverLabels()
            : static::passengerLabels();

        return $labels[$code] ?? $code;
    }

    public static function resolveMessage(string $code, ?string $detail, string $reporterRole): string
    {
        if ($code === 'other') {
            return trim((string) $detail);
        }

        return static::label($code, $reporterRole);
    }

    public static function severity(string $code): string
    {
        if (in_array($code, ['harassment', 'unsafe_driving', 'unsafe_behavior'], true)) {
            return 'critical';
        }

        if ($code === 'no_show') {
            return 'high';
        }

        if (in_array($code, ['rude_behavior', 'wrong_route', 'vehicle_condition', 'wrong_location'], true)) {
            return 'medium';
        }

        return 'low';
    }

    public static function viewerFlags(Ride $ride, \App\Models\User $user, ?Driver $driver = null): array
    {
        $reportSubmitted = RideReport::query()
            ->where('ride_id', $ride->id)
            ->where('reporter_user_id', $user->id)
            ->exists();

        $canReport = false;

        if (
            ! $reportSubmitted
            && in_array($ride->status, static::REPORTABLE_STATUSES, true)
            && filled($ride->driver_id)
        ) {
            if ((int) $ride->passenger_id === (int) $user->id) {
                $canReport = true;
            } elseif ($driver && (int) $ride->driver_id === (int) $driver->id) {
                $canReport = true;
            }
        }

        return [
            'can_report' => $canReport,
            'report_submitted' => $reportSubmitted,
        ];
    }
}
