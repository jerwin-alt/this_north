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
    Route::delete('/admin/users/{id}', [AuthController::class, 'softDeleteUser']);
    Route::patch('/admin/users/{id}/toggle-status', [AuthController::class, 'toggleUserStatus']);

    // Categories
    Route::post('/admin/menu', [AuthController::class, 'adminAddMenu']);


    
    Route::post('/admin/users', [AuthController::class, 'adminCreateUser']);
    Route::get('/admin/menu', [AuthController::class, 'getMenu']);
    Route::delete('/admin/menu/{id}', [AuthController::class, 'deleteMenu']);
    Route::get('/admin/menu', [AuthController::class, 'getAllMenu']);           // list all products
    Route::delete('/admin/menu/{id}', [AuthController::class, 'deleteMenu']);   // delete a product
    Route::put('/admin/menu/{id}', [AuthController::class, 'updateMenu']);

    Route::apiResource('ingredients', App\Http\Controllers\IngredientController::class);
    Route::post('/ingredients/{id}/adjust-stock', [App\Http\Controllers\IngredientController::class, 'adjustStock']);
    Route::get('/ingredients/{id}/transactions', [App\Http\Controllers\IngredientController::class, 'transactions']);

    
        // Discounts (full CRUD)
    Route::apiResource('discounts', App\Http\Controllers\DiscountController::class);
    Route::get('/discounts/active', [DiscountController::class, 'active']); // optional
    Route::apiResource('inventory-transactions', App\Http\Controllers\InventoryTransactionController::class);
});

Route::apiResource('categories', App\Http\Controllers\CategoryController::class);


Route::get('/staff', [AuthController::class, 'getStaffUsers']);