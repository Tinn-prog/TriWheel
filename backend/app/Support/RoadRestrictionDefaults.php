<?php

namespace App\Support;

class RoadRestrictionDefaults
{
    /**
     * @return array<string, mixed>
     */
    public static function config(): array
    {
        return [
            'enforce_corridors' => true,
            'enforce_zones' => true,
            'emergency_bypass' => true,
            'require_coordinates' => false,
            'corridors' => [
                [
                    'id' => 'edsa',
                    'name' => 'EDSA',
                    'enabled' => true,
                    'bounds' => [
                        'south' => 14.548,
                        'north' => 14.672,
                        'west' => 121.028,
                        'east' => 121.058,
                    ],
                    'rules' => [
                        'pedicab' => 'block',
                        'tricycle' => 'warn',
                        'e-tricycle' => 'block',
                    ],
                ],
                [
                    'id' => 'c5',
                    'name' => 'C-5 Road',
                    'enabled' => true,
                    'bounds' => [
                        'south' => 14.48,
                        'north' => 14.72,
                        'west' => 121.06,
                        'east' => 121.10,
                    ],
                    'rules' => [
                        'pedicab' => 'block',
                        'tricycle' => 'warn',
                        'e-tricycle' => 'block',
                    ],
                ],
                [
                    'id' => 'roxas',
                    'name' => 'Roxas Boulevard',
                    'enabled' => true,
                    'bounds' => [
                        'south' => 14.52,
                        'north' => 14.59,
                        'west' => 120.97,
                        'east' => 121.00,
                    ],
                    'rules' => [
                        'pedicab' => 'block',
                        'tricycle' => 'warn',
                        'e-tricycle' => 'block',
                    ],
                ],
                [
                    'id' => 'taft',
                    'name' => 'Taft Avenue',
                    'enabled' => true,
                    'bounds' => [
                        'south' => 14.53,
                        'north' => 14.62,
                        'west' => 120.99,
                        'east' => 121.02,
                    ],
                    'rules' => [
                        'pedicab' => 'block',
                        'tricycle' => 'warn',
                        'e-tricycle' => 'block',
                    ],
                ],
                [
                    'id' => 'national-highway',
                    'name' => 'National Highway (high-speed roads)',
                    'enabled' => true,
                    'bounds' => [
                        'south' => 14.45,
                        'north' => 14.78,
                        'west' => 120.90,
                        'east' => 121.15,
                    ],
                    'rules' => [
                        'pedicab' => 'block',
                        'tricycle' => 'block',
                        'e-tricycle' => 'warn',
                    ],
                    'match_mode' => 'route_only',
                ],
            ],
            'zones' => [
                [
                    'id' => 'ncr-local',
                    'name' => 'Metro Manila local streets',
                    'lgu' => 'Metro Manila',
                    'enabled' => true,
                    'vehicle_types' => ['tricycle', 'pedicab', 'e-tricycle'],
                    'polygon' => [
                        [14.47, 120.92],
                        [14.47, 121.12],
                        [14.75, 121.12],
                        [14.75, 120.92],
                    ],
                ],
            ],
        ];
    }
}
