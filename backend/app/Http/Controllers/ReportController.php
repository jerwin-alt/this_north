<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Menu;
use App\Models\Category;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;

class ReportController extends Controller
{
    public function index(Request $request)
    {
        $type      = $request->input('type', 'all');
        $search    = trim((string) $request->input('search', ''));
        $year      = (int) $request->input('year', now()->year);
        $period    = $request->input('period', 'whole');
        $month     = $request->input('month');
        $weekStart = $request->input('week_start');

        $perPage = max(1, min(10000, (int) $request->input('per_page', 20)));
        $page    = max(1, (int) $request->input('page', 1));
        $cashierId = $request->input('cashier_id');

        /* ───── Resolve search ───── */
        $matchedProduct  = null;
        $matchedCategory = null;

        if ($search !== '') {
            if ($type === 'product') {
                $matchedProduct = Menu::where('name', 'like', "%{$search}%")->first();
            } elseif ($type === 'category') {
                $matchedCategory = Category::where('name', 'like', "%{$search}%")->first();
            } else {
                $matchedProduct  = Menu::where('name', 'like', "%{$search}%")->first();
                $matchedCategory = Category::where('name', 'like', "%{$search}%")->first();
                if ($matchedCategory) $matchedProduct = null;
            }

            if (!$matchedProduct && !$matchedCategory) {
                return response()->json([
                    'summary' => [
                        'total_income'        => 0,
                        'total_transactions'  => 0,
                        'average_transaction' => 0,
                    ],
                    'transactions'     => new LengthAwarePaginator([], 0, $perPage, 1),
                    'matched_product'  => null,
                    'matched_category' => null,
                    'available_years'  => $this->getAvailableYears(),
                ]);
            }
        }

        /* ───── Base order query — completed only ───── */
        $orderQuery = Order::query()
            ->where('status', 'completed')
            ->whereYear('order_date', $year)
            ->with(['items.menu.category', 'items.customDesign']);

        if ($period === 'monthly' && $month) {
            $orderQuery->whereMonth('order_date', (int) $month);
        } elseif ($period === 'weekly' && $weekStart) {
            $start = Carbon::parse($weekStart)->startOfWeek(Carbon::MONDAY);
            $end   = $start->copy()->endOfWeek(Carbon::SUNDAY);
            $orderQuery->whereBetween('order_date', [
                $start->toDateString() . ' 00:00:00',
                $end->toDateString()   . ' 23:59:59',
            ]);
        }

        if ($matchedProduct) {
            $orderQuery->whereHas('items', fn ($q) => $q->where('menu_id', $matchedProduct->id));
        } elseif ($matchedCategory) {
            $orderQuery->whereHas('items.menu', fn ($q) => $q->where('category_id', $matchedCategory->id));
        }

        if ($cashierId) {
            // Cashier = staff user who created the walk-in order.
            // Customer orders have created_by = customer_id, so they are naturally excluded.
            $orderQuery->where('created_by', (int) $cashierId);
        }

        // ── NEW: Discount filter ──
        $discountFilter = $request->input('discount_filter', 'all');

        if ($discountFilter === 'pwd') {
            $orderQuery->whereNotNull('discount_id')
                ->where('discount_total', '>', 0)
                ->where(function ($q) {
                    $q->whereHas('discount', fn ($sub) =>
                            $sub->where('discount_name', 'like', '%pwd%'))
                    ->orWhereHas('customer', fn ($sub) =>
                            $sub->where('verification_type', 'pwd'));
                });
        } elseif ($discountFilter === 'senior_citizen') {
            $orderQuery->whereNotNull('discount_id')
                ->where('discount_total', '>', 0)
                ->where(function ($q) {
                    $q->whereHas('discount', fn ($sub) =>
                            $sub->where('discount_name', 'like', '%senior%'))
                    ->orWhereHas('customer', fn ($sub) =>
                            $sub->where('verification_type', 'senior_citizen'));
                });
        }

        $orders = $orderQuery->orderBy('order_date', 'desc')->get();

        /* ───── Flatten to item-level rows ───── */
        $rows = [];
        foreach ($orders as $order) {
            if ($order->status !== 'completed') continue;
            $orderType = $this->resolveOrderType($order);

            foreach ($order->items as $item) {
                if ($matchedProduct && (int) $item->menu_id !== (int) $matchedProduct->id) continue;
                if ($matchedCategory) {
                    $catId = $item->menu?->category_id;
                    if ((int) $catId !== (int) $matchedCategory->id) continue;
                }

                $isCustom = $item->cake_type === 'custom';

                $rows[] = [
                    'id'            => 'item-' . $item->id,
                    'order_id'      => $order->id,
                    'order_number'  => $order->order_number,
                    'date'          => optional($order->order_date)->format('Y-m-d'),
                    'product_name'  => $isCustom
                        ? ($item->customDesign?->design_name ?: 'Custom Cake')
                        : ($item->menu?->name ?? 'Unknown Product'),
                    'category_name' => $isCustom
                        ? 'Custom Cakes'
                        : ($item->menu?->category?->name ?? 'Uncategorized'),
                    'order_type'    => $orderType,
                    'quantity'      => (int)   $item->quantity,
                    'unit_price'    => (float) $item->unit_price,
                    'line_total'    => (float) $item->total_price,
                    'discount'      => (float) $item->discount_amount,
                    'order_status'  => $order->status,
                    'payment_status'=> $order->payment_status,
                    'customer_name' => $order->customer_name ?: 'Walk-in Customer',
                ];
            }
        }

        /* ───── Summary computed from ALL filtered rows ───── */
        $totalIncome        = array_sum(array_column($rows, 'line_total'));
        $uniqueOrderIds     = array_values(array_unique(array_column($rows, 'order_id')));
        $totalTransactions  = count($uniqueOrderIds);
        $averageTransaction = $totalTransactions > 0
            ? round($totalIncome / $totalTransactions, 2)
            : 0;

        /* ───── Paginate rows for display ───── */
        $total    = count($rows);
        $offset   = ($page - 1) * $perPage;
        $pageRows = array_slice($rows, $offset, $perPage);

        $paginator = new LengthAwarePaginator(
            $pageRows,
            $total,
            $perPage,
            $page,
            ['path' => $request->url(), 'query' => $request->query()]
        );

        return response()->json([
            'summary' => [
                'total_income'        => $totalIncome,
                'total_transactions'  => $totalTransactions,
                'average_transaction' => $averageTransaction,
            ],
            'transactions'     => $paginator,
            'matched_product'  => $matchedProduct
                ? ['id' => $matchedProduct->id,  'name' => $matchedProduct->name]
                : null,
            'matched_category' => $matchedCategory
                ? ['id' => $matchedCategory->id, 'name' => $matchedCategory->name]
                : null,
            'available_years'  => $this->getAvailableYears(),
        ]);
    }

    /**
     * Determine the real order type from the existing schema.
     *  - No customer_id → staff-created walk-in
     *  - Any item is a custom cake → Custom Cake Order
     *  - Otherwise → customer-placed Online Order
     */
    private function resolveOrderType(Order $order): string
    {
        if (is_null($order->customer_id)) {
            return 'Walk-in Order';
        }

        $hasCustom = $order->items->contains(fn ($item) => $item->cake_type === 'custom');

        return $hasCustom ? 'Custom Cake Order' : 'Online Order';
    }

    /**
     * Years that have at least one completed order — always includes the current
     * year and 2026 (the required minimum).
     */
    private function getAvailableYears(): array
    {
        $years = Order::query()
            ->where('status', 'completed')
            ->selectRaw('YEAR(order_date) as yr')
            ->distinct()
            ->pluck('yr')
            ->filter()
            ->map(fn ($y) => (int) $y)
            ->toArray();

        $years[] = (int) now()->year;
        $years[] = 2026;

        $years = array_values(array_unique($years));
        sort($years);

        return $years;
    }
}