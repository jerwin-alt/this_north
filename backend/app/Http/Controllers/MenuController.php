<?php

namespace App\Http\Controllers;

use App\Models\Menu;
use Illuminate\Http\Request;

class MenuController extends Controller
{
    // =========================
    // GET ALL MENU (Customer)
    // =========================
    public function index()
{
    $categories = Category::with(['menu' => function ($query) {
        $query->where('is_active', true);
    }])->get();

    return response()->json($categories);
}
    // =========================
    // CREATE MENU (Admin)
    // =========================
    public function store(Request $request)
    {
        $validated = $request->validate([
            'category_id'     => 'required|exists:categories,id',
            'name'            => 'required|string|max:255',
            'description'     => 'nullable|string',
            'base_price'      => 'required|numeric',
            'menu_type'       => 'required|string', // drink, cake, etc.
            'stock_quantity'  => 'nullable|integer',
            'image_url'       => 'nullable|string',
        ]);

        $menu = Menu::create($validated);

        return response()->json([
            'message' => 'Menu item created successfully',
            'data' => $menu
        ], 201);
    }

    // =========================
    // GET SINGLE MENU
    // =========================
    public function show($id)
    {
        $menu = Menu::with('category')->find($id);

        if (!$menu) {
            return response()->json(['message' => 'Menu not found'], 404);
        }

        return response()->json($menu);
    }

    // =========================
    // UPDATE MENU (Admin)
    // =========================
    public function update(Request $request, $id)
    {
        $menu = Menu::find($id);

        if (!$menu) {
            return response()->json(['message' => 'Menu not found'], 404);
        }

        $menu->update($request->all());

        return response()->json([
            'message' => 'Menu updated successfully',
            'data' => $menu
        ]);
    }

    // =========================
    // DELETE MENU (Admin)
    // =========================
    public function destroy($id)
    {
        $menu = Menu::find($id);

        if (!$menu) {
            return response()->json(['message' => 'Menu not found'], 404);
        }

        $menu->delete();

        return response()->json([
            'message' => 'Menu deleted successfully'
        ]);
    }
}