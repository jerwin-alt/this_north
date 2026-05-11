<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\UserActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CustomerOrderController extends Controller
{
    /**
     * Get the authenticated customer's orders (full details, with items & images).
     */
    public function index(Request $request)
    {
        $orders = Order::where('customer_id', auth()->id())
            ->with(['items.menu' => function ($q) {
                $q->select('id', 'name', 'base_price', 'image_url', 'menu_type');
            }])
            ->orderBy('order_date', 'desc')
            ->get();

        return response()->json(['orders' => $orders]);
    }

    /**
     * Get statistics for the authenticated customer.
     */
    public function stats()
    {
        $userId = auth()->id();
        $totalOrders = Order::where('customer_id', $userId)->count();
        $pendingOrders = Order::where('customer_id', $userId)
            ->whereIn('status', ['pending', 'confirmed', 'preparing', 'ready'])
            ->count();
        $totalSpent = Order::where('customer_id', $userId)
            ->where('payment_status', 'paid')
            ->sum('total_amount');

        return response()->json([
            'total_orders'   => $totalOrders,
            'pending_orders' => $pendingOrders,
            'total_spent'    => (float) $totalSpent,
        ]);
    }

    /**
     * Store a newly created order (placed by a customer).
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'items'                     => 'required|array|min:1',
            'items.*.menu_id'           => 'required|exists:menu,id',
            'items.*.quantity'          => 'required|integer|min:1',
            'items.*.size_id'           => 'nullable|exists:drink_sizes,id',
            'items.*.cake_size_id'      => 'nullable|exists:cake_sizes,id',
            'items.*.flavor_id'         => 'nullable|exists:cake_flavors,id',
            'pickup_date'               => 'required|date|after_or_equal:today',
            'pickup_time'               => 'required|date_format:H:i:s',
            'notes'                     => 'nullable|string',
        ]);

        $customer = $request->user();

        DB::beginTransaction();
        try {
            $orderNumber = 'ORD-' . date('Ymd') . '-' . strtoupper(uniqid());

            $subtotal = 0;
            $orderItems = [];

            foreach ($validated['items'] as $item) {
                $menu = \App\Models\Menu::findOrFail($item['menu_id']);
                $price = $menu->base_price;

                if (!empty($item['size_id'])) {
                    $size = \App\Models\DrinkSize::find($item['size_id']);
                    if ($size) $price += $size->price_modifier;
                }
                if (!empty($item['cake_size_id'])) {
                    $cakeSize = \App\Models\CakeSize::find($item['cake_size_id']);
                    if ($cakeSize) $price += $cakeSize->price_modifier;
                }

                $itemTotal = $price * $item['quantity'];
                $subtotal += $itemTotal;

                $orderItems[] = [
                    'menu_id'        => $item['menu_id'],
                    'quantity'       => $item['quantity'],
                    'drink_sizes_id' => $item['size_id'] ?? null,
                    'cake_size_id'   => $item['cake_size_id'] ?? null,
                    'cake_flavor_id' => $item['flavor_id'] ?? null,
                    'unit_price'     => $price,
                    'subtotal'       => $itemTotal,
                    'total_price'    => $itemTotal,
                    'is_free_item'   => false,
                ];
            }

            $order = Order::create([
                'order_number'      => $orderNumber,
                'customer_id'       => $customer->id,
                'customer_name'     => $customer->first_name . ' ' . $customer->last_name,
                'customer_phone'    => $customer->phone,
                'order_date'        => now(),
                'pickup_date'       => $validated['pickup_date'],
                'pickup_time'       => $validated['pickup_time'],
                'subtotal'          => $subtotal,
                'total_amount'      => $subtotal,
                'status'            => 'pending',
                'payment_status'    => 'unpaid',
                'notes'             => $validated['notes'] ?? null,
                'created_by'        => $customer->id,
            ]);

            foreach ($orderItems as $item) {
                $item['order_id'] = $order->id;
                OrderItem::create($item);
            }

            UserActivityLog::create([
                'user_id'       => $customer->id,
                'activity_type' => 'order_placed',
                'reference_id'  => $order->id,
                'details'       => "Customer placed order #{$order->order_number}",
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Order placed successfully. Please wait for admin approval.',
                'order'   => $order->load('items.menu'),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Order placement failed: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to place order: ' . $e->getMessage(),
            ], 500);
        }
    }
}