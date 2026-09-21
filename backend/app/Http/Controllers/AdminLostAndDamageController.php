<?php

namespace App\Http\Controllers;

use App\Models\LostAndDamage;
use App\Models\Menu;
use App\Models\Ingredient;
use App\Models\InventoryTransaction;
use App\Models\UserActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AdminLostAndDamageController extends Controller
{
    /**
     * GET /api/admin/lost-and-damages
     * List all records with optional filters.
     */
    public function index(Request $request)
    {
        $isIngredientOnly = $request->filled('item_type')
                        && $request->item_type === 'ingredient';

        if ($isIngredientOnly) {
            // ── When filtering by ingredient, return ALL ingredient rows flat
            //    (direct reports + auto-deducted BOM children). Root/child
            //    distinction is irrelevant to the admin in this view.
            $query = LostAndDamage::with([
                    'reportedBy:id,first_name,last_name',
                    'approvedBy:id,first_name,last_name',
                    'order:id,order_number',
                    'parent:id,item_id,item_type',
                ])
                ->where('item_type', 'ingredient');
        } else {
            // ── Default: paginate on roots only (existing behaviour). ──
            $query = LostAndDamage::with([
                    'reportedBy:id,first_name,last_name',
                    'approvedBy:id,first_name,last_name',
                    'order:id,order_number',
                ])
                ->whereNull('parent_id');

            if ($request->filled('item_type') && $request->item_type === 'product') {
                $query->where('item_type', 'product');
            }
        }

        // ── Status filter ──
        if ($request->filled('status') && in_array($request->status, ['pending', 'approved', 'rejected'], true)) {
            $query->where('status', $request->status);
        }

        // ── Damage type filter ──
        if ($request->filled('damage_type')) {
            $query->where('damage_type', $request->damage_type);
        }

        // ── Search ──
        if ($request->filled('search')) {
            $search = trim($request->search);
            $menuIds = Menu::where('name', 'like', "%{$search}%")->pluck('id')->toArray();
            $ingredientIds = Ingredient::where('name', 'like', "%{$search}%")->pluck('id')->toArray();

            $query->where(function ($q) use ($search, $menuIds, $ingredientIds) {
                $q->where('description', 'like', "%{$search}%");
                if (!empty($menuIds)) {
                    $q->orWhere(fn($sub) => $sub->where('item_type', 'product')->whereIn('item_id', $menuIds));
                }
                if (!empty($ingredientIds)) {
                    $q->orWhere(fn($sub) => $sub->where('item_type', 'ingredient')->whereIn('item_id', $ingredientIds));
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

        // ── Attach child rows grouped by parent_id ──
        $rootIds = collect($records->items())->pluck('id')->toArray();
        $children = LostAndDamage::with([
                'reportedBy:id,first_name,last_name',
                'approvedBy:id,first_name,last_name',
            ])
            ->whereIn('parent_id', $rootIds)
            ->orderBy('id', 'asc')
            ->get()
            ->groupBy('parent_id');

        $records->getCollection()->transform(function ($record) use ($children) {
            $record->setRelation('children', $children->get($record->id, collect([])));
            return $record;
        });

        // ── Stats (roots only) ──
        $stats = [
            'total'                => LostAndDamage::whereNull('parent_id')->count(),
            'pending'              => LostAndDamage::whereNull('parent_id')->where('status', 'pending')->count(),
            'approved'             => LostAndDamage::whereNull('parent_id')->where('status', 'approved')->count(),
            'rejected'             => LostAndDamage::whereNull('parent_id')->where('status', 'rejected')->count(),
            'total_estimated_loss' => (float) LostAndDamage::whereNull('parent_id')
                                                ->where('status', 'approved')
                                                ->sum('estimated_cost'),
        ];

        return response()->json([
            'records' => $records,
            'stats'   => $stats,
            'message' => 'Lost & damage records retrieved successfully.',
        ]);
    }

    /**
     * GET /api/admin/lost-and-damages/{id}
     */
    public function show($id)
    {
        $record = LostAndDamage::with([
            'reportedBy:id,first_name,last_name,email',
            'approvedBy:id,first_name,last_name,email',
        ])->findOrFail($id);

        return response()->json(['record' => $record]);
    }

    /**
     * POST /api/admin/lost-and-damages
     * Admin can also log a loss directly (auto-approved? No — stays pending).
     * Kept consistent with staff: report → approve flow.
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
            $orderItem = \App\Models\OrderItem::find($validated['order_item_id']);
            if (!$orderItem) {
                return response()->json(['message' => 'Order item not found.'], 404);
            }
            if (!empty($validated['order_id']) && (int) $orderItem->order_id !== (int) $validated['order_id']) {
                return response()->json(['message' => 'Order item does not belong to the specified order.'], 422);
            }
            if ($validated['item_type'] === 'product' && (int) $orderItem->menu_id !== (int) $validated['item_id']) {
                return response()->json(['message' => 'Product does not match the order item.'], 422);
            }
            if ((float) $validated['quantity'] > (float) $orderItem->quantity) {
                return response()->json([
                    'message' => "Quantity ({$validated['quantity']}) exceeds order item quantity ({$orderItem->quantity}).",
                ], 422);
            }
        }

        // ── Verify the referenced item actually exists ──
        $item = $validated['item_type'] === 'product'
            ? Menu::find($validated['item_id'])
            : Ingredient::find($validated['item_id']);

        if (!$item) {
            return response()->json(['message' => 'Item not found.'], 404);
        }

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

        $orderRef = $record->order?->order_number
            ? " (Order #{$record->order->order_number})"
            : '';

        UserActivityLog::create([
            'user_id'       => auth()->id(),
            'activity_type' => 'damage_reported',
            'reference_id'  => $record->id,
            'details'       => "Reported loss/damage for {$validated['item_type']} #{$validated['item_id']}{$orderRef} ({$validated['damage_type']}, qty {$validated['quantity']} {$validated['unit']})",
        ]);

        return response()->json([
            'message' => 'Lost/damage record created successfully.',
            'record'  => $record->load('reportedBy:id,first_name,last_name', 'order:id,order_number'),
        ], 201);
    }

    /**
     * PUT /api/admin/lost-and-damages/{id}/approve
     * Approving a record deducts the corresponding stock.
     */
    public function approve($id)
    {
        $record = LostAndDamage::findOrFail($id);

        if ($record->status !== 'pending') {
            return response()->json([
                'message' => 'Only pending records can be approved.',
            ], 422);
        }

        DB::beginTransaction();
        try {
            $this->deductStockForApprovedRecord($record);

            $record->update([
                'status'      => 'approved',
                'approved_by' => auth()->id(),
                'approved_at' => now(),
            ]);

            UserActivityLog::create([
                'user_id'       => auth()->id(),
                'activity_type' => 'damage_reported',
                'reference_id'  => $record->id,
                'details'       => "Approved lost/damage record #{$record->id} ({$record->item_type} #{$record->item_id})",
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Lost/damage record approved successfully. Stock has been deducted.',
                'record'  => $record->fresh([
                    'reportedBy:id,first_name,last_name',
                    'approvedBy:id,first_name,last_name',
                ]),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Approval failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * PUT /api/admin/lost-and-damages/{id}/reject
     */
    public function reject(Request $request, $id)
    {
        $validated = $request->validate([
            'reason' => 'nullable|string|max:1000',
        ]);

        $record = LostAndDamage::findOrFail($id);

        if ($record->status !== 'pending') {
            return response()->json([
                'message' => 'Only pending records can be rejected.',
            ], 422);
        }

        $reason = $validated['reason'] ?? null;
        $record->update([
            'status'      => 'rejected',
            'approved_by' => auth()->id(),
            'approved_at' => now(),
            // store the reason inside description
            'description' => trim(
                ($record->description ? $record->description . "\n" : '') .
                '[REJECTED]' . ($reason ? ': ' . $reason : '')
            ),
        ]);

        UserActivityLog::create([
            'user_id'       => auth()->id(),
            'activity_type' => 'damage_reported',
            'reference_id'  => $record->id,
            'details'       => "Rejected lost/damage record #{$record->id}" . ($reason ? " — Reason: {$reason}" : ''),
        ]);

        return response()->json([
            'message' => 'Lost/damage record rejected.',
            'record'  => $record->fresh([
                'reportedBy:id,first_name,last_name',
                'approvedBy:id,first_name,last_name',
            ]),
        ]);
    }

    /**
     * DELETE /api/admin/lost-and-damages/{id}
     * Only pending records may be deleted (audit trail protection).
     */
    public function destroy($id)
    {
        $record = LostAndDamage::findOrFail($id);

        if ($record->status !== 'pending') {
            return response()->json([
                'message' => 'Only pending records can be deleted. Approved/rejected records are part of the audit trail.',
            ], 422);
        }

        $record->delete();

        return response()->json(['message' => 'Lost/damage record deleted.']);
    }

    // ─── Helpers ────────────────────────────────────────────────────

    private function validatePayload(Request $request): array
    {
        return $request->validate([
            'item_id'        => 'required|integer|min:1',
            'item_type'      => ['required', Rule::in(['product', 'ingredient'])],
            'quantity'       => 'required|numeric|min:0.01',
            'unit'           => 'required|string|max:20',
            'estimated_cost' => 'required|numeric|min:0',
            'damage_type'    => ['required', Rule::in(['spoilage', 'breakage', 'expired', 'misproduction'])],
            'description'    => 'nullable|string|max:1000',
        ]);
    }

    private function resolveAndValidateItem(string $type, $id)
    {
        if ($type === 'product') {
            return Menu::find($id);
        }
        if ($type === 'ingredient') {
            return Ingredient::find($id);
        }
        return null;
    }

    /**
     * Deduct stock when a loss is approved.
     *   - Ingredient → update `ingredients.current_stock` + write an
     *     `inventory_transactions` row (type = 'adjustment').
     *   - Product    → update `menu.stock_quantity` + write a
     *     `user_activity_logs` entry (existing pattern for product stock).
     */
    private function deductStockForApprovedRecord(LostAndDamage $record): void
    {
        // ═══════════════════════════════════════════════════════════
        // 1. INGREDIENT LOSS — deduct the ingredient directly
        // ═══════════════════════════════════════════════════════════
        if ($record->item_type === 'ingredient') {
            $ingredient = Ingredient::lockForUpdate()->find($record->item_id);
            if (!$ingredient) {
                throw new \Exception('Ingredient no longer exists.');
            }

            $oldStock = (float) $ingredient->current_stock;
            $qty      = (float) $record->quantity;

            if ($oldStock < $qty) {
                throw new \Exception(
                    "Insufficient stock for {$ingredient->name}. " .
                    "Available: {$oldStock} {$ingredient->unit}, Requested: {$qty} {$ingredient->unit}"
                );
            }

            $newStock = $oldStock - $qty;
            $ingredient->update(['current_stock' => $newStock]);

            InventoryTransaction::create([
                'ingredient_id'    => $ingredient->id,
                'transaction_type' => 'adjustment',
                'quantity'         => $qty,
                'previous_stock'   => $oldStock,
                'new_stock'        => $newStock,
                'reference_type'   => 'adjustment',
                'reference_id'     => $record->id,
                'notes'            => "Loss/Damage #{$record->id} approved ({$record->damage_type})",
                'created_by'       => auth()->id(),
            ]);

            return;
        }

        // ═══════════════════════════════════════════════════════════
        // 2. PRODUCT LOSS — deduct product stock + BOM ingredients
        // ═══════════════════════════════════════════════════════════
        if ($record->item_type === 'product') {
            $menu = Menu::lockForUpdate()->find($record->item_id);
            if (!$menu) {
                throw new \Exception('Product no longer exists.');
            }

            $oldStock = (int) $menu->stock_quantity;
            $qty      = (int) round((float) $record->quantity);

            if ($oldStock < $qty) {
                throw new \Exception(
                    "Insufficient product stock for {$menu->name}. " .
                    "Available: {$oldStock}, Requested: {$qty}"
                );
            }

            $newStock = $oldStock - $qty;
            $menu->update(['stock_quantity' => $newStock]);

            UserActivityLog::create([
                'user_id'       => auth()->id(),
                'activity_type' => 'inventory_updated',
                'reference_id'  => $menu->id,
                'details'       => "Deducted stock for {$menu->name}: -{$qty} (was {$oldStock}, now {$newStock}) — Loss/Damage #{$record->id}",
            ]);

            // ── BOM ingredient deduction + create child rows ──
            $bomItems = \App\Models\BillOfMaterials::where('menu_id', $menu->id)->get();

            foreach ($bomItems as $bom) {
                $ingredient = Ingredient::lockForUpdate()->find($bom->ingredient_id);
                if (!$ingredient) {
                    throw new \Exception("Ingredient ID {$bom->ingredient_id} not found.");
                }

                $totalNeeded = (float) $bom->quantity_needed * $qty;

                if ((float) $ingredient->current_stock < $totalNeeded) {
                    throw new \Exception(
                        "Insufficient stock for {$ingredient->name}. " .
                        "Needed: {$totalNeeded} {$bom->unit}, " .
                        "Available: {$ingredient->current_stock} {$bom->unit}"
                    );
                }

                $prevStock   = (float) $ingredient->current_stock;
                $newIngStock = $prevStock - $totalNeeded;

                $ingredient->update(['current_stock' => $newIngStock]);

                InventoryTransaction::create([
                    'ingredient_id'    => $ingredient->id,
                    'transaction_type' => 'adjustment',
                    'quantity'         => $totalNeeded,
                    'previous_stock'   => $prevStock,
                    'new_stock'        => $newIngStock,
                    'reference_type'   => 'adjustment',
                    'reference_id'     => $record->id,
                    'notes'            => "Loss/Damage #{$record->id} — Product: {$menu->name} x{$qty} (BOM)",
                    'created_by'       => auth()->id(),
                ]);

                UserActivityLog::create([
                    'user_id'       => auth()->id(),
                    'activity_type' => 'inventory_updated',
                    'reference_id'  => $ingredient->id,
                    'details'       => "Deducted {$totalNeeded} {$bom->unit} of {$ingredient->name} via BOM for Loss/Damage #{$record->id}",
                ]);

                // 👇 Child row (real record in the same table)
                LostAndDamage::create([
                    'parent_id'         => $record->id,
                    'order_id'          => $record->order_id,
                    'order_item_id'     => $record->order_item_id,
                    'item_id'           => $ingredient->id,
                    'item_type'         => 'ingredient',
                    'quantity'          => $totalNeeded,
                    'unit'              => $bom->unit,
                    'estimated_cost'    => 0,
                    'damage_type'       => $record->damage_type,
                    'description'       => "Auto-deducted via BOM when product loss #{$record->id} ({$menu->name} × {$qty}) was approved.",
                    'reported_by'       => $record->reported_by,
                    'reported_at'       => $record->reported_at,
                    'approved_by'       => auth()->id(),
                    'approved_at'       => now(),
                    'status'            => 'approved',
                    'is_auto_generated' => true,
                ]);
            }

            return;
        }

        throw new \Exception('Unknown item_type.');
}
}