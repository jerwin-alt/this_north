<?php

namespace App\Http\Controllers;

use App\Models\Ingredient;
use App\Models\InventoryTransaction;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;

class AdminIngredientController extends Controller
{
    /**
     * GET /api/ingredients
     */
    public function index()
    {
        $ingredients = Ingredient::orderBy('name')->get();
        return response()->json(['ingredients' => $ingredients]);
    }

    /**
     * POST /api/ingredients
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'          => 'required|string|max:100|unique:ingredients,name',
            'unit'          => 'required|string|max:20',
            'scale_per_uni' => 'nullable|string|max:100',
            'current_stock' => 'nullable|numeric|min:0',
            'is_active'     => 'boolean',
        ]);

        $ingredient = Ingredient::create([
            'name'          => $validated['name'],
            'unit'          => $validated['unit'],
            'scale_per_uni' => $validated['scale_per_uni'] ?? null,
            'current_stock' => $validated['current_stock'] ?? 0,
            'is_active'     => $validated['is_active'] ?? true,
        ]);

        // Log activity
        \App\Models\UserActivityLog::create([
            'user_id'       => auth()->id(),
            'activity_type' => 'inventory_updated',
            'reference_id'  => $ingredient->id,
            'details'       => "Created ingredient: {$ingredient->name}",
        ]);

        return response()->json([
            'message'    => 'Ingredient created successfully',
            'ingredient' => $ingredient,
        ], 201);
    }

    /**
     * GET /api/ingredients/{id}
     */
public function show($id)
{
    $ingredient = Ingredient::find($id);
    if (!$ingredient) {
        return response()->json([
            'message' => 'Ingredient not found',
            'id' => $id
        ], 404);
    }
    return response()->json(['ingredient' => $ingredient]);
}

    /**
     * PUT /api/ingredients/{id}
     */
    public function update(Request $request, $id)
    {
        $ingredient = Ingredient::findOrFail($id);

        $validated = $request->validate([
            'name'          => ['required', 'string', 'max:100', Rule::unique('ingredients')->ignore($ingredient->id)],
            'unit'          => 'required|string|max:20',
            'scale_per_uni' => 'nullable|string|max:100',
            'current_stock' => 'nullable|numeric|min:0',
            'is_active'     => 'boolean',
        ]);

        $ingredient->update($validated);

        return response()->json([
            'message'    => 'Ingredient updated successfully',
            'ingredient' => $ingredient,
        ]);
    }

    /**
     * DELETE /api/ingredients/{id}
     */
    public function destroy($id)
    {
        $ingredient = Ingredient::findOrFail($id);

        // Prevent deletion if used in any Bill of Materials
        if ($ingredient->billOfMaterials()->exists()) {
            return response()->json([
                'message' => 'Cannot delete ingredient because it is used in product recipes (Bill of Materials).'
            ], 409);
        }

        $ingredient->delete();
        return response()->json(['message' => 'Ingredient deleted successfully']);
    }

    /**
     * POST /api/ingredients/{id}/adjust-stock
     */
    public function adjustStock(Request $request, $id)
    {
        $ingredient = Ingredient::findOrFail($id);

        $validated = $request->validate([
            'transaction_type' => 'required|in:purchase,usage,adjustment',
            'quantity'         => 'required|numeric|min:0',
            'reference_type'   => 'nullable|in:order,purchase_order,adjustment',
            'reference_id'     => 'nullable|integer',
            'notes'            => 'nullable|string',
        ]);

        $oldStock = $ingredient->current_stock;
        $newStock = $oldStock;

        if ($validated['transaction_type'] === 'usage') {
            if ($validated['quantity'] > $oldStock) {
                return response()->json(['message' => 'Insufficient stock for usage'], 422);
            }
            $newStock -= $validated['quantity'];
        } else {
            // purchase or adjustment adds stock
            $newStock += $validated['quantity'];
        }

        DB::beginTransaction();
        try {
            // Create transaction record
            InventoryTransaction::create([
                'ingredient_id'    => $ingredient->id,
                'transaction_type' => $validated['transaction_type'],
                'quantity'         => $validated['quantity'],
                'previous_stock'   => $oldStock,
                'new_stock'        => $newStock,
                'reference_type'   => $validated['reference_type'] ?? null,
                'reference_id'     => $validated['reference_id'] ?? null,
                'notes'            => $validated['notes'] ?? null,
                'created_by'       => auth()->id(),
            ]);

            // Update ingredient stock
            $ingredient->update(['current_stock' => $newStock]);

            // Log activity
            \App\Models\UserActivityLog::create([
                'user_id'       => auth()->id(),
                'activity_type' => 'inventory_updated',
                'reference_id'  => $ingredient->id,
                'details'       => "{$validated['transaction_type']}: {$validated['quantity']} {$ingredient->unit} of {$ingredient->name}",
            ]);

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Stock adjustment failed', 'error' => $e->getMessage()], 500);
        }

        return response()->json([
            'message'     => 'Stock adjusted successfully',
            'ingredient'  => $ingredient->fresh(),
            'transaction' => $transaction ?? null,
        ]);
    }

    /**
     * GET /api/ingredients/{id}/transactions
     */
    public function transactions($id)
    {
        $ingredient = Ingredient::findOrFail($id);
        $transactions = $ingredient->inventoryTransactions()
            ->with('createdBy')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['transactions' => $transactions]);
    }
}