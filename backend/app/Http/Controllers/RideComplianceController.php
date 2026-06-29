<?php

namespace App\Http\Controllers;

use App\Models\PlatformSetting;
use App\Services\RoadRestrictionService;
use App\Support\RideTypes;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RideComplianceController extends Controller
{
    public function serviceZones(): JsonResponse
    {
        return response()->json([
            'zones' => PlatformSetting::serviceZoneOptions(),
        ]);
    }

    public function check(Request $request, RoadRestrictionService $roadRestrictions): JsonResponse
    {
        $data = $request->validate([
            'ride_type' => ['nullable', 'string', 'max:40'],
            'pickup_lat' => ['nullable', 'numeric'],
            'pickup_lng' => ['nullable', 'numeric'],
            'dropoff_lat' => ['nullable', 'numeric'],
            'dropoff_lng' => ['nullable', 'numeric'],
            'is_emergency' => ['sometimes', 'boolean'],
        ]);

        $result = $roadRestrictions->checkRide(
            RideTypes::normalize($data['ride_type'] ?? null),
            isset($data['pickup_lat']) ? (float) $data['pickup_lat'] : null,
            isset($data['pickup_lng']) ? (float) $data['pickup_lng'] : null,
            isset($data['dropoff_lat']) ? (float) $data['dropoff_lat'] : null,
            isset($data['dropoff_lng']) ? (float) $data['dropoff_lng'] : null,
            (bool) ($data['is_emergency'] ?? false),
        );

        return response()->json($result);
    }
}
