<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AdminManagementController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\DriverController;
use App\Http\Controllers\FileController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PassengerController;
use App\Http\Controllers\RideComplianceController;
use App\Http\Controllers\RideController;
use App\Http\Controllers\RideMessageController;
use App\Http\Controllers\RideReportController;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Route;

Route::get('/health', function (): JsonResponse {
    return response()->json([
        'name' => config('app.name'),
        'status' => 'ok',
        'version' => 'migration-baseline',
    ]);
});

Route::get('/platform/config', function (): JsonResponse {
    $system = \App\Models\PlatformSetting::systemConfig();
    $policy = \App\Models\PlatformSetting::accessPolicy();

    return response()->json([
        'platform_name' => $system['platform_name'],
        'default_language' => $system['default_language'],
        'timezone' => $system['timezone'],
        'date_format' => $system['date_format'],
        'currency_code' => $system['currency_code'],
        'currency_symbol' => $system['currency_symbol'],
        'allow_passenger_registration' => (bool) $policy['allow_passenger_registration'],
        'allow_driver_registration' => (bool) $policy['allow_driver_registration'],
    ]);
});

Route::post('/login', [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout']);
Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/reset-password', [AuthController::class, 'resetPassword']);
Route::post('/email/verify', [AuthController::class, 'verifyEmail']);
Route::post('/email/resend-verification', [AuthController::class, 'resendEmailVerification']);
Route::get('/account/profile', [AuthController::class, 'showProfile']);
Route::post('/account/profile', [AuthController::class, 'updateProfile']);
Route::patch('/account/profile', [AuthController::class, 'updateProfile']);
Route::patch('/account/password', [AuthController::class, 'changePassword']);
Route::get('/files/{path}', [FileController::class, 'show'])->where('path', '.*');
Route::post('/passenger/register', [AuthController::class, 'registerPassenger']);
Route::post('/driver/register', [AuthController::class, 'registerDriver']);

Route::get('/admin/overview', [AdminController::class, 'overview']);
Route::get('/admin/users', [AdminController::class, 'users']);
Route::post('/admin/users', [AdminManagementController::class, 'storeAdminUser']);
Route::get('/admin/passengers', [AdminController::class, 'passengers']);
Route::patch('/admin/passengers/{user}/verification', [AdminController::class, 'updatePassengerVerification']);
Route::patch('/admin/passengers/{user}', [AdminController::class, 'updatePassengerDetails']);
Route::patch('/admin/passengers/{user}/account', [AdminController::class, 'updatePassengerAccount']);
Route::get('/admin/drivers', [AdminController::class, 'drivers']);
Route::get('/admin/rides', [AdminController::class, 'rides']);
Route::patch('/admin/drivers/{driver}/approval', [AdminController::class, 'updateDriverApproval']);
Route::patch('/admin/drivers/{driver}/details', [AdminController::class, 'updateDriverDetails']);
Route::patch('/admin/drivers/{driver}/account', [AdminController::class, 'updateDriverAccount']);
Route::patch('/admin/drivers/{driver}/compliance', [AdminManagementController::class, 'updateDriverCompliance']);
Route::get('/admin/rides/{ride}', [AdminManagementController::class, 'showRide']);
Route::patch('/admin/rides/{ride}/cancel', [AdminManagementController::class, 'cancelRide']);
Route::patch('/admin/rides/{ride}/reassign', [AdminManagementController::class, 'reassignRide']);
Route::get('/admin/drivers/locations', [AdminManagementController::class, 'driverLocations']);
Route::get('/admin/drivers/approved', [AdminManagementController::class, 'approvedDrivers']);
Route::get('/admin/ratings', [AdminManagementController::class, 'ratings']);
Route::get('/admin/settings', [AdminManagementController::class, 'settings']);
Route::patch('/admin/settings', [AdminManagementController::class, 'updateSettings']);
Route::get('/admin/audit-logs', [AdminManagementController::class, 'auditLogs']);
Route::get('/admin/reports', [AdminManagementController::class, 'reports']);
Route::patch('/admin/reports/{report}', [AdminManagementController::class, 'updateReport']);
Route::patch('/admin/users/{user}', [AdminManagementController::class, 'updateUser']);
Route::patch('/admin/users/{user}/suspend', [AdminManagementController::class, 'suspendUser']);
Route::get('/admin/export/users', [AdminManagementController::class, 'exportUsers']);
Route::get('/admin/export/drivers', [AdminManagementController::class, 'exportDrivers']);
Route::get('/admin/export/rides', [AdminManagementController::class, 'exportRides']);
Route::get('/admin/export/audit-logs', [AdminManagementController::class, 'exportAuditLogs']);
Route::post('/admin/import/users', [AdminManagementController::class, 'importUsers']);

Route::get('/driver/overview', [DriverController::class, 'overview']);
Route::post('/driver/suspension-appeal', [DriverController::class, 'submitSuspensionAppeal']);
Route::patch('/driver/status', [DriverController::class, 'updateStatus']);
Route::patch('/driver/location', [DriverController::class, 'updateLocation']);
Route::patch('/driver/vehicle', [DriverController::class, 'updateVehicle']);
Route::patch('/driver/auto-accept', [DriverController::class, 'updateAutoAccept']);
Route::patch('/driver/rides/history', [DriverController::class, 'clearHistory']);
Route::patch('/driver/rides/{ride}/offer', [DriverController::class, 'offerRide']);
Route::patch('/driver/rides/{ride}/start', [DriverController::class, 'startRide']);
Route::patch('/driver/rides/{ride}/complete', [DriverController::class, 'completeRide']);
Route::patch('/driver/rides/{ride}/cancel', [DriverController::class, 'cancelRide']);
Route::patch('/driver/rides/{ride}/rating', [DriverController::class, 'ratePassenger']);
Route::get('/notifications', [NotificationController::class, 'index']);
Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
Route::patch('/notifications/read-all', [NotificationController::class, 'markAllRead']);
Route::patch('/notifications/{notification}/read', [NotificationController::class, 'markRead']);

Route::get('/passenger/overview', [PassengerController::class, 'overview']);
Route::post('/passenger/rides', [RideController::class, 'store']);
Route::post('/passenger/rides/emergency', [RideController::class, 'storeEmergency']);
Route::patch('/passenger/rides/history', [RideController::class, 'clearPassengerHistory']);
Route::patch('/passenger/rides/{ride}/rating', [RideController::class, 'rateDriver']);
Route::patch('/passenger/ride-offers/{offer}/choose', [PassengerController::class, 'chooseOffer']);
Route::get('/service-zones', [RideComplianceController::class, 'serviceZones']);
Route::post('/rides/compliance-check', [RideComplianceController::class, 'check']);
Route::get('/rides/{ride}/status', [RideController::class, 'status']);
Route::get('/ride-chats', [RideMessageController::class, 'conversations']);
Route::get('/rides/{ride}/messages', [RideMessageController::class, 'index']);
Route::post('/rides/{ride}/messages', [RideMessageController::class, 'store']);
Route::patch('/rides/{ride}/cancel', [RideController::class, 'cancel']);
Route::post('/rides/{ride}/cancel', [RideController::class, 'cancel']);
Route::post('/rides/{ride}/report', [RideReportController::class, 'store']);
