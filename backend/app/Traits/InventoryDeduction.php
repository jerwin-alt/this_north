<?php

namespace App\Traits;

use App\Models\BillOfMaterials;
use App\Models\Ingredient;
use App\Models\InventoryTransaction;
use App\Models\UserActivityLog;
use Illuminate\Support\Facades\DB;

trait InventoryDeduction
{
    /**
     * Deduct ingredients for all items in the order based on their BOM.
     * Throws an exception if any ingredient stock is insufficient.
     */
    protected function deductIngredientsForOrder($order)
    {
        foreach ($order->items as $item) {
            // Skip custom items (no menu_id)
            if (is_null($item->menu_id)) {
                continue;
            }

            $bomItems = BillOfMaterials::where('menu_id', $item->menu_id)->get();
            if ($bomItems->isEmpty()) {
                continue;
            }

            foreach ($bomItems as $bom) {
                $ingredient = Ingredient::lockForUpdate()->find($bom->ingredient_id);
                if (!$ingredient) {
                    throw new \Exception("Ingredient ID {$bom->ingredient_id} not found.");
                }

                $totalNeeded = $bom->quantity_needed * $item->quantity;

                if ($ingredient->current_stock < $totalNeeded) {
                    throw new \Exception(
                        "Insufficient stock for {$ingredient->name}. " .
                        "Needed: {$totalNeeded} {$bom->unit}, " .
                        "Available: {$ingredient->current_stock} {$bom->unit}"
                    );
                }

                $previousStock = $ingredient->current_stock;
                $newStock = $previousStock - $totalNeeded;

                $ingredient->update(['current_stock' => $newStock]);

                InventoryTransaction::create([
                    'ingredient_id'    => $ingredient->id,
                    'transaction_type' => 'usage',
                    'quantity'         => $totalNeeded,
                    'previous_stock'   => $previousStock,
                    'new_stock'        => $newStock,
                    'reference_type'   => 'order',
                    'reference_id'     => $order->id,
                    'notes'            => "Usage for order {$order->order_number}, item {$item->menu->name} x{$item->quantity}",
                    'created_by'       => auth()->id(),
                ]);

                UserActivityLog::create([
                    'user_id'       => auth()->id(),
                    'activity_type' => 'inventory_updated',
                    'reference_id'  => $ingredient->id,
                    'details'       => "Deducted {$totalNeeded} {$bom->unit} of {$ingredient->name} for order {$order->order_number}",
                ]);
            }
        }
    }
}