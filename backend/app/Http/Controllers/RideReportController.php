<?php

namespace App\Http\Controllers;

use App\Models\Driver;
use App\Models\Ride;
use App\Models\RideReport;
use App\Models\User;
use App\Services\NotificationService;
use App\Support\RideReportReasons;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RideReportController extends Controller
{
    public function store(
        Request $request,
        Ride $ride,
        NotificationService $notifications,
    ): JsonResponse {
        $data = $request->validate([
            'user_id' => ['required', 'integer'],
            'report_reason_code' => ['required', 'string'],
            'report_reason_detail' => ['nullable', 'string', 'max:500'],
        ]);

        $user = User::query()->find($data['user_id']);

        if (! $user) {
            return response()->json(['message' => 'User not found.'], 404);
        }

        if (! in_array($ride->status, RideReportReasons::REPORTABLE_STATUSES, true)) {
            return response()->json([
                'message' => 'This ride cannot be reported yet.',
            ], 422);
        }

        $reporterRole = null;
        $reportedUser = null;

        if ((int) $ride->passenger_id === (int) $user->id) {
            $reporterRole = 'passenger';
            $ride->loadMissing('driver.user:id,name');
            $reportedUser = $ride->driver?->user;
        } else {
            $driver = Driver::query()->where('user_id', $user->id)->first();

            if ($driver && (int) $ride->driver_id === (int) $driver->id) {
                $reporterRole = 'driver';
                $ride->loadMissing('passenger:id,name');
                $reportedUser = $ride->passenger;
            }
        }

        if (! $reporterRole || ! $reportedUser) {
            return response()->json([
                'message' => 'You are not allowed to report on this ride.',
            ], 403);
        }

        $allowedCodes = $reporterRole === 'driver'
            ? RideReportReasons::DRIVER_CODES
            : RideReportReasons::PASSENGER_CODES;

        if (! in_array($data['report_reason_code'], $allowedCodes, true)) {
            return response()->json([
                'message' => 'Please choose a valid report reason.',
            ], 422);
        }

        if ($data['report_reason_code'] === 'other' && blank($data['report_reason_detail'] ?? null)) {
            return response()->json([
                'message' => 'Please describe your report.',
            ], 422);
        }

        if (RideReport::query()
            ->where('ride_id', $ride->id)
            ->where('reporter_user_id', $user->id)
            ->exists()) {
            return response()->json([
                'message' => 'You already submitted a report for this ride.',
            ], 422);
        }

        $reasonMessage = RideReportReasons::resolveMessage(
            $data['report_reason_code'],
            $data['report_reason_detail'] ?? null,
            $reporterRole,
        );

        $report = RideReport::query()->create([
            'ride_id' => $ride->id,
            'reporter_user_id' => $user->id,
            'reported_user_id' => $reportedUser->id,
            'reporter_role' => $reporterRole,
            'report_reason_code' => $data['report_reason_code'],
            'report_reason' => $reasonMessage,
            'status' => 'pending',
        ]);

        $reporterName = $user->name ?? 'A user';
        $reportedName = $reportedUser->name ?? 'a user';
        $roleLabel = $reporterRole === 'driver' ? 'driver' : 'passenger';

        $admins = User::query()
            ->where('role', 'admin')
            ->where('is_suspended', false)
            ->get(['id']);

        foreach ($admins as $admin) {
            $notifications->notify(
                $admin,
                'ride.reported',
                'New ride report',
                "{$reporterName} ({$roleLabel}) reported {$reportedName} on ride #{$ride->id}. Reason: {$reasonMessage}",
                '/admin/reports',
            );
        }

        return response()->json([
            'message' => 'Report submitted. TriWheel admins will review it.',
            'report' => [
                'id' => $report->id,
                'ride_id' => $report->ride_id,
                'status' => $report->status,
            ],
        ], 201);
    }
}
