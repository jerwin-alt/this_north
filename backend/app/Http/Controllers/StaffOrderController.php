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
     */
    public function index(Request $request)
    {
        $query = Order::query()
            ->orderBy('order_date', 'desc');

        // ----- Status filter (comma‑separated) -----
        if ($request->filled('status')) {
            $statuses = is_array($request->status)
                ? $request->status
                : explode(',', $request->status);
            $query->whereIn('status', $statuses);
        }

        // ----- Search -----
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                ->orWhere('customer_name', 'like', "%{$search}%");
            });
        }

        // ----- Schedule‑specific modifications -----
        if ($request->boolean('for_schedule')) {
            // Exclude walk‑ins
            $query->whereNotNull('customer_id');
            // No need for additional status filter – the schedule page will send status param
        } else {
            // For staff order management: include walk‑ins, but only those that are
            // pending (not yet approved) OR already confirmed/preparing/ready/completed
            // Keep the original logic for non‑schedule requests
            $query->where(function ($q) {
                $q->whereNull('customer_id')
                ->orWhere(function ($sub) {
                    $sub->whereNotNull('customer_id')
                        ->whereIn('status', ['confirmed', 'preparing', 'ready', 'completed']);
                });
            });
        }

        $orders = $query->get();

        return response()->json(['orders' => $orders]);
    }


    public function byDate(Request $request)
    {
        $date = $request->input('date');
        $orders = Order::with(['items.menu:id,name,base_price'])
            ->whereDate('pickup_date', $date)
            ->whereIn('status', ['confirmed', 'preparing', 'ready'])
            ->whereNotNull('customer_id')   // ← exclude walk‑ins
            ->orderBy('pickup_time')
            ->get();

        return response()->json([
            'orders' => $orders,
            'date'   => $date,
        ]);
    }

    /**
     * GET /api/staff/orders/{id}
     */
    public function show($id)
    {
        $order = Order::with([
            'items.menu:id,name,base_price',
            'customer:id,first_name,last_name,phone',
            'payments' => function ($q) { $q->orderBy('payment_date', 'desc'); }
        ])->findOrFail($id);

        return response()->json(['order' => $order]);
    }

    /**
     * POST /api/staff/orders – create walk‑in order
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
        ]);

        DB::beginTransaction();
        try {
            $lastOrder = Order::orderBy('id', 'desc')->first();
            $number = $lastOrder ? ((int)substr($lastOrder->order_number, -4)) + 1 : 1;
            $orderNumber = 'ORD-' . now()->format('Ymd') . '-' . str_pad($number, 4, '0', STR_PAD_LEFT);

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
                'subtotal'       => 0,
                'total_amount'   => 0,
                'created_by'     => auth()->id(),
                'order_date'     => now(),
            ]);

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

            DB::commit();
            return response()->json(['order' => $order->load('items.menu')], 201);
        } catch (\Exception $e) {
            DB::rollBack();
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
     * PUT /api/staff/orders/{id}/status – status progression (fixed)
     */
    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => ['required', Rule::in(array_keys($this->allowedStatusTransitions))],
        ]);

        $order = Order::with(['items.menu', 'items.menu.billOfMaterials.ingredient'])->findOrFail($id);
        $newStatus = $request->status;
        $currentStatus = $order->status;

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
            // Inventory deduction only when confirming (pending → confirmed) for walk‑in orders
            if ($newStatus === 'confirmed' && $currentStatus === 'pending') {
                $this->deductInventory($order);
            }

            // --- NEW: Product stock deduction when order becomes completed ---
            if ($newStatus === 'completed') {
                foreach ($order->items as $item) {
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


        $order->status = $newStatus;
        $order->save();

        $messages = [
            'preparing' => "Your order #{$order->order_number} is now being prepared.",
            'ready'     => "Your order #{$order->order_number} is ready for pickup.",
            'completed' => "Your order #{$order->order_number} has been completed.",
        ];
        if (isset($messages[$newStatus])) {
            event(new OrderStatusChanged($order, $messages[$newStatus], $newStatus));
        }
    }

    /**
     * Inventory deduction logic (only for standard menu items with a Bill of Materials)
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
}