<?php

namespace App\Http\Controllers;

use App\Models\LostAndDamage;
use App\Models\Menu;
use App\Models\Ingredient;
use App\Models\OrderItem;
use App\Models\UserActivityLog;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;


class StaffLostAndDamageController extends Controller
{
    /**
     * GET /api/staff/lost-and-damages
     * Staff can view all reports (operational visibility).
     */
    public function index(Request $request)
    {
        $query = LostAndDamage::with([
            'reportedBy:id,first_name,last_name',
            'approvedBy:id,first_name,last_name',
            'order:id,order_number',
        ]);

        // ── Status filter ──
        if ($request->filled('status') && in_array($request->status, ['pending', 'approved', 'rejected'], true)) {
            $query->where('status', $request->status);
        }

        // ── Item type filter ──
        if ($request->filled('item_type') && in_array($request->item_type, ['product', 'ingredient'], true)) {
            $query->where('item_type', $request->item_type);
        }

        // ── Damage type filter ──
        if ($request->filled('damage_type')) {
            $query->where('damage_type', $request->damage_type);
        }

        // ── Search (matches description OR resolved item name) ──
        if ($request->filled('search')) {
            $search = trim($request->search);

            $menuIds = Menu::where('name', 'like', "%{$search}%")->pluck('id')->toArray();
            $ingredientIds = Ingredient::where('name', 'like', "%{$search}%")->pluck('id')->toArray();

            $query->where(function ($q) use ($search, $menuIds, $ingredientIds) {
                $q->where('description', 'like', "%{$search}%");

                if (!empty($menuIds)) {
                    $q->orWhere(function ($sub) use ($menuIds) {
                        $sub->where('item_type', 'product')
                            ->whereIn('item_id', $menuIds);
                    });
                }
                if (!empty($ingredientIds)) {
                    $q->orWhere(function ($sub) use ($ingredientIds) {
                        $sub->where('item_type', 'ingredient')
                            ->whereIn('item_id', $ingredientIds);
                    });
                }
            });
        }

        // ── Date range ──
        if ($request->filled('start_date')) {
            $query->whereDate('reported_at', '>=', $request->start_date);
        }
        if ($request->filled('end_date')) {
            $query->whereDate('reported_at', '<=', $request->end_date);
        }

        $perPage = max(1, min(200, (int) $request->input('per_page', 50)));
        $records = $query->orderBy('reported_at', 'desc')->paginate($perPage);

        return response()->json([
            'records' => $records,
            'message' => 'Lost & damage records retrieved successfully.',
        ]);
    }

    /**
     * GET /api/staff/lost-and-damages/{id}
     */
    public function show($id)
    {
        $record = LostAndDamage::with([
            'reportedBy:id,first_name,last_name,email',
            'approvedBy:id,first_name,last_name,email',
            'order:id,order_number,customer_name',
            'orderItem:id,order_id,menu_id,quantity,unit_price',
        ])->findOrFail($id);

        return response()->json(['record' => $record]);
    }

    /**
     * POST /api/staff/lost-and-damages
     *
     * Creates a new loss/damage report. Always starts as `pending`.
     *
     * When the report originates from an order (the new primary flow), the
     * request must also include `order_id` and `order_item_id` so the record
     * is properly linked to the order and the specific line item. The
     * controller cross-validates that the order item actually belongs to the
     * specified order and that the product matches the order item's menu_id.
     *
     * Stock is NOT deducted here — the admin must approve the report on the
     * Admin Lost & Damages page for that to happen.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'item_id'        => 'required|integer|min:1',
            'item_type'      => ['required', Rule::in(['product', 'ingredient'])],
            'quantity'       => 'required|numeric|min:0.01',
            'unit'           => 'required|string|max:20',
            'estimated_cost' => 'required|numeric|min:0',
            'damage_type'    => ['required', Rule::in(['spoilage', 'breakage', 'expired', 'misproduction'])],
            'description'    => 'nullable|string|max:1000',
            'order_id'       => 'nullable|integer|exists:orders,id',
            'order_item_id'  => 'nullable|integer|exists:order_items,id',
        ]);

        // ── If order context is provided, validate cross-consistency ──
        if (!empty($validated['order_item_id'])) {
            $orderItem = OrderItem::find($validated['order_item_id']);

            if (!$orderItem) {
                return response()->json(['message' => 'Order item not found.'], 404);
            }

            // Order item must belong to the specified order
            if (!empty($validated['order_id'])
                && (int) $orderItem->order_id !== (int) $validated['order_id']) {
                return response()->json([
                    'message' => 'Order item does not belong to the specified order.',
                ], 422);
            }

            // For product reports, the item_id must match the order item's menu_id
            if ($validated['item_type'] === 'product'
                && (int) $orderItem->menu_id !== (int) $validated['item_id']) {
                return response()->json([
                    'message' => 'Product does not match the order item.',
                ], 422);
            }

            // Quantity must not exceed the ordered quantity for that line item
            if ((float) $validated['quantity'] > (float) $orderItem->quantity) {
                return response()->json([
                    'message' => "Quantity ({$validated['quantity']}) exceeds order item quantity ({$orderItem->quantity}).",
                ], 422);
            }
        }

        // ── Verify the referenced item actually exists in the correct table ──
        $item = null;
        if ($validated['item_type'] === 'product') {
            $item = Menu::find($validated['item_id']);
        } else {
            $item = Ingredient::find($validated['item_id']);
        }

        if (!$item) {
            return response()->json(['message' => 'Item not found.'], 404);
        }

        // ── Create the record (status = pending, no stock deduction) ──
        $record = LostAndDamage::create([
            'order_id'       => $validated['order_id']      ?? null,
            'order_item_id'  => $validated['order_item_id'] ?? null,
            'item_id'        => $validated['item_id'],
            'item_type'      => $validated['item_type'],
            'quantity'       => $validated['quantity'],
            'unit'           => $validated['unit'],
            'estimated_cost' => $validated['estimated_cost'],
            'damage_type'    => $validated['damage_type'],
            'description'    => $validated['description'] ?? null,
            'reported_by'    => auth()->id(),
            'reported_at'    => now(),
            'status'         => 'pending',
        ]);

        // ── Audit log ──
        $orderRef = $record->order?->order_number
            ? " (Order #{$record->order->order_number})"
            : '';

        UserActivityLog::create([
            'user_id'       => auth()->id(),
            'activity_type' => 'damage_reported',
            'reference_id'  => $record->id,
            'details'       => "Reported lost/damage for {$validated['item_type']} #{$validated['item_id']}{$orderRef} ({$validated['damage_type']}, qty {$validated['quantity']} {$validated['unit']})",
        ]);

        return response()->json([
            'message' => 'Lost/damage report submitted. Waiting for admin approval.',
            'record'  => $record->load([
                'reportedBy:id,first_name,last_name',
                'order:id,order_number',
            ]),
        ], 201);
    }


    /**
     * GET /api/staff/lost-and-damages/items
     *
     * Returns the list of products and ingredients the staff can pick from
     * when creating a general loss/damage report (not tied to an order).
     */
    public function items()
    {
        $products = Menu::where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'sku', 'base_price', 'stock_quantity']);

        // Attach a simple unit so the frontend can prefill it
        $products = $products->map(function ($p) {
            $p->unit = 'PCS';
            return $p;
        });

        $ingredients = Ingredient::where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'unit', 'current_stock']);

        return response()->json([
            'products'    => $products,
            'ingredients' => $ingredients,
        ]);
    }
}