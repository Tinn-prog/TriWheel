<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\DriverController;
use App\Http\Controllers\PassengerController;
use App\Http\Controllers\RideController;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Route;

Route::get('/health', function (): JsonResponse {
    return response()->json([
        'name' => config('app.name'),
        'status' => 'ok',
        'version' => 'migration-baseline',
    ]);
});

Route::post('/login', [AuthController::class, 'login']);
Route::post('/passenger/register', [AuthController::class, 'registerPassenger']);
Route::post('/driver/register', [AuthController::class, 'registerDriver']);
Route::get('/admin/overview', [AdminController::class, 'overview']);
Route::get('/admin/users', [AdminController::class, 'users']);
Route::get('/admin/passengers', [AdminController::class, 'passengers']);
Route::patch('/admin/passengers/{user}/verification', [AdminController::class, 'updatePassengerVerification']);
Route::get('/admin/drivers', [AdminController::class, 'drivers']);
Route::get('/admin/rides', [AdminController::class, 'rides']);
Route::patch('/admin/drivers/{driver}/approval', [AdminController::class, 'updateDriverApproval']);
Route::get('/driver/overview', [DriverController::class, 'overview']);
Route::patch('/driver/status', [DriverController::class, 'updateStatus']);
Route::patch('/driver/rides/history', [DriverController::class, 'clearHistory']);
Route::patch('/driver/rides/{ride}/offer', [DriverController::class, 'offerRide']);
Route::patch('/driver/rides/{ride}/start', [DriverController::class, 'startRide']);
Route::patch('/driver/rides/{ride}/complete', [DriverController::class, 'completeRide']);
Route::patch('/driver/rides/{ride}/cancel', [DriverController::class, 'cancelRide']);
Route::patch('/driver/rides/{ride}/rating', [DriverController::class, 'ratePassenger']);
Route::get('/passenger/overview', [PassengerController::class, 'overview']);
Route::post('/passenger/rides', [RideController::class, 'store']);
Route::patch('/passenger/rides/history', [RideController::class, 'clearPassengerHistory']);
Route::patch('/passenger/rides/{ride}/rating', [RideController::class, 'rateDriver']);
Route::patch('/passenger/ride-offers/{offer}/choose', [PassengerController::class, 'chooseOffer']);
Route::get('/rides/{ride}/status', [RideController::class, 'status']);
Route::patch('/rides/{ride}/cancel', [RideController::class, 'cancel']);
