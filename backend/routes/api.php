<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CategoryController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

Route::middleware('guest')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    
});

// =======================
// AUTHENTICATED USERS
// =======================
Route::middleware('auth:sanctum')->group(function () {

    Route::get('/user', [AuthController::class, 'user']);

    // PUBLIC / CUSTOMER
    Route::middleware(['auth:sanctum', 'role:customer'])->group(function () {
        Route::get('/menu', [MenuController::class, 'index']);
        Route::get('/menu/{id}', [MenuController::class, 'show']);
        });

    // STAFF (Web)
    Route::middleware('role:staff')->group(function () {
        Route::get('/staff/orders', [OrderController::class, 'index']);
        Route::put('/staff/orders/{id}', [OrderController::class, 'update']);
    });

    // ADMIN (Web)
    // ADMIN ONLY
Route::middleware(['auth:sanctum', 'role:admin'])->group(function () {
    Route::post('/admin/menu', [MenuController::class, 'store']);
    Route::put('/admin/menu/{id}', [MenuController::class, 'update']);
    Route::delete('/admin/menu/{id}', [MenuController::class, 'destroy']);
});
});