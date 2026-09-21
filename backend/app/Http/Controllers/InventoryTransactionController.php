<?php

namespace App\Http\Controllers;

use App\Models\InventoryTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Menu;
use App\Models\Category;
use App\Models\BillOfMaterials;

class InventoryTransactionController extends Controller
{
    /**
     * GET /api/inventory/product-sales
     * Uses inventory usage to track product sales.
     */
    public function productSales(Request $request)
    {
        $start = $request->input('start', now()->subDays(30)->toDateString());
        $end   = $request->input('end', now()->toDateString());

        $sales = InventoryTransaction::query()
            ->join('ingredients', 'inventory_transactions.ingredient_id', '=', 'ingredients.id')
            ->where('inventory_transactions.transaction_type', 'usage')
            ->whereBetween('inventory_transactions.created_at', [
                $start . ' 00:00:00',
                $end . ' 23:59:59'
            ])
            ->select(
                'ingredients.name as ingredient_name',
                DB::raw('SUM(inventory_transactions.quantity) as total_used')
            )
            ->groupBy('ingredients.id', 'ingredients.name')
            ->orderByDesc('total_used')
            ->get();

        return response()->json(['sales' => $sales]);
    }

    /**
     * GET /api/inventory/ingredient-transactions
     * Now supports pagination via page and per_page query parameters.
     */
    public function ingredientTransactions(Request $request)
    {
        $type      = $request->input('type');
        $search    = trim((string) $request->input('search', ''));
        $year      = $request->input('year');
        $month     = $request->input('month');
        $weekStart = $request->input('week_start');
        $dayOffset = $request->input('day_offset');
        $start     = $request->input('start');
        $end       = $request->input('end');
        $perPage   = max(1, min(10000, (int) $request->input('per_page', 20)));

        $cashierId = $request->input('cashier_id');

        $query = InventoryTransaction::with('ingredient:id,name,unit')
            ->with('createdBy:id,first_name,last_name');

        // ── Date filters ──
        if ($year) {
            $query->whereYear('created_at', (int) $year);
        } elseif ($start && $end) {
            // legacy fallback
            $query->whereBetween('created_at', [
                $start . ' 00:00:00',
                $end   . ' 23:59:59',
            ]);
        } else {
            // default: last 30 days (preserves old behaviour when no filters given)
            $query->whereBetween('created_at', [
                now()->subDays(30)->toDateString() . ' 00:00:00',
                now()->toDateString() . ' 23:59:59',
            ]);
        }

        if ($month) {
            $query->whereMonth('created_at', (int) $month);
        }

        if ($weekStart) {
            $wStart = \Carbon\Carbon::parse($weekStart)->startOfWeek(\Carbon\Carbon::MONDAY);
            if ($dayOffset !== null && $dayOffset !== '') {
                $wStart = $wStart->copy()->addDays((int) $dayOffset)->startOfDay();
                $wEnd   = $wStart->copy()->endOfDay();
            } else {
                $wEnd = $wStart->copy()->endOfWeek(\Carbon\Carbon::SUNDAY);
            }
            $query->whereBetween('created_at', [
                $wStart->toDateTimeString(),
                $wEnd->toDateTimeString(),
            ]);
        }

        // ── Type filter ──
        if ($type && in_array($type, ['purchase', 'usage', 'adjustment'], true)) {
            $query->where('transaction_type', $type);
        }

        // ── Search ──
        // Match ingredient by name, OR by BOM of a matching product, OR by BOM of a
        // product in a matching category. If nothing matches, return an empty set.
        if ($search !== '') {
            $matchedIngredient = \App\Models\Ingredient::where('name', 'like', "%{$search}%")->first();
            $matchedProduct    = Menu::where('name', 'like', "%{$search}%")->first();
            $matchedCategory   = null;

            if (!$matchedIngredient && !$matchedProduct) {
                $matchedCategory = Category::where('name', 'like', "%{$search}%")->first();
            }

            $ingredientIds = [];

            if ($matchedIngredient) {
                $ingredientIds[] = $matchedIngredient->id;
            }
            if ($matchedProduct) {
                $ingredientIds = array_merge(
                    $ingredientIds,
                    BillOfMaterials::where('menu_id', $matchedProduct->id)
                        ->pluck('ingredient_id')->toArray()
                );
            }
            if ($matchedCategory) {
                $ingredientIds = array_merge(
                    $ingredientIds,
                    BillOfMaterials::whereHas('menu', fn ($q) => $q->where('category_id', $matchedCategory->id))
                        ->pluck('ingredient_id')->toArray()
                );
            }

            $ingredientIds = array_values(array_unique($ingredientIds));

            if (!empty($ingredientIds)) {
                $query->whereIn('ingredient_id', $ingredientIds);
            } else {
                $query->whereRaw('1 = 0');
            }
        }

        if ($cashierId) {
            $query->where('created_by', (int) $cashierId);
        }

        $transactions = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json(['transactions' => $transactions]);
    }
}