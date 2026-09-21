<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Menu;
use App\Models\BillOfMaterials;
use App\Models\Ingredient;
use App\Models\InventoryTransaction;
use App\Models\UserActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use App\Events\OrderStatusChanged;
use Carbon\Carbon; // added for date handling
use App\Models\Discount;

class StaffOrderController extends Controller
{
    // Allowed status transitions
    private $allowedStatusTransitions = [
        'pending'    => ['confirmed', 'cancelled'],
        'confirmed'  => ['preparing', 'cancelled'],
        'preparing'  => ['ready', 'cancelled'],
        'ready'      => ['completed'],
        'completed'  => [],
        'cancelled'  => [],
    ];

    /**
     * GET /api/staff/orders
     * Now supports pagination via page and per_page query parameters.
     */
    public function index(Request $request)
    {
        $query = Order::with([
            'items.menu:id,name,base_price,image_url',
            'items.customDesign.cakeSize',
            'items.customDesign.cakeFlavor',
            'customer:id,first_name,last_name,phone',
            'payments'
        ])
        ->orderBy('order_date', 'desc');

        // ── Status filter ──
        if ($request->filled('status')) {
            $statuses = is_array($request->status)
                ? $request->status
                : explode(',', $request->status);
            $query->whereIn('status', $statuses);
        }

        // ── Search ──
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                ->orWhere('customer_name', 'like', "%{$search}%");
            });
        }

        // ── Schedule‑specific modifications ──
        if ($request->boolean('for_schedule')) {
            // Exclude walk‑ins
            $query->whereNotNull('customer_id');
            $orders = $query->get(); // no pagination for schedule
        } else {
            // For staff order management: include walk‑ins, but only those that are
            // pending (not yet approved) OR already confirmed/preparing/ready/completed
            $query->where(function ($q) {
                $q->whereNull('customer_id')
                ->orWhere(function ($sub) {
                    $sub->whereNotNull('customer_id')
                        ->whereIn('status', ['confirmed', 'preparing', 'ready', 'completed']);
                });
            });

            // ── Pagination ──
            $perPage = $request->input('per_page', 50);
            $orders = $query->paginate($perPage);
        }

        // ── ✅ ENSURE progress_images_with_urls is included ──
        $orders->each(function ($order) {
            $order->append('progress_images_with_urls');
        });

        // Enrich each order item with design preview data
        $this->enrichOrdersWithDesigns($orders);

        return response()->json(['orders' => $orders]);
    }

    /**
     * Helper to enrich order items with custom design preview.
     */
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

    /**
     * GET /api/staff/orders/{id}
     */
    public function show($id)
    {
        $order = Order::with([
            'items.menu:id,name,base_price,image_url',
            'items.customDesign.cakeSize',
            'items.customDesign.cakeFlavor',
            'customer:id,first_name,last_name,phone',
            'payments',
            'feedback'
        ])->findOrFail($id);

        $this->enrichOrdersWithDesigns(collect([$order]));
        return response()->json(['order' => $order]);
    }

    /**
     * GET /api/staff/schedule
     * Returns orders for a specific date (calendar view).
     */
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
            ->whereNotNull('customer_id')   // exclude walk‑ins
            ->orderBy('pickup_time')
            ->get();

        $this->enrichOrdersWithDesigns($orders);
        return response()->json(['orders' => $orders, 'date' => $date]);
    }

    /**
     * POST /api/staff/orders – create walk‑in order (UPDATED with discount support)
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_name'   => 'required|string|max:150',
            'customer_phone'  => 'nullable|string|max:20',
            'customer_id'     => 'nullable|exists:users,id',
            'pickup_date'     => 'nullable|date|after_or_equal:today',
            'pickup_time'     => 'nullable|date_format:H:i',
            'notes'           => 'nullable|string',
            'items'           => 'required|array|min:1',
            'items.*.menu_id' => 'required|exists:menu,id',
            'items.*.quantity'=> 'required|integer|min:1',
            // New discount fields (optional)
            'discount_id'     => 'nullable|exists:discounts,id',
            'discounted_menu_id' => 'nullable|exists:menu,id',
        ]);

        DB::beginTransaction();
        try {
            // ── Fetch the discount record if provided ──
            $discount = null;
            if ($request->filled('discount_id')) {
                $discount = Discount::find($request->discount_id);
                if (!$discount || !$discount->is_active) {
                    throw new \Exception('Invalid or inactive discount.');
                }
            }

            // ── Build order items with prices ──
            $subtotal = 0;
            $itemsData = [];
            $discountTotal = 0;
            $discountedItemIndex = null;

            foreach ($validated['items'] as $index => $itemData) {
                $menu = Menu::findOrFail($itemData['menu_id']);
                $unitPrice = $menu->base_price;
                $quantity = $itemData['quantity'];
                $itemTotal = $unitPrice * $quantity;
                $subtotal += $itemTotal;

                $itemsData[] = [
                    'menu_id' => $menu->id,
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'total_price' => $itemTotal,
                    'discount_amount' => 0, // will be set later if discount applies
                ];
            }

            // ── Apply discount if provided ──
            if ($discount) {
                // Determine which item to discount: either specified or the lowest‑priced
                $discountedMenuId = $request->discounted_menu_id;
                if ($discountedMenuId) {
                    // Find the index of that item
                    $discountedItemIndex = array_search($discountedMenuId, array_column($itemsData, 'menu_id'));
                    if ($discountedItemIndex === false) {
                        throw new \Exception('Discounted product not found in order.');
                    }
                } else {
                    // Find the item with the lowest total price (unit_price * quantity)
                    $lowestTotal = PHP_FLOAT_MAX;
                    foreach ($itemsData as $idx => $item) {
                        $itemTotal = $item['unit_price'] * $item['quantity'];
                        if ($itemTotal < $lowestTotal) {
                            $lowestTotal = $itemTotal;
                            $discountedItemIndex = $idx;
                        }
                    }
                    if ($discountedItemIndex === null) {
                        throw new \Exception('No items to discount.');
                    }
                }

                // Apply discount to that item
                $discountedItem = &$itemsData[$discountedItemIndex];
                $itemTotal = $discountedItem['unit_price'] * $discountedItem['quantity'];
                $discountAmount = $itemTotal * ($discount->discount_value / 100);
                $discountAmount = round($discountAmount, 2);
                $discountedItem['discount_amount'] = $discountAmount;
                $discountTotal += $discountAmount;
            }

            // ── Generate order number ──
            $totalOrders = Order::count();
            $nextNumber = str_pad($totalOrders + 1, 4, '0', STR_PAD_LEFT);
            $orderNumber = 'ORD-' . date('Ymd') . '-' . $nextNumber;

            // ── Create the order ──
            $order = Order::create([
                'order_number'   => $orderNumber,
                'customer_name'  => $validated['customer_name'],
                'customer_phone' => $validated['customer_phone'] ?? null,
                'customer_id'    => $validated['customer_id'] ?? null,
                'pickup_date'    => $validated['pickup_date'] ?? null,
                'pickup_time'    => $validated['pickup_time'] ?? null,
                'notes'          => $validated['notes'] ?? null,
                'status'         => 'pending',
                'payment_status' => 'unpaid',
                'subtotal'       => $subtotal,
                'total_amount'   => $subtotal - $discountTotal,
                'discount_id'    => $discount ? $discount->id : null,
                'discount_total' => $discountTotal,
                'created_by'     => auth()->id(),
                'order_date'     => now(),
            ]);

            // ── Create order items with discount amounts ──
            foreach ($itemsData as $item) {
                OrderItem::create([
                    'order_id'        => $order->id,
                    'menu_id'         => $item['menu_id'],
                    'cake_type'       => 'standard',
                    'quantity'        => $item['quantity'],
                    'unit_price'      => $item['unit_price'],
                    'subtotal'        => $item['unit_price'] * $item['quantity'],
                    'total_price'     => $item['unit_price'] * $item['quantity'] - $item['discount_amount'],
                    'discount_amount' => $item['discount_amount'],
                ]);
            }

            // ── Immediate walk‑in handling (if no pickup date) ──
            if (is_null($order->pickup_date)) {
                $order->pickup_date = Carbon::today()->toDateString();
                $order->status = 'completed';
                $order->load('items.menu.billOfMaterials.ingredient');
                $this->deductInventoryForOrder($order);
                $order->save();
            }

            DB::commit();

            return response()->json(['order' => $order->load('items.menu')], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Staff order creation failed: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to create order: ' . $e->getMessage()], 500);
        }
    }


    /**
     * PUT /api/staff/orders/{id} – edit order (only pending)
     */
    public function update(Request $request, $id)
    {
        $order = Order::findOrFail($id);
        if ($order->status !== 'pending') {
            return response()->json(['message' => 'Only pending orders can be edited'], 422);
        }

        $validated = $request->validate([
            'customer_name'  => 'sometimes|required|string|max:150',
            'customer_phone' => 'nullable|string|max:20',
            'pickup_date'    => 'nullable|date|after_or_equal:today',
            'pickup_time'    => 'nullable|date_format:H:i',
            'notes'          => 'nullable|string',
            'items'          => 'sometimes|required|array|min:1',
            'items.*.menu_id'=> 'required|exists:menu,id',
            'items.*.quantity'=> 'required|integer|min:1',
        ]);

        DB::beginTransaction();
        try {
            $order->update(collect($validated)->only([
                'customer_name', 'customer_phone', 'pickup_date', 'pickup_time', 'notes'
            ])->toArray());

            if (isset($validated['items'])) {
                $order->items()->delete();
                $subtotal = 0;
                foreach ($validated['items'] as $itemData) {
                    $menu = Menu::findOrFail($itemData['menu_id']);
                    $unitPrice = $menu->base_price;
                    $totalPrice = $unitPrice * $itemData['quantity'];
                    $subtotal += $totalPrice;

                    OrderItem::create([
                        'order_id'    => $order->id,
                        'menu_id'     => $menu->id,
                        'cake_type'   => 'standard',
                        'quantity'    => $itemData['quantity'],
                        'unit_price'  => $unitPrice,
                        'subtotal'    => $totalPrice,
                        'total_price' => $totalPrice,
                    ]);
                }
                $order->update([
                    'subtotal'     => $subtotal,
                    'total_amount' => $subtotal,
                ]);
            }

            DB::commit();
            return response()->json(['order' => $order->fresh('items.menu')]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to update order: ' . $e->getMessage()], 500);
        }
    }

    /**
     * POST /api/staff/orders/{id}/cancel
     */
    public function cancel($id)
    {
        $order = Order::findOrFail($id);
        if (!in_array($order->status, ['pending', 'confirmed'])) {
            return response()->json(['message' => 'Only pending or confirmed orders can be cancelled'], 422);
        }
        $order->update(['status' => 'cancelled']);
        return response()->json(['message' => 'Order cancelled', 'order' => $order->fresh()]);
    }

    /**
     * PUT /api/staff/orders/{id}/status – status progression
     */
    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => ['required', Rule::in(array_keys($this->allowedStatusTransitions))],
        ]);

        $order = Order::with(['items.menu', 'items.menu.billOfMaterials.ingredient'])->findOrFail($id);
        $newStatus = $request->status;
        $currentStatus = $order->status;

        // --- Prevent no-op status change ---
        if ($newStatus === $currentStatus) {
            return response()->json([
                'message' => "Order is already {$currentStatus}."
            ], 422);
        }

        // --- Additional restrictions for customer orders ---
        if ($order->customer_id !== null) {
            // Customer order still pending – admin must confirm first
            if ($currentStatus === 'pending') {
                return response()->json([
                    'message' => 'This order is pending admin approval. Only the admin can confirm it.'
                ], 403);
            }
            // Staff cannot cancel a customer order
            if ($newStatus === 'cancelled') {
                return response()->json([
                    'message' => 'Customer orders can only be cancelled by the admin.'
                ], 403);
            }
            // Staff cannot set a customer order to 'confirmed' (admin already set it)
            if ($newStatus === 'confirmed') {
                return response()->json([
                    'message' => 'Customer orders are confirmed by the admin, not by staff.'
                ], 403);
            }
        }

        // --- Existing transition validation ---
        if (!in_array($newStatus, $this->allowedStatusTransitions[$currentStatus])) {
            return response()->json([
                'message' => "Cannot change status from '{$currentStatus}' to '{$newStatus}'."
            ], 422);
        }

        DB::beginTransaction();
        try {
            // Inventory deduction for walk-in orders (menu ingredients) – only when confirming
            if ($newStatus === 'confirmed' && $currentStatus === 'pending') {
                $this->deductInventory($order);
            }

            // --- Product stock deduction when order becomes completed ---
            if ($newStatus === 'completed') {
                foreach ($order->items as $item) {
                    // Skip custom items (have no menu_id)
                    if (is_null($item->menu_id)) {
                        continue;
                    }

                    $menu = Menu::lockForUpdate()->find($item->menu_id);
                    if (!$menu) {
                        throw new \Exception("Menu item ID {$item->menu_id} not found.");
                    }

                    $oldStock = $menu->stock_quantity;
                    $quantitySold = $item->quantity;

                    if ($oldStock < $quantitySold) {
                        throw new \Exception(
                            "Insufficient product stock for {$menu->name}. " .
                            "Available: {$oldStock}, Sold: {$quantitySold}"
                        );
                    }

                    $newStock = $oldStock - $quantitySold;
                    $menu->update(['stock_quantity' => $newStock]);

                    // Log activity for menu transaction (stock out)
                    UserActivityLog::create([
                        'user_id'       => auth()->id(),
                        'activity_type' => 'inventory_updated',
                        'reference_id'  => $menu->id,
                        'details'       => "Deducted stock for {$menu->name}: -{$quantitySold} (was {$oldStock}, now {$newStock})",
                    ]);
                }
            }

            $order->status = $newStatus;
            $order->save();

            UserActivityLog::create([
                'user_id'       => auth()->id(),
                'activity_type' => 'order_status_updated',
                'reference_id'  => $order->id,
                'details'       => "Status changed from {$currentStatus} to {$newStatus}",
            ]);

            DB::commit();

            // Broadcast events for customer notifications
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
            \Log::error('Status update failed: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to update status: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Inventory deduction logic (only for standard menu items with a Bill of Materials)
     * This is used when a walk‑in order is confirmed (status changes from pending to confirmed).
     */
    private function deductInventory(Order $order)
    {
        foreach ($order->items as $item) {
            $quantity = $item->quantity;
            $bomItems = BillOfMaterials::where('menu_id', $item->menu_id)->get();

            // If no ingredients defined for this product, skip deduction
            if ($bomItems->isEmpty()) {
                continue;
            }

            foreach ($bomItems as $bom) {
                $ingredient = Ingredient::lockForUpdate()->find($bom->ingredient_id);
                if (!$ingredient) {
                    throw new \Exception("Ingredient ID {$bom->ingredient_id} not found.");
                }

                $totalNeeded = $bom->quantity_needed * $quantity;

                if ($ingredient->current_stock < $totalNeeded) {
                    throw new \Exception("Insufficient stock for {$ingredient->name}. Needed: {$totalNeeded} {$bom->unit}, Available: {$ingredient->current_stock} {$bom->unit}");
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
                    'notes'            => "Usage for order {$order->order_number}, item {$item->menu->name} x{$quantity}",
                    'created_by'       => auth()->id(),
                ]);
            }
        }
    }

    /**
     * Deduct both product stock and ingredient stock for an order (used for immediate walk‑ins).
     * This mirrors the logic in updateStatus() when status becomes 'completed'.
     *
     * @param \App\Models\Order $order
     * @throws \Exception
     */
    private function deductInventoryForOrder(Order $order)
    {
        // 1. Deduct product stock (menu items)
        foreach ($order->items as $item) {
            if (is_null($item->menu_id)) {
                continue;
            }

            $menu = Menu::lockForUpdate()->find($item->menu_id);
            if (!$menu) {
                throw new \Exception("Menu item ID {$item->menu_id} not found.");
            }

            $oldStock = $menu->stock_quantity;
            $quantitySold = $item->quantity;

            if ($oldStock < $quantitySold) {
                throw new \Exception(
                    "Insufficient product stock for {$menu->name}. " .
                    "Available: {$oldStock}, Sold: {$quantitySold}"
                );
            }

            $newStock = $oldStock - $quantitySold;
            $menu->update(['stock_quantity' => $newStock]);

            // Log activity for menu transaction (stock out)
            UserActivityLog::create([
                'user_id'       => auth()->id(),
                'activity_type' => 'inventory_updated',
                'reference_id'  => $menu->id,
                'details'       => "Deducted stock for {$menu->name}: -{$quantitySold} (was {$oldStock}, now {$newStock})",
            ]);
        }

        // 2. Deduct ingredient stock (from Bill of Materials)
        foreach ($order->items as $item) {
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
                        "Needed: {$totalNeeded} {$bom->unit}, Available: {$ingredient->current_stock} {$bom->unit}"
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