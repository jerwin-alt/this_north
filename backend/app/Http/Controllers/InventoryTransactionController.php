<?php

namespace App\Http\Controllers;

use App\Models\InventoryTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InventoryTransactionController extends Controller
{
    /**
     * GET /api/inventory/product-sales
     * FIXED: Uses inventory usage instead of orders
     */
    public function productSales(Request $request)
    {
        $start = $request->input('start', now()->subDays(30)->toDateString());
        $end   = $request->input('end', now()->toDateString());

        $sales = InventoryTransaction::query()
            ->join('ingredients', 'inventory_transactions.ingredient_id', '=', 'ingredients.id')

            // ✅ Only usage (meaning ingredients used → products made/sold)
            ->where('inventory_transactions.transaction_type', 'usage')

            ->whereBetween('inventory_transactions.created_at', [
                $start . ' 00:00:00',
                $end . ' 23:59:59'
            ])

            ->select(
                'ingredients.name as ingredient_name',

                // total used (acts as "sales indicator")
                DB::raw('SUM(inventory_transactions.quantity) as total_used')
            )

            ->groupBy('ingredients.id', 'ingredients.name')
            ->orderByDesc('total_used')
            ->get();

        return response()->json([
            'sales' => $sales
        ]);
    }

    /**
     * GET /api/inventory/ingredient-transactions
     * (UNCHANGED — already correct)
     */
    public function ingredientTransactions(Request $request)
    {
        $type  = $request->input('type');
        $start = $request->input('start', now()->subDays(30)->toDateString());
        $end   = $request->input('end', now()->toDateString());

        $query = InventoryTransaction::with('ingredient:id,name,unit')
            ->with('createdBy:id,first_name,last_name')
            ->whereBetween('created_at', [
                $start . ' 00:00:00',
                $end . ' 23:59:59'
            ])
            ->orderBy('created_at', 'desc');

        if ($type && in_array($type, ['purchase', 'usage', 'adjustment'])) {
            $query->where('transaction_type', $type);
        }

        return response()->json([
            'transactions' => $query->get()
        ]);
    }
}