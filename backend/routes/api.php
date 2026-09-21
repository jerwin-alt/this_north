<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\AuthController;
use App\Http\Controllers\AdminUserController;
use App\Http\Controllers\AdminMenuController;
use App\Http\Controllers\AdminCategoryController;
use App\Http\Controllers\AdminIngredientController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\InventoryTransactionController;
use App\Http\Controllers\AdminOrderController;
use App\Http\Controllers\StaffOrderController;
use App\Http\Controllers\StaffPaymentController;
use App\Http\Controllers\DiscountController;
use App\Http\Controllers\CustomerOrderController;
use App\Http\Controllers\DesignElementController;
use App\Http\Controllers\CustomDesignController;
use App\Http\Controllers\UserActivityLogController;
use App\Http\Controllers\StaffOrderPickupProofController;
use App\Http\Controllers\LoyaltyController;
use App\Http\Controllers\AdminLoyaltyController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\AdminLostAndDamageController;
use App\Http\Controllers\StaffLostAndDamageController;



/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Public routes (no authentication required)
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::get('/design-elements', [DesignElementController::class, 'index']);

// Protected routes (require valid token)
Route::middleware('auth:sanctum')->group(function () {
    
    // FIXED: use() → user()
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/logout', [AuthController::class, 'logout']);

        // Customer endpoints
    Route::get('/customer/orders', [CustomerOrderController::class, 'index']);
    Route::get('/customer/stats', [CustomerOrderController::class, 'stats']);

    Route::post('/customer/orders', [CustomerOrderController::class, 'store']);

    Route::post('/customer/payments', [App\Http\Controllers\CustomerPaymentController::class, 'store']);

    Route::post('/custom-designs', [CustomDesignController::class, 'store']);
    Route::get('/custom-designs/{id}', [CustomDesignController::class, 'show']);

    Route::get('/user/activity-logs', [App\Http\Controllers\UserActivityLogController::class, 'userLogs']);

    Route::get('/orders/{id}/logs', [UserActivityLogController::class, 'orderLogs']);

    Route::put('/customer/orders/{order}/pickup-method', [CustomerOrderController::class, 'updatePickupMethod']);

    Route::put('/customer/orders/{order}/cancel', [App\Http\Controllers\CustomerOrderController::class, 'cancel']);


    Route::get('/loyalty', [LoyaltyController::class, 'index']);
    Route::post('/loyalty/redeem/30-percent', [LoyaltyController::class, 'redeem30Percent']);
    Route::post('/loyalty/redeem/10-star', [LoyaltyController::class, 'redeem10Star']);

    Route::get('/loyalty/settings', [App\Http\Controllers\AdminLoyaltyController::class, 'settings']);

    Route::get('/loyalty/settings', [AdminLoyaltyController::class, 'settings']);


    Route::get('/customer/discount-eligibility', [CustomerOrderController::class, 'discountEligibility']);

    Route::post('/customer/feedback', [App\Http\Controllers\CustomerFeedbackController::class, 'store']);

    Route::get('/customer/feedback/{orderId}', [App\Http\Controllers\CustomerFeedbackController::class, 'show']);
});

Route::middleware(['auth:sanctum', 'admin'])->group(function () {

    /*
    |--------------------------------------------------------------------------
    | USER MANAGEMENT (AdminUserController)
    |--------------------------------------------------------------------------
    */
    Route::get('/admin/users', [AdminUserController::class, 'getAllUsers']);
    Route::get('/admin/staff', [AdminUserController::class, 'getStaffUsers']);
    Route::post('/admin/users', [AdminUserController::class, 'adminCreateUser']);
    Route::put('/admin/users/{id}', [AdminUserController::class, 'adminUpdateUser']);
    Route::delete('/admin/users/{id}', [AdminUserController::class, 'softDeleteUser']);
    Route::patch('/admin/users/{id}/toggle-status', [AdminUserController::class, 'toggleUserStatus']);

    /*
    |--------------------------------------------------------------------------
    | MENU MANAGEMENT (AdminMenuController)
    |--------------------------------------------------------------------------
    */
    Route::post('/admin/menu', [AdminMenuController::class, 'adminAddMenu']);
    Route::get('/admin/menu', [AdminMenuController::class, 'getAllMenu']); // keep main list
    Route::delete('/admin/menu/{id}', [AdminMenuController::class, 'deleteMenu']);
    Route::put('/admin/menu/{id}', [AdminMenuController::class, 'updateMenu']);

    Route::post('/admin/menu/{id}/add-stock', [AdminMenuController::class, 'addStock']);

    // OPTIONAL (if you still want separate simple list)
    Route::get('/admin/menu-simple', [AdminMenuController::class, 'getMenu']);

    Route::get('/admin/menu-transactions', [AdminMenuController::class, 'getMenuTransactions']);

    /*
    |--------------------------------------------------------------------------
    | INGREDIENTS (AdminIngredientController)
    |--------------------------------------------------------------------------
    */
    Route::apiResource('ingredients', AdminIngredientController::class);
    Route::post('/ingredients/{id}/adjust-stock', [AdminIngredientController::class, 'adjustStock']);
    Route::get('/ingredients/{id}/transactions', [AdminIngredientController::class, 'transactions']);


    // Route::apiResource('ingredients', App\Http\Controllers\IngredientController::class);
    // Route::post('/ingredients/{id}/adjust-stock', [App\Http\Controllers\IngredientController::class, 'adjustStock']);
    // Route::get('/ingredients/{id}/transactions', [App\Http\Controllers\IngredientController::class, 'transactions']);

    /*
    |--------------------------------------------------------------------------
    | OTHER ADMIN FEATURES
    |--------------------------------------------------------------------------
    */
    Route::apiResource('discounts', App\Http\Controllers\DiscountController::class);
    Route::get('/discounts/active', [App\Http\Controllers\DiscountController::class, 'active']);
    // Route::apiResource('inventory-transactions', App\Http\Controllers\InventoryTransactionController::class);

        // GET CUSTOMER
    Route::get('/admin/customers', [AdminUserController::class, 'getCustomers']);


    // Inventory read-only
    Route::get('/inventory/product-sales', [InventoryTransactionController::class, 'productSales']);
    Route::get('/inventory/ingredient-transactions', [InventoryTransactionController::class, 'ingredientTransactions']);



     
        // Admin Order Management
    Route::get('/admin/orders', [AdminOrderController::class, 'index']);
    Route::put('/admin/orders/{id}/schedule', [AdminOrderController::class, 'updateSchedule']);
    Route::put('/admin/orders/{id}/approve', [AdminOrderController::class, 'approve']);    // new
    Route::put('/admin/orders/{id}/reject', [AdminOrderController::class, 'reject']);      // new
    Route::get('/admin/schedule', [AdminOrderController::class, 'byDate']);                // calendar data
    Route::get('/admin/orders/{id}', [AdminOrderController::class, 'show']);



        // SKU preview
    Route::get('/admin/next-sku', [AdminMenuController::class, 'getNextSku']);


    // Customer management
    Route::get('/admin/customers',                [AdminUserController::class, 'getCustomers']);
    Route::patch('/admin/customers/{id}/approve', [AdminUserController::class, 'approveCustomer']);
    Route::patch('/admin/customers/{id}/reject',  [AdminUserController::class, 'rejectCustomer']);

    Route::put('/admin/orders/{id}/status', [AdminOrderController::class, 'updateStatus']);
    Route::put('/admin/orders/{id}/cancel', [AdminOrderController::class, 'cancelOrder']);

    Route::post('/admin/orders/{id}/progress-image', [App\Http\Controllers\AdminOrderProgressController::class, 'upload']);


    //LOYALTY REWARD
    Route::get('/admin/loyalty', [AdminLoyaltyController::class, 'index']);
    Route::put('/admin/loyalty/{id}/toggle', [AdminLoyaltyController::class, 'toggleActive']);
    Route::post('/admin/loyalty/batch-update', [AdminLoyaltyController::class, 'batchUpdate']);


    // Admin routes (protected)
    Route::get('/admin/loyalty', [AdminLoyaltyController::class, 'index']);
    Route::put('/admin/loyalty/{id}/toggle', [AdminLoyaltyController::class, 'toggleActive']);
    Route::post('/admin/loyalty/batch-update', [AdminLoyaltyController::class, 'batchUpdate']);
    Route::post('/admin/loyalty/settings/toggle', [AdminLoyaltyController::class, 'toggleSettings']);

    Route::post('/admin/loyalty/settings/toggle-all', [AdminLoyaltyController::class, 'toggleAll']);

    Route::post('/admin/feedback/{id}/reply', [App\Http\Controllers\AdminFeedbackController::class, 'reply']);

    Route::get('/admin/reports', [ReportController::class, 'index']);


        /*
    |--------------------------------------------------------------------------
    | LOST & DAMAGES (Admin)
    |--------------------------------------------------------------------------
    */
    Route::get   ('/admin/lost-and-damages',              [AdminLostAndDamageController::class, 'index']);
    Route::get   ('/admin/lost-and-damages/{id}',         [AdminLostAndDamageController::class, 'show']);
    Route::post  ('/admin/lost-and-damages',              [AdminLostAndDamageController::class, 'store']);
    Route::put   ('/admin/lost-and-damages/{id}/approve', [AdminLostAndDamageController::class, 'approve']);
    Route::put   ('/admin/lost-and-damages/{id}/reject',  [AdminLostAndDamageController::class, 'reject']);
    Route::delete('/admin/lost-and-damages/{id}',         [AdminLostAndDamageController::class, 'destroy']);

});

/*
|--------------------------------------------------------------------------
| PUBLIC / SHARED
|--------------------------------------------------------------------------
*/
Route::apiResource('categories', CategoryController::class);

// (OPTIONAL: if you still want this public)
Route::get('/staff', [AdminUserController::class, 'getStaffUsers']);

// Public menu list (for staff & guests)
Route::get('/menu', function () {
    $menu = \App\Models\Menu::where('is_active', true)->get();
    return response()->json(['products' => $menu]);
});

Route::get('/menu', function (Request $request) {
    $query = \App\Models\Menu::where('is_active', true);
    
    // Filter by category if provided
    if ($request->filled('category')) {
        $query->where('category_id', $request->category);
    }
    
    $menu = $query->get();
    
    // Load drink sizes and cake flavors for each product
    $menu->load('drinkSizes');
    
    return response()->json(['products' => $menu]);
});


Route::get('/cake-sizes', function () {
    return \App\Models\CakeSize::where('is_active', true)->get();
});

Route::get('/cake-flavors', function () {
    return \App\Models\CakeFlavor::where('is_active', true)->get();
});


/*
|--------------------------------------------------------------------------
| STAFF ROUTES
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum', 'staff'])->prefix('staff')->group(function () {

    Route::get('orders', [StaffOrderController::class, 'index']);
    Route::get('orders/{id}', [StaffOrderController::class, 'show']);
    Route::post('orders', [StaffOrderController::class, 'store']);          // create walk-in
    Route::put('orders/{id}', [StaffOrderController::class, 'update']);     // edit pending
    Route::post('orders/{id}/cancel', [StaffOrderController::class, 'cancel']); // cancel
    Route::put('orders/{id}/status', [StaffOrderController::class, 'updateStatus']); // status progression
    Route::post('payments', [StaffPaymentController::class, 'store']);

        // Staff discount list (read‑only)
    Route::get('discounts', [DiscountController::class, 'staffIndex']);

    // Staff schedule view (read-only)
    Route::get('schedule', [AdminOrderController::class, 'byDate']);
    // Route::get('orders', [App\Http\Controllers\StaffOrderController::class, 'index']);
    // Route::get('orders/{id}', [App\Http\Controllers\StaffOrderController::class, 'show']);
    // Route::put('orders/{id}/status', [App\Http\Controllers\StaffOrderController::class, 'updateStatus']);
    // Route::post('payments', [App\Http\Controllers\StaffPaymentController::class, 'store']);
    // Route::post('orders', [App\Http\Controllers\StaffOrderController::class, 'store']);
    // Route::put('orders/{id}', [App\Http\Controllers\StaffOrderController::class, 'update']);
    // Route::post('orders/{id}/cancel', [App\Http\Controllers\StaffOrderController::class, 'cancel']);

    Route::post('orders/{id}/pickup-proof', [App\Http\Controllers\StaffOrderPickupProofController::class, 'upload']);

        /*
    |--------------------------------------------------------------------------
    | LOST & DAMAGES (Staff)
    |--------------------------------------------------------------------------
    */
    Route::get ('lost-and-damages',      [StaffLostAndDamageController::class, 'index']);
    Route::get ('lost-and-damages/items', [StaffLostAndDamageController::class, 'items']); 
    Route::get ('lost-and-damages/{id}', [StaffLostAndDamageController::class, 'show']);
    Route::post('lost-and-damages',      [StaffLostAndDamageController::class, 'store']);
    
});