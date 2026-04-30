<?php

namespace App\Http\Controllers;

use App\Models\InventoryTransaction;
use App\Models\Ingredient;
use App\Models\UserActivityLog;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;

class InventoryTransactionController extends Controller
{
    /**
     * Display a listing of all inventory transactions.
     * Admin only – returns latest first.
     */
    public function index()
    {
        $transactions = InventoryTransaction::with(['ingredient', 'createdBy'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'transactions' => $transactions,
            'message'      => 'Inventory transactions retrieved successfully'
        ]);
    }

    /**
     * Store a newly created inventory transaction.
     * This records a purchase, usage, or adjustment of an ingredient.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'ingredient_id'    => 'required|exists:ingredients,id',
            'transaction_type' => 'required|in:purchase,usage,adjustment',
            'quantity'         => 'required|numeric|min:0',
            'reference_type'   => 'nullable|in:order,purchase_order,adjustment',
            'reference_id'     => 'nullable|integer',
            'notes'            => 'nullable|string',
        ]);

        // Lock ingredient row to avoid race conditions
        DB::beginTransaction();
        try {
            $ingredient = Ingredient::where('id', $validated['ingredient_id'])
                ->lockForUpdate()
                ->firstOrFail();

            $oldStock = $ingredient->current_stock;
            $newStock = $oldStock;

            if ($validated['transaction_type'] === 'usage') {
                if ($validated['quantity'] > $oldStock) {
                    return response()->json([
                        'message' => 'Insufficient stock for usage transaction'
                    ], 422);
                }
                $newStock -= $validated['quantity'];
            } else {
                // purchase or adjustment adds stock
                $newStock += $validated['quantity'];
            }

            // Create transaction record
            $transaction = InventoryTransaction::create([
                'ingredient_id'    => $validated['ingredient_id'],
                'transaction_type' => $validated['transaction_type'],
                'quantity'         => $validated['quantity'],
                'previous_stock'   => $oldStock,
                'new_stock'        => $newStock,
                'reference_type'   => $validated['reference_type'] ?? null,
                'reference_id'     => $validated['reference_id'] ?? null,
                'notes'            => $validated['notes'] ?? null,
                'created_by'       => auth()->id(),
                'created_at'       => now(),
            ]);

            // Update ingredient stock
            $ingredient->update(['current_stock' => $newStock]);

            // Log activity
            UserActivityLog::create([
                'user_id'       => auth()->id(),
                'activity_type' => 'inventory_updated',
                'reference_id'  => $transaction->id,
                'details'       => "{$validated['transaction_type']}: {$validated['quantity']} {$ingredient->unit} of {$ingredient->name}",
            ]);

            DB::commit();

            return response()->json([
                'message'     => 'Inventory transaction created successfully',
                'transaction' => $transaction->load(['ingredient', 'createdBy']),
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Inventory transaction creation failed: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to create inventory transaction',
                'error'   => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified inventory transaction.
     */
    public function show($id)
    {
        $transaction = InventoryTransaction::with(['ingredient', 'createdBy'])
            ->findOrFail($id);

        return response()->json([
            'transaction' => $transaction,
            'message'     => 'Transaction retrieved successfully'
        ]);
    }

    /**
     * Update the specified inventory transaction.
     * Note: Updating a transaction will also adjust the ingredient's stock accordingly.
     * (Changes are applied as a delta from the original transaction)
     */
    public function update(Request $request, $id)
    {
        $transaction = InventoryTransaction::findOrFail($id);

        $validated = $request->validate([
            'transaction_type' => 'sometimes|required|in:purchase,usage,adjustment',
            'quantity'         => 'sometimes|required|numeric|min:0',
            'reference_type'   => 'nullable|in:order,purchase_order,adjustment',
            'reference_id'     => 'nullable|integer',
            'notes'            => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            $ingredient = Ingredient::where('id', $transaction->ingredient_id)
                ->lockForUpdate()
                ->firstOrFail();

            // Calculate effect of original transaction on stock
            $oldEffect = $transaction->new_stock - $transaction->previous_stock;

            // Determine new effect based on updated fields
            $newType = $validated['transaction_type'] ?? $transaction->transaction_type;
            $newQty = $validated['quantity'] ?? $transaction->quantity;

            if ($newType === 'usage') {
                $newEffect = -$newQty;
            } else {
                $newEffect = $newQty;
            }

            $delta = $newEffect - $oldEffect;

            // Check if new stock would go negative
            $potentialNewStock = $ingredient->current_stock + $delta;
            if ($potentialNewStock < 0 && $newType === 'usage') {
                return response()->json([
                    'message' => 'Update would cause negative stock'
                ], 422);
            }

            // Update transaction record
            $transaction->update([
                'transaction_type' => $newType,
                'quantity'         => $newQty,
                'reference_type'   => $validated['reference_type'] ?? $transaction->reference_type,
                'reference_id'     => $validated['reference_id'] ?? $transaction->reference_id,
                'notes'            => $validated['notes'] ?? $transaction->notes,
                // Recalculate new_stock based on updated values
                // We need previous_stock to remain the same as when transaction was created?
                // Actually previous_stock should be the stock at time of transaction.
                // For simplicity, if you allow updates, you might want to recompute previous_stock?
                // Better: do NOT allow updates to quantity/type once created.
                // But requirement says full CRUD, so we'll adjust stock accordingly.
                'new_stock'        => $transaction->previous_stock + $newEffect,
            ]);

            // Adjust ingredient stock by delta
            $ingredient->update(['current_stock' => $potentialNewStock]);

            // Log activity
            UserActivityLog::create([
                'user_id'       => auth()->id(),
                'activity_type' => 'inventory_updated',
                'reference_id'  => $transaction->id,
                'details'       => "Updated inventory transaction (ID: {$transaction->id})",
            ]);

            DB::commit();

            return response()->json([
                'message'     => 'Inventory transaction updated successfully',
                'transaction' => $transaction->fresh(['ingredient', 'createdBy']),
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Inventory transaction update failed: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to update inventory transaction',
                'error'   => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified inventory transaction.
     * Deleting a transaction will reverse its effect on the ingredient's stock.
     */
    public function destroy($id)
    {
        $transaction = InventoryTransaction::findOrFail($id);

        DB::beginTransaction();
        try {
            $ingredient = Ingredient::where('id', $transaction->ingredient_id)
                ->lockForUpdate()
                ->firstOrFail();

            // Reverse the effect of this transaction
            $oldEffect = $transaction->new_stock - $transaction->previous_stock;
            $newStock = $ingredient->current_stock - $oldEffect;

            if ($newStock < 0) {
                return response()->json([
                    'message' => 'Deleting this transaction would cause negative stock'
                ], 422);
            }

            $ingredient->update(['current_stock' => $newStock]);

            $transaction->delete();

            // Log activity
            UserActivityLog::create([
                'user_id'       => auth()->id(),
                'activity_type' => 'inventory_updated',
                'reference_id'  => $id,
                'details'       => "Deleted inventory transaction (ID: {$id})",
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Inventory transaction deleted successfully'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Inventory transaction deletion failed: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to delete inventory transaction',
                'error'   => $e->getMessage()
            ], 500);
        }
    }
}