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
            // Single word → first two letters
            return strtoupper(substr($words[0], 0, 2));
        } else {
            // Multiple words → initials, but limit to 2 characters
            $initials = '';
            foreach ($words as $word) {
                if ($word !== '') {
                    $initials .= $word[0];
                    if (strlen($initials) >= 2) {
                        break;
                    }
                }
            }
            // Fallback: if only one initial (highly unlikely), use first two letters of first word
            return strtoupper(str_pad($initials, 2, substr($words[0], 1, 1)));
        }
    }

    /**
     * Admin: Create a new menu item (product)
     */
    public function adminAddMenu(Request $request)
    {
        $validated = $request->validate([
            'category_id'          => 'required|exists:categories,id,is_active,1',
            'name'                 => 'required|string|max:150',
            'description'          => 'nullable|string',
            'base_price'           => 'required|numeric|min:0',
            'menu_type'            => 'required|in:standard,customizable',
            'has_size_options'     => 'boolean',
            'is_active'            => 'boolean',
            'stock_quantity'       => 'required_if:track_stock,true|nullable|integer|min:0',
            'is_ready_made'        => 'boolean',
            'track_stock'          => 'boolean',
            'expiration_date'      => 'nullable|date|after:today',
            'min_stock_level'      => 'nullable|integer|min:0',
            'image'                => 'required|image|mimes:jpeg,png,jpg,gif,webp,bmp,svg+xml|max:20480',
            'drink_sizes'          => 'nullable|json',
            'recipe'               => 'nullable|json',
        ]);

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

            // Create the menu item
            $menu = Menu::create([
                'category_id'       => $request->category_id,
                'sku'               => $sku,
                'name'              => $request->name,
                'description'       => $request->description,
                'base_price'        => $request->base_price,
                'menu_type'         => $request->menu_type,
                'has_size_options'  => $request->has_size_options ?? false,
                'is_active'         => $request->is_active ?? true,
                'stock_quantity'    => $request->track_stock ? ($request->stock_quantity ?? 0) : null,
                'is_ready_made'     => $request->is_ready_made ?? true,
                'track_stock'       => $request->track_stock ?? false,
                'expiration_date'   => $request->expiration_date ?: null,
                'min_stock_level'   => $request->min_stock_level ?? 0,
                'image_url'         => url(Storage::url($imagePath)),
                'stocked_at'        => now(),
            ]);

            // Process drink sizes (if any)
            $drinkSizes = [];
            if ($request->filled('drink_sizes')) {
                $sizes = json_decode($request->drink_sizes, true);
                if (is_array($sizes)) {
                    foreach ($sizes as $size) {
                        $drinkSizes[] = DrinkSize::create([
                            'menu_id'        => $menu->id,
                            'size_name'      => $size['size_name'],
                            'price_modifier' => $size['price_modifier'] ?? 0,
                            'is_active'      => $size['is_active'] ?? true,
                        ]);
                    }
                }
            }

            // Process Bill of Materials (recipe)
            $bomEntries = [];
            if ($request->filled('recipe')) {
                $recipe = json_decode($request->recipe, true);
                if (is_array($recipe)) {
                    foreach ($recipe as $item) {
                        $ingredient = Ingredient::find($item['ingredient_id']);
                        if (!$ingredient) {
                            throw new \Exception("Ingredient ID {$item['ingredient_id']} not found");
                        }
                        $bomEntries[] = BillOfMaterials::create([
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
     * GET /api/admin/next-sku?category_id=...
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
     * Update a menu item (SKU can optionally be updated if needed, but usually left unchanged)
     */
    public function updateMenu(Request $request, $id)
    {
        $menu = Menu::findOrFail($id);

        $booleanFields = ['has_size_options', 'is_active', 'track_stock', 'is_ready_made'];
        foreach ($booleanFields as $field) {
            if ($request->has($field)) {
                $request->merge([$field => filter_var($request->$field, FILTER_VALIDATE_BOOLEAN)]);
            }
        }

        $validated = $request->validate([
            'category_id'      => 'required|exists:categories,id',
            'name'             => 'required|string|max:150',
            'description'      => 'nullable|string',
            'base_price'       => 'required|numeric|min:0',
            'menu_type'        => 'required|in:standard,customizable',
            'has_size_options' => 'boolean',
            'is_active'        => 'boolean',
            'stock_quantity'   => 'nullable|integer|min:0',
            'is_ready_made'    => 'boolean',
            'track_stock'      => 'boolean',
            'expiration_date'  => 'nullable|date|after:today',
            'min_stock_level'  => 'nullable|integer|min:0',
            'sku'              => 'nullable|string|unique:menu,sku,' . $id,
            'image'            => 'nullable|image|max:20480',
        ]);

        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('uploads/menu', 'public');
            $validated['image_url'] = Storage::url($imagePath);
        }

        $menu->update($validated);

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
     * Returns menu stock transactions (stock in and stock out) parsed from activity logs.
     */
    public function getMenuTransactions(Request $request)
    {
        // Fetch all inventory_updated logs that are either stock additions or deductions
        $logs = UserActivityLog::where('activity_type', 'inventory_updated')
            ->where(function ($q) {
                $q->where('details', 'like', 'Added stock%')
                ->orWhere('details', 'like', 'Deducted stock%');
            })
            ->orderBy('created_at', 'desc')
            ->get();

        $transactions = [];

        foreach ($logs as $log) {
            // --- Parse Stock In (admin add stock) ---
            if (preg_match('/Added stock to (.+): \+(\d+)/', $log->details, $matches)) {
                $productName = trim($matches[1]);
                $quantity = (int) $matches[2];

                // Try to find menu by reference_id first, then by name
                $menu = Menu::find($log->reference_id);
                if (!$menu) {
                    $menu = Menu::where('name', $productName)->first();
                }
                if (!$menu) continue;

                $currentStock = $menu->stock_quantity ?? 0;
                $pastStock = $currentStock - $quantity;

                $transactions[] = [
                    'sku'           => $menu->sku,
                    'product_name'  => $menu->name,
                    'type'          => 'Stock In',
                    'past_stock'    => max(0, $pastStock),
                    'added_stock'   => $quantity,
                    'current_stock' => $currentStock,
                    'qty_sold'      => 0,
                    'created_at'    => $log->created_at->toDateTimeString(),
                ];
            }
            // --- Parse Stock Out (order completion) ---
            elseif (preg_match('/Deducted stock for (.+): -(\d+) \(was (\d+), now (\d+)\)/', $log->details, $matches)) {
                $productName = trim($matches[1]);
                $quantity = (int) $matches[2];
                $pastStock = (int) $matches[3];
                $newStock = (int) $matches[4];

                $menu = Menu::find($log->reference_id);
                if (!$menu) {
                    $menu = Menu::where('name', $productName)->first();
                }
                if (!$menu) continue;

                $transactions[] = [
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
        }

        // Apply date filters if provided
        if ($request->filled('start_date')) {
            $transactions = array_filter($transactions, function ($tx) use ($request) {
                return $tx['created_at'] >= $request->start_date;
            });
        }
        if ($request->filled('end_date')) {
            $transactions = array_filter($transactions, function ($tx) use ($request) {
                return $tx['created_at'] <= $request->end_date . ' 23:59:59';
            });
        }

        // Apply category filter if provided
        if ($request->filled('category_id')) {
            $categoryId = $request->category_id;
            $transactions = array_filter($transactions, function ($tx) use ($categoryId) {
                $menu = Menu::where('sku', $tx['sku'])->first();
                return $menu && $menu->category_id == $categoryId;
            });
        }

        // Re-index after filtering
        return response()->json(['transactions' => array_values($transactions)]);
    }
}