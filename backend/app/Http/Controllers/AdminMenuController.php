<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class AdminMenuController extends Controller
{
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
            'sku'                  => 'nullable|string|unique:menu,sku',
            'image' => 'required|image|mimes:jpeg,png,jpg,gif,webp,bmp,svg+xml|max:20480',
            'drink_sizes'          => 'nullable|json',
            'recipe'               => 'nullable|json',
        ]);

        $sku = $request->sku ?? 'MENU-' . time();

        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('uploads/menu', 'public');
            if (!$imagePath) {
                return response()->json(['message' => 'Image upload failed'], 500);
            }
        } else {
            return response()->json(['message' => 'Image is required'], 422);
        }

        DB::beginTransaction();
        try {
            $menu = \App\Models\Menu::create([
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

            $drinkSizes = [];
            if ($request->filled('drink_sizes')) {
                $sizes = json_decode($request->drink_sizes, true);
                if (is_array($sizes)) {
                    foreach ($sizes as $size) {
                        $drinkSizes[] = \App\Models\DrinkSize::create([
                            'menu_id'        => $menu->id,
                            'size_name'      => $size['size_name'],
                            'price_modifier' => $size['price_modifier'] ?? 0,
                            'is_active'      => $size['is_active'] ?? true,
                        ]);
                    }
                }
            }

            $bomEntries = [];
            if ($request->filled('recipe')) {
                $recipe = json_decode($request->recipe, true);
                if (is_array($recipe)) {
                    foreach ($recipe as $item) {
                        $ingredient = \App\Models\Ingredient::find($item['ingredient_id']);
                        if (!$ingredient) {
                            throw new \Exception("Ingredient ID {$item['ingredient_id']} not found");
                        }

                        $bomEntries[] = \App\Models\BillOfMaterials::create([
                            'menu_id'           => $menu->id,
                            'ingredient_id'     => $item['ingredient_id'],
                            'quantity_needed'   => $item['quantity_needed'],
                            'unit'              => $item['unit'],
                            'wastage_percentage'=> $item['wastage_percentage'] ?? 0,
                        ]);
                    }
                }
            }

            \App\Models\UserActivityLog::create([
                'user_id'       => auth()->id(),
                'activity_type' => 'inventory_updated',
                'reference_id'  => $menu->id,
                'details'       => "Created menu item: {$menu->name}",
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Product created successfully',
                'product' => $menu->load(['category', 'drinkSizes', 'billOfMaterials.ingredient']),
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

    public function getMenu()
    {
        $menu = \App\Models\Menu::with('category')->get();
        return response()->json(['products' => $menu]);
    }

    public function getAllMenu()
    {
        $menu = \App\Models\Menu::with(['category', 'drinkSizes'])->get();
        return response()->json([
            'products' => $menu,
            'message'  => 'Products retrieved successfully'
        ]);
    }

    public function deleteMenu($id)
    {
        $menu = \App\Models\Menu::findOrFail($id);
        $menu->delete();

        return response()->json([
            'message' => 'Product deleted successfully'
        ]);
    }

    public function updateMenu(Request $request, $id)
    {
        $menu = \App\Models\Menu::findOrFail($id);

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
}