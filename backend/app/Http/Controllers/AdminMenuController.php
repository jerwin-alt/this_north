<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use App\Models\Category;
use App\Models\Menu;
use App\Models\DrinkSize;
use App\Models\BillOfMaterials;
use App\Models\Ingredient;
use App\Models\UserActivityLog;
use Carbon\Carbon;

class AdminMenuController extends Controller
{
    /**
     * Generate a 2-character uppercase prefix from a category name.
     * Single-word: first two letters. Multi-word: initials (max 2).
     */
    private function generateCategoryPrefix(string $categoryName): string
    {
        $words = preg_split('/\s+/', trim($categoryName));
        if (count($words) === 1) {
            return strtoupper(substr($words[0], 0, 2));
        } else {
            $initials = '';
            foreach ($words as $word) {
                if ($word !== '') {
                    $initials .= $word[0];
                    if (strlen($initials) >= 2) {
                        break;
                    }
                }
            }
            return strtoupper(str_pad($initials, 2, substr($words[0], 1, 1)));
        }
    }

    /**
     * Admin: Create a new menu item (product)
     */
    public function adminAddMenu(Request $request)
    {
        // Decode sizes early
        $sizes = $request->filled('drink_sizes') ? json_decode($request->drink_sizes, true) : [];
        $hasSizes = !empty($sizes);

        // Conditional validation: base_price is required only if NO sizes
        $rules = [
            'category_id'          => 'required|exists:categories,id,is_active,1',
            'name'                 => 'required|string|max:150',
            'description'          => 'nullable|string',
            'base_price'           => $hasSizes ? 'nullable|numeric|min:0' : 'required|numeric|min:0',
            'menu_type'            => 'required|in:standard,customizable',
            'stock_quantity'       => 'nullable|integer|min:0',
            'is_ready_made'        => 'boolean',
            'expiration_date'      => 'nullable|date|after:today',
            'min_stock_level'      => 'nullable|integer|min:0',
            'image'                => 'required|image|mimes:jpeg,png,jpg,gif,webp,bmp,svg+xml|max:20480',
            'drink_sizes'          => 'nullable|json',
            'recipe'               => 'nullable|json',
        ];

        $validated = $request->validate($rules);

        // Handle image upload
        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('uploads/menu', 'public');
            if (!$imagePath) {
                return response()->json(['message' => 'Image upload failed'], 500);
            }
        } else {
            return response()->json(['message' => 'Image is required'], 422);
        }

        // --------------- AUTO SKU GENERATION ---------------
        $category = Category::findOrFail($request->category_id);
        $prefix = $this->generateCategoryPrefix($category->name);

        DB::beginTransaction();
        try {
            // Lock to avoid duplicate SKUs in concurrent requests
            $lastMenu = Menu::where('category_id', $request->category_id)
                ->where('sku', 'like', $prefix . '-%')
                ->orderBy('id', 'desc')
                ->lockForUpdate()
                ->first();

            $nextNumber = $lastMenu
                ? ((int) substr($lastMenu->sku, strlen($prefix) + 1)) + 1
                : 1;
            $sku = $prefix . '-' . str_pad($nextNumber, 4, '0', STR_PAD_LEFT);

            // Create the menu item (temporarily with base_price = 0 if sizes exist)
            $menu = Menu::create([
                'category_id'       => $request->category_id,
                'sku'               => $sku,
                'name'              => $request->name,
                'description'       => $request->description,
                'base_price'        => $hasSizes ? 0 : $request->base_price,
                'menu_type'         => $request->menu_type,
                'has_size_options'  => $hasSizes,
                'is_active'         => true,
                'stock_quantity'    => $request->stock_quantity ?? 0,
                'is_ready_made'     => $request->is_ready_made ?? true,
                'track_stock'       => true,
                'expiration_date'   => $request->expiration_date ?? null,
                'min_stock_level'   => $request->min_stock_level ?? 0,
                'image_url'         => url(Storage::url($imagePath)),
                'stocked_at'        => now(),
            ]);

            // Process drink sizes (if any)
            if ($hasSizes) {
                foreach ($sizes as $size) {
                    DrinkSize::create([
                        'menu_id'        => $menu->id,
                        'size_name'      => $size['size_name'],
                        'price_modifier' => $size['price_modifier'], // absolute price
                        'is_active'      => true,
                    ]);
                }

                // ✅ FIX: Set base_price to the first size's price
                $firstSizePrice = $sizes[0]['price_modifier'];
                $menu->base_price = $firstSizePrice;
                $menu->save();
            }

            // Process Bill of Materials (recipe)
            if ($request->filled('recipe')) {
                $recipe = json_decode($request->recipe, true);
                if (is_array($recipe)) {
                    foreach ($recipe as $item) {
                        $ingredient = Ingredient::find($item['ingredient_id']);
                        if (!$ingredient) {
                            throw new \Exception("Ingredient ID {$item['ingredient_id']} not found");
                        }
                        BillOfMaterials::create([
                            'menu_id'           => $menu->id,
                            'ingredient_id'     => $item['ingredient_id'],
                            'quantity_needed'   => $item['quantity_needed'],
                            'unit'              => $item['unit'],
                            'wastage_percentage'=> $item['wastage_percentage'] ?? 0,
                        ]);
                    }
                }
            }

            // Log activity
            UserActivityLog::create([
                'user_id'       => auth()->id(),
                'activity_type' => 'inventory_updated',
                'reference_id'  => $menu->id,
                'details'       => "Created menu item: {$menu->name} (SKU: {$sku})",
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Product created successfully',
                'product' => $menu->load(['category', 'drinkSizes', 'billOfMaterials.ingredient']),
                'sku'     => $sku,
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();

            if ($imagePath && Storage::disk('public')->exists($imagePath)) {
                Storage::disk('public')->delete($imagePath);
            }

            Log::error($e->getMessage());

            return response()->json([
                'message' => 'Failed to create product',
                'error'   => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Return a preview of the next SKU for a given category.
     */
    public function getNextSku(Request $request)
    {
        $request->validate(['category_id' => 'required|exists:categories,id']);
        $category = Category::find($request->category_id);
        $prefix = $this->generateCategoryPrefix($category->name);

        $lastMenu = Menu::where('category_id', $category->id)
            ->where('sku', 'like', $prefix . '-%')
            ->orderBy('id', 'desc')
            ->first();

        $nextNumber = $lastMenu ? ((int) substr($lastMenu->sku, strlen($prefix) + 1)) + 1 : 1;
        $nextSku = $prefix . '-' . str_pad($nextNumber, 4, '0', STR_PAD_LEFT);

        return response()->json(['sku' => $nextSku]);
    }

    /**
     * Get all menu items (simple list, only with category)
     */
    public function getMenu()
    {
        $menu = Menu::with('category')->get();
        return response()->json(['products' => $menu]);
    }

    /**
     * Get all menu items (full, with category and drink sizes)
     */
    public function getAllMenu()
    {
        // ✅ Ensure drinkSizes are loaded for admin product list
        $menu = Menu::with(['category', 'drinkSizes'])->get();
        return response()->json([
            'products' => $menu,
            'message'  => 'Products retrieved successfully'
        ]);
    }

    /**
     * Delete a menu item
     */
    public function deleteMenu($id)
    {
        $menu = Menu::findOrFail($id);
        $menu->delete();

        return response()->json([
            'message' => 'Product deleted successfully'
        ]);
    }

    /**
     * Update a menu item
     */
    public function updateMenu(Request $request, $id)
    {
        $menu = Menu::findOrFail($id);

        // Convert boolean fields
        $booleanFields = ['has_size_options', 'is_active', 'track_stock', 'is_ready_made'];
        foreach ($booleanFields as $field) {
            if ($request->has($field)) {
                $request->merge([$field => filter_var($request->$field, FILTER_VALIDATE_BOOLEAN)]);
            }
        }

        // Decode sizes early
        $sizes = $request->filled('drink_sizes') ? json_decode($request->drink_sizes, true) : [];
        $hasSizes = !empty($sizes);

        // Conditional validation
        $rules = [
            'category_id'      => 'required|exists:categories,id',
            'name'             => 'required|string|max:150',
            'description'      => 'nullable|string',
            'base_price'       => $hasSizes ? 'nullable|numeric|min:0' : 'required|numeric|min:0',
            'menu_type'        => 'required|in:standard,customizable',
            'stock_quantity'   => 'nullable|integer|min:0',
            'is_ready_made'    => 'boolean',
            'expiration_date'  => 'nullable|date|after:today',
            'min_stock_level'  => 'nullable|integer|min:0',
            'sku'              => 'nullable|string|unique:menu,sku,' . $id,
            'image'            => 'nullable|image|max:20480',
        ];

        $validated = $request->validate($rules);

        $updateData = [
            'category_id'      => $request->category_id,
            'name'             => $request->name,
            'description'      => $request->description,
            'menu_type'        => $request->menu_type,
            'has_size_options' => $hasSizes,
            'is_active'        => $request->is_active ?? $menu->is_active,
            'track_stock'      => $request->track_stock ?? $menu->track_stock,
            'stock_quantity'   => $request->stock_quantity ?? $menu->stock_quantity,
            'is_ready_made'    => $request->is_ready_made ?? $menu->is_ready_made,
            'expiration_date'  => $request->expiration_date ?? $menu->expiration_date,
            'min_stock_level'  => $request->min_stock_level ?? $menu->min_stock_level,
        ];

        // Update image if provided
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('uploads/menu', 'public');
            $updateData['image_url'] = Storage::url($imagePath);
        }

        // ✅ Update base_price based on sizes or provided value
        if ($hasSizes) {
            $firstSizePrice = $sizes[0]['price_modifier'];
            $updateData['base_price'] = $firstSizePrice;
        } else {
            $updateData['base_price'] = $request->base_price;
        }

        $menu->update($updateData);

        // Update sizes: delete old, insert new
        $menu->drinkSizes()->delete();
        if ($hasSizes) {
            foreach ($sizes as $size) {
                DrinkSize::create([
                    'menu_id'        => $menu->id,
                    'size_name'      => $size['size_name'],
                    'price_modifier' => $size['price_modifier'],
                    'is_active'      => true,
                ]);
            }
        }

        return response()->json([
            'message' => 'Product updated successfully',
            'product' => $menu->load(['category', 'drinkSizes']),
        ]);
    }

    /**
     * Add stock to a menu item.
     */
    public function addStock(Request $request, $id)
    {
        $menu = Menu::findOrFail($id);

        $request->validate([
            'quantity' => 'required|integer|min:1',
        ]);

        $menu->increment('stock_quantity', $request->quantity);

        // Log activity
        UserActivityLog::create([
            'user_id'       => auth()->id(),
            'activity_type' => 'inventory_updated',
            'reference_id'  => $menu->id,
            'details'       => "Added stock to {$menu->name}: +{$request->quantity}",
        ]);

        return response()->json([
            'message' => 'Stock added successfully',
            'new_stock' => $menu->fresh()->stock_quantity,
        ]);
    }

    /**
     * GET /api/admin/menu-transactions
     * Returns paginated menu stock transactions (stock in and stock out) parsed from activity logs.
     */
    public function getMenuTransactions(Request $request)
    {
        $perPage   = max(1, min(10000, (int) $request->input('per_page', 20)));
        $type      = $request->input('type', 'all');           // all | stock_in | stock_out | sold
        $search    = trim((string) $request->input('search', ''));
        $categoryId= $request->input('category_id');
        $year      = $request->input('year');
        $month     = $request->input('month');
        $weekStart = $request->input('week_start');
        $dayOffset = $request->input('day_offset');            // 0=Mon … 6=Sun, null=whole week

        $cashierId = $request->input('cashier_id');

        // Resolve search → product OR category
        $matchedProduct  = null;
        $matchedCategory = null;

        if ($search !== '') {
            $matchedProduct = Menu::where('name', 'like', "%{$search}%")->first();
            if (!$matchedProduct) {
                $matchedCategory = Category::where('name', 'like', "%{$search}%")->first();
            }
        }

        $query = UserActivityLog::where('activity_type', 'inventory_updated')
            ->where(function ($q) {
                $q->where('details', 'like', 'Added stock%')
                ->orWhere('details', 'like', 'Deducted stock%');
            });

        // Type filter
        if ($type === 'stock_in') {
            $query->where('details', 'like', 'Added stock%');
        } elseif ($type === 'stock_out' || $type === 'sold') {
            $query->where('details', 'like', 'Deducted stock%');
        }

        $query->join('menu', 'user_activity_logs.reference_id', '=', 'menu.id')
            ->select('user_activity_logs.*');


        // Search → menu id or menu.category_id
        if ($matchedProduct) {
            $query->where('menu.id', $matchedProduct->id);
        } elseif ($matchedCategory) {
            $query->where('menu.category_id', $matchedCategory->id);
        } elseif ($categoryId) {
            $query->where('menu.category_id', $categoryId);
        }

        // Date filters
        if ($year) {
            $query->whereYear('user_activity_logs.created_at', (int) $year);
        }
        if ($month) {
            $query->whereMonth('user_activity_logs.created_at', (int) $month);
        }
        if ($weekStart) {
            $start = Carbon::parse($weekStart)->startOfWeek(Carbon::MONDAY);
            if ($dayOffset !== null && $dayOffset !== '') {
                $start = $start->copy()->addDays((int) $dayOffset)->startOfDay();
                $end   = $start->copy()->endOfDay();
            } else {
                $end = $start->copy()->endOfWeek(Carbon::SUNDAY);
            }
            $query->whereBetween('user_activity_logs.created_at', [
                $start->toDateTimeString(),
                $end->toDateTimeString(),
            ]);
        }

        // Legacy start_date/end_date (kept for backward compatibility)
        if ($request->filled('start_date')) {
            $query->where('user_activity_logs.created_at', '>=', $request->start_date);
        }
        if ($request->filled('end_date')) {
            $query->where('user_activity_logs.created_at', '<=', $request->end_date . ' 23:59:59');
        }

        if ($cashierId) {
            $query->where('user_activity_logs.user_id', (int) $cashierId);
        }



        // ── NEW: Order Type filter ──
        $orderTypeFilter = $request->input('order_type_filter', 'all');
        if ($orderTypeFilter !== 'all') {
            // Find orders matching the order-type filter
            $orderIds = \App\Models\Order::query()
                ->when($orderTypeFilter === 'walk_in',    fn($q) => $q->whereNull('customer_id'))
                ->when($orderTypeFilter === 'online',     fn($q) => $q->whereNotNull('customer_id'))
                ->when($orderTypeFilter === 'custom_cake', fn($q) =>
                    $q->whereHas('items', fn($sub) => $sub->where('cake_type', 'custom'))
                )
                ->pluck('id');

            // Menus sold in those orders
            $menuIds = \App\Models\OrderItem::whereIn('order_id', $orderIds)
                ->whereNotNull('menu_id')
                ->pluck('menu_id')
                ->unique()
                ->values()
                ->toArray();

            if (empty($menuIds)) {
                // No matching menus → no transactions
                $query->whereRaw('1 = 0');
            } else {
                // Restrict to those menus AND only stock deductions (sold)
                $query->whereIn('menu.id', $menuIds)
                      ->where('user_activity_logs.details', 'like', 'Deducted stock%');
            }
        }


        

        $logs = $query->orderBy('user_activity_logs.created_at', 'desc')->paginate($perPage);

        $transactions = $logs->map(function ($log) {
            $details = $log->details;
            $menu = Menu::find($log->reference_id);
            if (!$menu) return null;

            if (preg_match('/Added stock to (.+): \+(\d+)/', $details, $matches)) {
                $quantity = (int) $matches[2];
                $currentStock = $menu->stock_quantity ?? 0;
                $pastStock = $currentStock - $quantity;
                return [
                    'sku'           => $menu->sku,
                    'product_name'  => $menu->name,
                    'type'          => 'Stock In',
                    'past_stock'    => max(0, $pastStock),
                    'added_stock'   => $quantity,
                    'current_stock' => $currentStock,
                    'qty_sold'      => 0,
                    'created_at'    => $log->created_at->toDateTimeString(),
                ];
            } elseif (preg_match('/Deducted stock for (.+): -(\d+) \(was (\d+), now (\d+)\)/', $details, $matches)) {
                $quantity  = (int) $matches[2];
                $pastStock = (int) $matches[3];
                $newStock  = (int) $matches[4];
                return [
                    'sku'           => $menu->sku,
                    'product_name'  => $menu->name,
                    'type'          => 'Stock Out',
                    'past_stock'    => $pastStock,
                    'added_stock'   => 0,
                    'current_stock' => $newStock,
                    'qty_sold'      => $quantity,
                    'created_at'    => $log->created_at->toDateTimeString(),
                ];
            }
            return null;
        })->filter();

        $paginated = $logs->setCollection($transactions);

        return response()->json(['transactions' => $paginated]);
    }
}