<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Menu;
use App\Models\UserActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Illuminate\Validation\Rule;
use App\Events\OrderStatusChanged;
use App\Traits\InventoryDeduction;   // <-- NEW
use App\Models\CustomCakeBom;
use App\Models\Ingredient;
use App\Models\InventoryTransaction;

class AdminOrderController extends Controller
{
    use InventoryDeduction;          // <-- NEW

    /**
     * List all orders with schedule information.
     */
    public function index(Request $request)
    {
        $query = Order::with([
            'items.menu:id,name,base_price,menu_type,image_url',
            'items.customDesign.cakeSize',
            'items.customDesign.cakeFlavor',
            'customer:id,first_name,last_name,phone',
            'payments'
        ])
        ->whereNotNull('pickup_date')
        ->orderBy('order_date', 'desc');

        if ($request->filled('status')) {
            $statuses = is_array($request->status)
                ? $request->status
                : explode(',', $request->status);
            $query->whereIn('status', $statuses);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                ->orWhere('customer_name', 'like', "%{$search}%");
            });
        }

        if ($request->boolean('for_schedule')) {
            $orders = $query->get(); // no pagination for schedule
        } else {
            // ── pagination ──
            $perPage = $request->input('per_page', 50);
            $orders = $query->paginate($perPage);
        }

        $this->enrichOrdersWithDesigns($orders);
        return response()->json(['orders' => $orders, 'message' => 'Orders retrieved successfully']);
    }

    private function enrichOrdersWithDesigns($orders)
    {
        $orders->each(function ($order) {
            $order->items->each(function ($item) {
                if ($item->cake_type === 'custom' && $item->customDesign) {
                    $item->setAttribute('design_preview', $item->customDesign->getDecorationsWithElements());
                }
            });
        });
    }

    public function show($id)
    {
        $order = Order::with([
            'items.menu',
            'items.customDesign.cakeSize',
            'items.customDesign.cakeFlavor',
            'customCakeBom.ingredient:id,name,unit',
            'customer',
            'payments',
            'feedback'
        ])->findOrFail($id);
        $this->enrichOrdersWithDesigns(collect([$order]));
        return response()->json(['order' => $order]);
    }

    public function approve($id)
    {
        $order = Order::with('items.menu')->findOrFail($id);
        if ($order->customer_id === null) {
            return response()->json(['message' => 'Walk‑in orders are already confirmed and cannot be approved by admin.'], 403);
        }
        if ($order->status !== 'pending') {
            return response()->json(['message' => 'Only pending orders can be approved'], 422);
        }

        $pickupDate = $order->pickup_date;
        $pickupTime = $order->pickup_time;

        $conflict = Order::where('id', '!=', $order->id)
            ->where('pickup_date', $pickupDate)
            ->where('pickup_time', $pickupTime)
            ->whereIn('status', ['confirmed', 'preparing', 'ready'])
            ->exists();

        if ($conflict) {
            return response()->json(['message' => 'Schedule conflict: another order is already confirmed for this date and time.'], 409);
        }

        foreach ($order->items as $item) {
            if ($item->menu && $item->menu->menu_type === 'customizable') {
                $cutoff = Carbon::parse($pickupDate)->subDays(7);
                if (Carbon::now()->greaterThan($cutoff)) {
                    return response()->json(['message' => 'Custom cake orders must be placed at least 7 days before pickup.'], 422);
                }
            }
        }

        // ── NO ingredient deduction here ──

        $order->status = 'confirmed';
        $order->save();

        UserActivityLog::create([
            'user_id'       => auth()->id(),
            'activity_type' => 'order_status_updated',
            'reference_id'  => $order->id,
            'details'       => "Order {$order->order_number} approved (confirmed)",
            'created_at' => now(), 
        ]);

        event(new OrderStatusChanged(
            $order,
            "Your order #{$order->order_number} has been approved.",
            'approved'
        ));

        return response()->json(['message' => 'Order approved and schedule confirmed.', 'order' => $order->fresh('items.menu')]);
    }

    public function reject(Request $request, $id)
    {
        $order = Order::findOrFail($id);
        $request->validate(['reason' => 'required|string|max:1000']);

        if ($order->customer_id === null) {
            return response()->json(['message' => 'Walk‑in orders cannot be rejected by admin.'], 403);
        }
        if (!in_array($order->status, ['pending', 'confirmed'])) {
            return response()->json(['message' => 'Only pending or confirmed orders can be rejected'], 422);
        }

        $reason = $request->reason;
        $oldNotes = $order->notes ?? '';
        $order->notes = $oldNotes ? $oldNotes . "\n[REJECTED]: " . $reason : "[REJECTED]: " . $reason;
        $order->status = 'cancelled';
        $order->save();

        UserActivityLog::create([
            'user_id' => auth()->id(),
            'activity_type' => 'order_cancelled',
            'reference_id' => $order->id,
            'details' => "Order {$order->order_number} rejected. Reason: {$reason}",
        ]);

        event(new OrderStatusChanged(
            $order,
            "Your order #{$order->order_number} has been rejected. Reason: {$reason}",
            'rejected'
        ));

        return response()->json(['message' => 'Order rejected successfully.', 'order' => $order->fresh()]);
    }

    public function updateSchedule(Request $request, $id)
    {
        $order = Order::findOrFail($id);

        if ($order->customer_id === null) {
            return response()->json(['message' => 'Pickup schedule for walk‑in orders is managed by staff, not admin.'], 403);
        }

        $validated = $request->validate([
            'pickup_date' => 'required|date|after_or_equal:today',
            'pickup_time' => 'required|date_format:H:i:s',
        ]);

        // Conflict check
        $conflict = Order::where('id', '!=', $order->id)
            ->where('pickup_date', $validated['pickup_date'])
            ->where('pickup_time', $validated['pickup_time'])
            ->whereIn('status', ['confirmed', 'preparing', 'ready'])
            ->exists();

        if ($conflict) {
            return response()->json(['message' => 'Cannot change to this time – another order already scheduled.'], 409);
        }

        // 7‑day rule for custom cakes
        foreach ($order->items as $item) {
            if ($item->menu && $item->menu->menu_type === 'customizable') {
                $cutoff = Carbon::parse($validated['pickup_date'])->subDays(7);
                if (Carbon::now()->greaterThan($cutoff)) {
                    return response()->json(['message' => 'Custom cakes require at least 7 days before pickup.'], 422);
                }
            }
        }

        $order->update($validated);

        // Admin audit log
        UserActivityLog::create([
            'user_id' => auth()->id(),
            'activity_type' => 'order_status_updated',
            'reference_id' => $order->id,
            'details' => "Admin updated schedule for order {$order->order_number}",
        ]);

        // ─── Store a customer log ───
        UserActivityLog::create([
            'user_id' => $order->customer_id,
            'activity_type' => 'order_status_updated',
            'reference_id' => $order->id,
            'details' => "Your pickup schedule has been updated to {$validated['pickup_date']} at {$validated['pickup_time']}.",
        ]);

        // ─── Broadcast real‑time notification ───
        event(new OrderStatusChanged(
            $order,
            "Your order #{$order->order_number} has been rescheduled to {$validated['pickup_date']} at {$validated['pickup_time']}.",
            'rescheduled',
            ['pickup_date' => $validated['pickup_date'], 'pickup_time' => $validated['pickup_time']]
        ));

        return response()->json([
            'message' => 'Schedule updated successfully.',
            'order' => $order->fresh('items.menu'),
        ]);
    }





    /**
     * GET /api/admin/orders/{id}/custom-cake
     * Fetch the custom cake's editable data (final price + BOM).
     */
    public function getCustomCakeDetails($id)
    {
        $order = Order::with([
            'items.customDesign',
            'customCakeBom.ingredient:id,name,unit',
        ])->findOrFail($id);

        $isCustom = $order->items()->where('cake_type', 'custom')->exists();
        if (!$isCustom) {
            return response()->json([
                'message' => 'This order is not a custom cake order.',
            ], 422);
        }

        return response()->json([
            'order_id'             => $order->id,
            'order_number'         => $order->order_number,
            'customer_id'          => $order->customer_id,
            'is_staff_walkin'      => is_null($order->customer_id),
            'payment_status'       => $order->payment_status,
            'status'               => $order->status,
            'total_amount'         => (float) $order->total_amount,
            'subtotal'             => (float) $order->subtotal,
            'discount_total'       => (float) ($order->discount_total ?? 0),
            'bom_already_deducted' => (bool) $order->custom_cake_bom_deducted,
            'bom' => $order->customCakeBom->map(fn ($b) => [
                'id'              => $b->id,
                'ingredient_id'   => $b->ingredient_id,
                'ingredient_name' => $b->ingredient?->name,
                'quantity_needed' => (float) $b->quantity_needed,
                'unit'            => $b->unit,
            ])->values(),
        ]);
    }

    /**
     * PUT /api/admin/orders/{id}/custom-cake
     * Update the custom cake's final price and BOM.
     * Does NOT deduct ingredients and does NOT touch payment_status.
     */
    public function updateCustomCake(Request $request, $id)
    {
        $validated = $request->validate([
            'total_amount'          => 'required|numeric|min:0',
            'payment_status'        => 'nullable|string|in:partially_paid,paid',
            'bom'                   => 'nullable|array',
            'bom.*.ingredient_id'   => 'required|exists:ingredients,id',
            'bom.*.quantity_needed' => 'required|numeric|min:0.01',
            'bom.*.unit'            => 'required|string|max:20',
        ]);

        $order = Order::with('items')->findOrFail($id);

        $isCustom = $order->items()->where('cake_type', 'custom')->exists();
        if (!$isCustom) {
            return response()->json([
                'message' => 'This order is not a custom cake order.',
            ], 422);
        }

        $bomLocked = (bool) $order->custom_cake_bom_deducted;

        // Staff Walk-In = customer_id IS NULL. Customer Mobile = customer_id IS NOT NULL.
        // Only Staff Walk-In may have its payment_status changed from this endpoint.
        $isWalkIn = is_null($order->customer_id);

        DB::beginTransaction();
        try {
            $oldTotal       = (float) $order->total_amount;
            $oldPayment     = $order->payment_status;
            $discount       = (float) ($order->discount_total ?? 0);
            $newTotal       = (float) $validated['total_amount'];

            // ── Update order totals ──
            $order->subtotal     = $newTotal + $discount;
            $order->total_amount = $newTotal;

            // ── Explicit payment change: Staff Walk-In only ──
            $paymentChanged = false;
            if ($isWalkIn && !empty($validated['payment_status'])) {
                if ($order->payment_status !== $validated['payment_status']) {
                    $order->payment_status = $validated['payment_status'];
                    $paymentChanged = true;
                }
            }

            // Single save persists total_amount AND payment_status together.
            $order->save();

            // ── Update the custom cake order item(s) ──
            $customItems = $order->items()->where('cake_type', 'custom')->get();
            foreach ($customItems as $item) {
                $qty       = max(1, (int) $item->quantity);
                $unitPrice = round($newTotal / $qty, 2);

                $item->unit_price  = $unitPrice;
                $item->subtotal    = $newTotal;
                $item->total_price = $newTotal;
                $item->save();

                if ($item->custom_design_id) {
                    \App\Models\CustomDesign::where('id', $item->custom_design_id)
                        ->update(['total_price' => $unitPrice]);
                }
            }

            // ── Replace BOM (only if not already deducted) ──
            if (!$bomLocked) {
                CustomCakeBom::where('order_id', $order->id)->delete();
                foreach ($validated['bom'] ?? [] as $row) {
                    CustomCakeBom::create([
                        'order_id'        => $order->id,
                        'ingredient_id'   => $row['ingredient_id'],
                        'quantity_needed' => $row['quantity_needed'],
                        'unit'            => $row['unit'],
                    ]);
                }
            }

            // ── Audit log ──
            $logParts = [
                "Admin updated custom cake {$order->order_number}",
                "price ₱{$oldTotal} → ₱{$newTotal}",
            ];
            if ($bomLocked) {
                $logParts[] = 'BOM frozen — already deducted';
            } else {
                $logParts[] = 'BOM rows: ' . count($validated['bom'] ?? []);
            }
            if ($paymentChanged) {
                $logParts[] = "payment {$oldPayment} → {$order->payment_status}";
            }

            UserActivityLog::create([
                'user_id'       => auth()->id(),
                'activity_type' => 'order_status_updated',
                'reference_id'  => $order->id,
                'details'       => implode(', ', $logParts),
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Custom cake updated successfully.',
                'order'   => $order->fresh(['items.customDesign', 'customCakeBom.ingredient']),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Custom cake update failed: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to update custom cake: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function byDate(Request $request)
    {
        $date = $request->input('date');
        $orders = Order::with([
            'items.menu:id,name,base_price,image_url',
            'items.customDesign.cakeSize',
            'items.customDesign.cakeFlavor',
            'customer:id,first_name,last_name,phone',
            'payments'
        ])
            ->whereDate('pickup_date', $date)
            ->whereIn('status', ['confirmed', 'preparing', 'ready'])
            ->orderBy('pickup_time')
            ->get();

        $this->enrichOrdersWithDesigns($orders);
        return response()->json(['orders' => $orders, 'date' => $date]);
    }

    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => ['required', Rule::in(['preparing', 'ready', 'completed'])],
        ]);

        $order = Order::with(['items.menu'])->findOrFail($id);
        $newStatus     = $request->status;
        $currentStatus = $order->status;

        // Order must be paid / partially paid to move forward.
        if (!in_array($order->payment_status, ['paid', 'partially_paid'])) {
            return response()->json([
                'message' => 'Order must be paid or partially paid to change status.'
            ], 422);
        }

        if ($newStatus === $currentStatus) {
            return response()->json(['message' => "Order is already {$currentStatus}."], 422);
        }

        $allowed = [
            'pending'    => ['confirmed', 'preparing', 'ready', 'completed'],
            'confirmed'  => ['preparing', 'ready', 'completed'],
            'preparing'  => ['ready', 'completed'],
            'ready'      => ['completed'],
            'completed'  => [],
            'cancelled'  => [],
        ];

        if (!in_array($newStatus, $allowed[$currentStatus])) {
            return response()->json([
                'message' => "Cannot change status from '{$currentStatus}' to '{$newStatus}'."
            ], 422);
        }

        DB::beginTransaction();
        try {
            // ══════════════════════════════════════════════════════════════
            // All stock / BOM deduction happens ONLY when completing.
            // ══════════════════════════════════════════════════════════════
            if ($newStatus === 'completed') {

                // ── 1. Product stock deduction (standard items only) ──
                foreach ($order->items as $item) {
                    if (is_null($item->menu_id)) continue;
                    $menu = Menu::lockForUpdate()->find($item->menu_id);
                    if (!$menu) throw new \Exception("Menu item ID {$item->menu_id} not found.");
                    if ($menu->stock_quantity < $item->quantity) {
                        throw new \Exception("Insufficient stock for {$menu->name}.");
                    }
                    $menu->decrement('stock_quantity', $item->quantity);
                    UserActivityLog::create([
                        'user_id'       => auth()->id(),
                        'activity_type' => 'inventory_updated',
                        'reference_id'  => $menu->id,
                        'details'       => "Admin deducted product stock for {$menu->name}: -{$item->quantity}",
                    ]);
                }

                // ── 2. Ingredient BOM for standard menu items ──
                $this->deductIngredientsForOrder($order);

                // ── 3. Custom cake BOM — idempotent, inside completed gate ──
                $hasCustomCake = $order->items()->where('cake_type', 'custom')->exists();

                if ($hasCustomCake && !$order->custom_cake_bom_deducted) {
                    $bomRows = CustomCakeBom::where('order_id', $order->id)->get();

                    foreach ($bomRows as $bom) {
                        $ingredient = Ingredient::lockForUpdate()->find($bom->ingredient_id);
                        if (!$ingredient) {
                            throw new \Exception("Ingredient ID {$bom->ingredient_id} not found.");
                        }

                        $needed = (float) $bom->quantity_needed;
                        $avail  = (float) $ingredient->current_stock;

                        if ($avail < $needed) {
                            throw new \Exception(
                                "Insufficient stock for {$ingredient->name}. " .
                                "Needed: {$needed} {$bom->unit}, Available: {$avail} {$ingredient->unit}"
                            );
                        }

                        $prevStock = $avail;
                        $newStock  = $avail - $needed;
                        $ingredient->update(['current_stock' => $newStock]);

                        InventoryTransaction::create([
                            'ingredient_id'    => $ingredient->id,
                            'transaction_type' => 'usage',
                            'quantity'         => $needed,
                            'previous_stock'   => $prevStock,
                            'new_stock'        => $newStock,
                            'reference_type'   => 'order',
                            'reference_id'     => $order->id,
                            'notes'            => "Custom cake BOM for order {$order->order_number}",
                            'created_by'       => auth()->id(),
                        ]);

                        UserActivityLog::create([
                            'user_id'       => auth()->id(),
                            'activity_type' => 'inventory_updated',
                            'reference_id'  => $ingredient->id,
                            'details'       => "Deducted {$needed} {$bom->unit} of {$ingredient->name} " .
                                            "for custom cake order {$order->order_number}",
                        ]);
                    }

                    $order->custom_cake_bom_deducted = true;
                }
            }
            // ══════════════════════════════════════════════════════════════
            // End of deduction block. Nothing below touches inventory.
            // ══════════════════════════════════════════════════════════════

            $order->status = $newStatus;
            $order->save();

            UserActivityLog::create([
                'user_id'       => auth()->id(),
                'activity_type' => 'order_status_updated',
                'reference_id'  => $order->id,
                'details'       => "Admin changed status from {$currentStatus} to {$newStatus}",
                'created_at'    => now(),
            ]);

            DB::commit();

            $messages = [
                'preparing' => "Your order #{$order->order_number} is now being prepared.",
                'ready'     => "Your order #{$order->order_number} is ready for pickup.",
                'completed' => "Your order #{$order->order_number} has been completed.",
            ];
            if (isset($messages[$newStatus])) {
                event(new OrderStatusChanged($order, $messages[$newStatus], $newStatus));
            }

            return response()->json([
                'message' => "Order status updated to {$newStatus}",
                'order'   => $order->fresh('items.menu'),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Admin status update failed: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to update status: ' . $e->getMessage()
            ], 500);
        }
    }

    public function cancelOrder(Request $request, $id)
    {
        $order = Order::findOrFail($id);
        $request->validate(['reason' => 'required|string|max:1000']);

        // Allow cancelling confirmed, preparing, or ready orders.
        if (!in_array($order->status, ['confirmed', 'preparing', 'ready'])) {
            return response()->json([
                'message' => 'Only orders in Confirmed, Preparing, or Ready status can be cancelled.'
            ], 422);
        }

        $reason  = $request->reason;
        $oldNotes = $order->notes ?? '';
        $order->notes = $oldNotes
            ? $oldNotes . "\n[CANCELLED]: " . $reason
            : "[CANCELLED]: " . $reason;
        $order->status = 'cancelled';
        $order->save();

        UserActivityLog::create([
            'user_id'       => auth()->id(),
            'activity_type' => 'order_cancelled',
            'reference_id'  => $order->id,
            'details'       => "Admin cancelled order {$order->order_number}. Reason: {$reason}",
        ]);

        event(new OrderStatusChanged(
            $order,
            "Your order #{$order->order_number} has been cancelled. Reason: {$reason}",
            'cancelled'
        ));

        return response()->json(['message' => 'Order cancelled successfully.']);
    }
}