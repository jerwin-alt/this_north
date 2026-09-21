<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\UserActivityLog;
use App\Models\Menu;
use App\Models\CustomDesign;
use App\Models\CakeSize;
use App\Models\DrinkSize;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use App\Models\Discount;
use App\Models\Feedback;

class CustomerOrderController extends Controller
{
    /**
     * Get the authenticated customer's orders (full details, with items, images, and payments).
     */
    public function index(Request $request)
    {
        $orders = Order::where('customer_id', auth()->id())
            ->with([
                'items.menu' => function ($q) {
                    $q->select('id', 'name', 'image_url', 'base_price', 'menu_type');
                },
                'items.customDesign',
                'payments'
            ])
            ->orderBy('order_date', 'desc')
            ->get();

    // Add has_review flag safely
    $orders->each(function ($order) {
        if ($order->status === 'completed' && $order->customer_id) {
            try {
                $order->has_review = Feedback::where('customer_id', $order->customer_id)
                                             ->where('order_id', $order->id)
                                             ->exists();
            } catch (\Exception $e) {
                \Log::error('Feedback check failed: ' . $e->getMessage());
                $order->has_review = false;
            }
        } else {
            $order->has_review = false;
        }
    });

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
     * FULLY UPDATED with PWD/Senior Citizen discount logic.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.menu_id' => 'nullable|exists:menu,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.size_id' => 'nullable|exists:drink_sizes,id',
            'items.*.cake_size_id' => 'nullable|exists:cake_sizes,id',
            'items.*.flavor_id' => 'nullable|exists:cake_flavors,id',
            'items.*.cake_type' => 'nullable|in:standard,custom',
            'items.*.custom_design_id' => 'nullable|exists:custom_designs,id',
            'items.*.custom_design' => 'nullable|array',
            'pickup_date' => 'required|date|after_or_equal:today',
            'pickup_time' => 'required|date_format:H:i:s',
            'notes' => 'nullable|string',
            'items.*.custom_design.decorations.*.element_id' => 'required|exists:design_elements,id',
            'items.*.custom_design.decorations.*.x'          => 'required|numeric',
            'items.*.custom_design.decorations.*.y'          => 'required|numeric',
            'items.*.custom_design.decorations.*.scale'      => 'nullable|numeric|min:0.1|max:5',
            'items.*.custom_design.decorations.*.color'      => 'nullable|string|max:9',
            'items.*.custom_design.decorations.*.colors'     => 'nullable|array',
        ]);

        $customer = $request->user();

        // --- Validate each item based on cake_type (existing) ---
        foreach ($validated['items'] as $index => $item) {
            $cakeType = $item['cake_type'] ?? 'standard';

            if ($cakeType === 'standard') {
                if (empty($item['menu_id'])) {
                    return response()->json([
                        'message' => "Item #{$index} is standard but missing menu_id.",
                        'errors' => ["items.{$index}.menu_id" => ['The menu_id is required for standard items.']]
                    ], 422);
                }
            } elseif ($cakeType === 'custom') {
                if (empty($item['custom_design_id']) && empty($item['custom_design'])) {
                    return response()->json([
                        'message' => "Item #{$index} is custom but missing custom design data.",
                        'errors' => ["items.{$index}.custom_design" => ['Custom design data is required.']]
                    ], 422);
                }
                if (!empty($item['menu_id'])) {
                    return response()->json([
                        'message' => "Item #{$index} is custom but has a menu_id. Please remove it.",
                        'errors' => ["items.{$index}.menu_id" => ['menu_id must be null for custom items.']]
                    ], 422);
                }
            }
        }

        // ---- Stock validation for standard items (existing) ----
        $menuIds = [];
        foreach ($validated['items'] as $item) {
            if (($item['cake_type'] ?? 'standard') === 'standard' && !empty($item['menu_id'])) {
                $menuIds[] = $item['menu_id'];
            }
        }
        $menuItems = Menu::whereIn('id', $menuIds)->get()->keyBy('id');

        $stockErrors = [];
        foreach ($validated['items'] as $index => $item) {
            if (($item['cake_type'] ?? 'standard') === 'standard' && !empty($item['menu_id'])) {
                $menu = $menuItems->get($item['menu_id']);
                if (!$menu) {
                    $stockErrors[] = "Menu item ID {$item['menu_id']} not found.";
                    continue;
                }
                if ($menu->track_stock && $item['quantity'] > $menu->stock_quantity) {
                    $stockErrors[] = "Insufficient stock for {$menu->name}. Available: {$menu->stock_quantity}, Requested: {$item['quantity']}.";
                }
            }
        }
        if (!empty($stockErrors)) {
            return response()->json(['message' => 'Stock validation failed', 'errors' => $stockErrors], 422);
        }

        // --- PWD/Senior Citizen Discount Logic ---
        $discount = null;
        $discountTotal = 0;
        $discountedItemIndex = null;
        $pwdDiscountRecord = null;
        $today = now()->toDateString();

        // Check if user is verified PWD/Senior
        if ($customer->verification_status === 'approved' &&
            in_array($customer->verification_type, ['senior_citizen', 'pwd'])) {

            // Check if already used today
            if (is_null($customer->last_pwd_discount_date) ||
                $customer->last_pwd_discount_date < $today) {

                // Fetch the active PWD/Senior discount
                $pwdDiscountRecord = Discount::where('requires_verification', true)
                                             ->where('discount_type', 'percentage')
                                             ->where('is_active', true)
                                             ->first();
            }
        }

        DB::beginTransaction();
        try {
            // ─── Build order items with prices (including custom design handling) ───
            $subtotal = 0;
            $orderItemsData = [];

            foreach ($validated['items'] as $item) {
                $cakeType = $item['cake_type'] ?? 'standard';
                $price = 0;
                $customDesignId = null;

                if ($cakeType === 'standard') {
                    $menu = Menu::findOrFail($item['menu_id']);
                    $price = $menu->base_price;

                    if (!empty($item['size_id'])) {
                        $size = DrinkSize::find($item['size_id']);
                        if ($size) $price += $size->price_modifier;
                    }
                    if (!empty($item['cake_size_id'])) {
                        $cakeSize = CakeSize::find($item['cake_size_id']);
                        if ($cakeSize) $price += $cakeSize->price_modifier;
                    }
                } else { // custom
                    if (isset($item['custom_design_id'])) {
                        $customDesignId = $item['custom_design_id'];
                        $design = CustomDesign::find($customDesignId);
                        if (!$design) {
                            throw new \Exception('Invalid custom design ID.');
                        }
                        $price = $design->total_price;
                    } elseif (isset($item['custom_design'])) {
                        $designData = $item['custom_design'];
                        $design = CustomDesign::create([
                            'user_id' => $customer->id,
                            'cake_size_id' => $designData['cake_size_id'] ?? null,
                            'cake_flavor_id' => $designData['cake_flavor_id'] ?? null,
                            'frosting_flavor' => $designData['frosting_flavor'] ?? null,
                            'custom_flavor' => $designData['custom_flavor'] ?? 'custom',
                            'design_name' => $designData['design_name'] ?? null,
                            'design_data' => $designData['decorations'] ?? [],
                            'special_instructions' => $designData['special_instructions'] ?? null,
                            'total_price' => $designData['total_price'] ?? 0,
                            'is_saved' => true,
                        ]);
                        $customDesignId = $design->id;
                        $price = $design->total_price;
                    } else {
                        throw new \Exception('Custom design data is missing.');
                    }
                }

                $itemTotal = $price * $item['quantity'];
                $subtotal += $itemTotal;

                $orderItemsData[] = [
                    'menu_id' => ($cakeType === 'standard') ? $item['menu_id'] : null,
                    'cake_type' => $cakeType,
                    'custom_design_id' => $customDesignId,
                    'quantity' => $item['quantity'],
                    'drink_sizes_id' => $item['size_id'] ?? null,
                    'cake_size_id' => $item['cake_size_id'] ?? null,
                    'cake_flavor_id' => $item['flavor_id'] ?? null,
                    'unit_price' => $price,
                    'subtotal' => $itemTotal,
                    'total_price' => $itemTotal,
                    'discount_amount' => 0,
                    'is_free_item' => false,
                ];
            }

            // ── Apply PWD/Senior discount if eligible ──
            if ($pwdDiscountRecord) {
                // Find the lowest-priced item (by total price)
                $lowestTotal = PHP_FLOAT_MAX;
                foreach ($orderItemsData as $idx => $data) {
                    if ($data['subtotal'] < $lowestTotal) {
                        $lowestTotal = $data['subtotal'];
                        $discountedItemIndex = $idx;
                    }
                }

                if ($discountedItemIndex !== null) {
                    // Calculate discount
                    $itemTotal = $orderItemsData[$discountedItemIndex]['subtotal'];
                    $discountAmount = $itemTotal * ($pwdDiscountRecord->discount_value / 100);
                    $discountAmount = round($discountAmount, 2);

                    // Apply discount to that item
                    $orderItemsData[$discountedItemIndex]['discount_amount'] = $discountAmount;
                    $orderItemsData[$discountedItemIndex]['total_price'] = $itemTotal - $discountAmount;
                    $discountTotal = $discountAmount;

                    // Mark discount used for today
                    $customer->last_pwd_discount_date = $today;
                    $customer->save();

                    $discount = $pwdDiscountRecord;
                }
            }

            // ─── Generate continuous order number (never resets) ───
            $totalOrders = Order::count();
            $nextNumber = str_pad($totalOrders + 1, 4, '0', STR_PAD_LEFT);
            $orderNumber = 'ORD-' . date('Ymd') . '-' . $nextNumber;

            // ─── Create order ───
            $order = Order::create([
                'order_number' => $orderNumber,
                'customer_id' => $customer->id,
                'customer_name' => $customer->first_name . ' ' . $customer->last_name,
                'customer_phone' => $customer->phone,
                'order_date' => now(),
                'pickup_date' => $validated['pickup_date'],
                'pickup_time' => $validated['pickup_time'],
                'subtotal' => $subtotal,
                'total_amount' => $subtotal - $discountTotal,
                'discount_id' => $discount ? $discount->id : null,
                'discount_total' => $discountTotal,
                'status' => 'pending',
                'payment_status' => 'unpaid',
                'notes' => $validated['notes'] ?? null,
                'created_by' => $customer->id,
            ]);

            // ─── Create order items ───
            foreach ($orderItemsData as $itemData) {
                $itemData['order_id'] = $order->id;
                OrderItem::create($itemData);
            }

            // ─── Log activity ───
            UserActivityLog::create([
                'user_id' => $customer->id,
                'activity_type' => 'order_placed',
                'reference_id' => $order->id,
                'details' => "Customer placed order #{$order->order_number}",
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Order placed successfully. Please wait for admin approval.',
                'order' => $order->load('items.menu', 'items.customDesign', 'payments'),
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Order placement failed: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to place order: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function updatePickupMethod(Request $request, Order $order)
    {
        if ($order->customer_id !== auth()->id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Allow when confirmed, preparing, ready (or already set)
        $allowedStatuses = ['confirmed', 'preparing', 'ready'];
        if (!in_array($order->status, $allowedStatuses)) {
            return response()->json([
                'message' => 'Pickup method can only be set when the order is confirmed, preparing, or ready for pickup.'
            ], 422);
        }

        // Validate: pickup_method required, and if rider, at least one of name, phone, photo
        $rules = [
            'pickup_method' => 'required|in:customer,rider',
            'rider_name'    => 'nullable|string|max:50',
            'rider_phone'   => 'nullable|string|max:20|regex:/^[0-9]+$/',
            'rider_photo'   => 'nullable|image|mimes:jpeg,png,jpg|max:5120', // 5MB
        ];

        $validated = $request->validate($rules);

        // Custom validation: if rider, ensure at least one info is provided
        if ($validated['pickup_method'] === 'rider') {
            $hasName = !empty($validated['rider_name']);
            $hasPhone = !empty($validated['rider_phone']);
            $hasPhoto = $request->hasFile('rider_photo');
            if (!$hasName && !$hasPhone && !$hasPhoto) {
                return response()->json([
                    'message' => 'Please provide rider\'s name, phone number, or a photo.'
                ], 422);
            }
        }

        // Store photo if present
        $photoPath = null;
        if ($request->hasFile('rider_photo')) {
            $photoPath = $request->file('rider_photo')->store('rider_photos', 'public');
        }

        $order->pickup_method = $validated['pickup_method'];
        if ($validated['pickup_method'] === 'rider') {
            $order->rider_name  = $validated['rider_name'] ?? null;
            $order->rider_phone = $validated['rider_phone'] ?? null;
            if ($photoPath) {
                $order->rider_photo = $photoPath;
            }
            // If photo was sent, keep existing if none new
        } else {
            // Customer pickup: clear rider fields
            $order->rider_name  = null;
            $order->rider_phone = null;
            $order->rider_photo = null;
        }

        $order->save();

        return response()->json([
            'message' => 'Pickup method updated successfully.',
            'order'   => $order->fresh(),
        ]);
    }




    /**
     * GET /api/customer/discount-eligibility
     * Returns whether the user is eligible for PWD/Senior discount today.
     */
    public function discountEligibility(Request $request)
    {
        $user = $request->user();
        $eligible = false;
        $discountPercentage = 0;
        $discountId = null;
        $alreadyUsedToday = false;
        $nextAvailableDate = null;

        if ($user->verification_status === 'approved' &&
            in_array($user->verification_type, ['senior_citizen', 'pwd'])) {

            $today = now()->toDateString();
            if ($user->last_pwd_discount_date && $user->last_pwd_discount_date >= $today) {
                $alreadyUsedToday = true;
                $nextAvailableDate = now()->addDay()->toDateString();
            } else {
                // Check if there is an active discount
                $discount = Discount::where('requires_verification', true)
                                    ->where('discount_type', 'percentage')
                                    ->where('is_active', true)
                                    ->first();
                if ($discount) {
                    $eligible = true;
                    $discountPercentage = $discount->discount_value;
                    $discountId = $discount->id;
                }
            }
        }

        return response()->json([
            'eligible' => $eligible,
            'discount_percentage' => $discountPercentage,
            'discount_id' => $discountId,
            'already_used_today' => $alreadyUsedToday,
            'next_available_date' => $nextAvailableDate,
        ]);
    }

}