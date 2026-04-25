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

// Public routes (no authentication required)
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Protected routes (require valid token)
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'use']);
    Route::post('/logout', [AuthController::class, 'logout']);
});

Route::middleware(['auth:sanctum', 'admin'])->group(function () {
    Route::get('/admin/users', [AuthController::class, 'getAllUsers']);
    Route::post('/admin/users', [AuthController::class, 'adminCreateUser']);
    Route::put('/admin/users/{id}', [AuthController::class, 'adminUpdateUser']); // <-- new
    // Categories
   Route::middleware(['auth:sanctum', 'admin'])->post('/admin/menu', [AuthController::class, 'adminAddMenu']);
    
});



 Route::apiResource('categories', App\Http\Controllers\CategoryController::class);



Route::middleware(['auth:sanctum', 'admin'])->post('/admin/users', [AuthController::class, 'adminCreateUser']);

Route::get('/staff', [AuthController::class, 'getStaffUsers']);