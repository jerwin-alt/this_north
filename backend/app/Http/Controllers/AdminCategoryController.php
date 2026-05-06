<?php

namespace App\Http\Controllers;

use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminCategoryController extends Controller
{
    // Admin only - list all categories
    public function index()
    {
        $categories = Category::orderBy('name')->get();
        return response()->json([
            'categories' => $categories,
            'message' => 'Categories retrieved successfully'
        ]);
    }

    // Admin only - create a new category
public function store(Request $request)
{
    // Convert string 'true'/'false' to boolean
    if ($request->has('is_active')) {
        $request->merge([
            'is_active' => filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN)
        ]);
    }

    $validated = $request->validate([
        'name'        => 'required|string|max:100|unique:categories,name',
        'description' => 'nullable|string',
        'is_active'   => 'boolean',
    ]);

    $category = Category::create([
        'name'        => $validated['name'],
        'description' => $validated['description'] ?? null,
        'is_active'   => $validated['is_active'] ?? true,
    ]);

    return response()->json([
        'category' => $category,
        'message'  => 'Category created successfully'
    ], 201);
}

    // Admin only - show single category
    public function show($id)
    {
        $category = Category::findOrFail($id);
        return response()->json([
            'category' => $category,
            'message'  => 'Category retrieved successfully'
        ]);
    }

    // Admin only - update category
public function update(Request $request, $id)
{
    $category = Category::findOrFail($id);

    // Convert string boolean to real boolean
    if ($request->has('is_active')) {
        $request->merge([
            'is_active' => filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN)
        ]);
    }

    $validated = $request->validate([
        'name'        => ['required', 'string', 'max:100', Rule::unique('categories')->ignore($category->id)],
        'description' => 'nullable|string',
        'is_active'   => 'boolean',
    ]);

    $category->update([
        'name'        => $validated['name'],
        'description' => $validated['description'] ?? $category->description,
        'is_active'   => $validated['is_active'] ?? $category->is_active,
    ]);

    return response()->json([
        'category' => $category,
        'message'  => 'Category updated successfully'
    ]);
}
    // Admin only - delete category (only if no menu items depend on it)
    public function destroy($id)
    {
        $category = Category::findOrFail($id);

        // Check if any menu items belong to this category
        if ($category->menuItems()->exists()) {
            return response()->json([
                'message' => 'Cannot delete category because it has associated menu items. Reassign or delete those items first.'
            ], 409);
        }

        $category->delete();

        return response()->json([
            'message' => 'Category deleted successfully'
        ]);
    }
}
