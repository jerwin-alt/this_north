<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\UserActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class AdminOrderController extends Controller
{
    /**
     * List all orders with schedule information.
     * Admins see all statuses, but calendar uses only confirmed/preparing/ready.
     */
    public function index(Request $request)
    {
        $query = Order::with(['items.menu:id,name,base_price,menu_type', 'customer:id,first_name,last_name,phone'])
        ->whereNotNull('pickup_date')
        ->orderBy('order_date', 'desc');   // most recent first

        // ----- Status filter (supports comma‑separated string) -----
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
            // 1. Exclude walk‑in orders (customer_id must NOT be null)
            $query->whereNotNull('customer_id');
            // 2. No pagination – return all matching orders
            $orders = $query->get();
        } else {
            // Regular admin orders list – keep pagination and include walk‑ins
            $orders = $query->paginate(100);
        }

        return response()->json([
            'orders' => $orders,
            'message' => 'Orders retrieved successfully'
        ]);
    }

    /**
     * Approve an order – confirm its schedule.
     * Validates:
     *   - No time‑slot conflict with already confirmed/preparing/ready orders.
     *   - 7‑day rule for customizable cakes.
     */
    public function approve($id)
    {
        // $order = Order::with('items.menu')->findOrFail($id);
        // if ($order->status !== 'pending') {
        //     return response()->json(['message' => 'Only pending orders can be approved'], 422);
        // }

        $order = Order::with('items.menu')->findOrFail($id);

        // Walk‑in orders (no customer) are automatically valid
        if ($order->customer_id === null) {
            return response()->json([
                'message' => 'Walk‑in orders are already confirmed and cannot be approved by admin.'
            ], 403);
        }

        if ($order->status !== 'pending') {
            return response()->json(['message' => 'Only pending orders can be approved'], 422);
        }

        $pickupDate = $order->pickup_date;
        $pickupTime = $order->pickup_time;

        // 1. Conflict check (exclude current order)
        $conflict = Order::where('id', '!=', $order->id)
            ->where('pickup_date', $pickupDate)
            ->where('pickup_time', $pickupTime)
            ->whereIn('status', ['confirmed', 'preparing', 'ready'])
            ->exists();

        if ($conflict) {
            return response()->json([
                'message' => 'Schedule conflict: another order is already confirmed for this date and time.'
            ], 409);
        }

        // 2. 7‑day rule for customizable cakes
        foreach ($order->items as $item) {
            if ($item->menu && $item->menu->menu_type === 'customizable') {
                $cutoff = Carbon::parse($pickupDate)->subDays(7);
                if (Carbon::now()->greaterThan($cutoff)) {
                    return response()->json([
                        'message' => 'Custom cake orders must be placed at least 7 days before pickup.'
                    ], 422);
                }
            }
        }

        // Approve
        $order->status = 'confirmed';
        $order->save();

        // Log activity
        UserActivityLog::create([
            'user_id'       => auth()->id(),
            'activity_type' => 'order_status_updated',
            'reference_id'  => $order->id,
            'details'       => "Order {$order->order_number} approved (confirmed)",
        ]);

        return response()->json([
            'message' => 'Order approved and schedule confirmed.',
            'order'   => $order->fresh('items.menu'),
        ]);
    }

    /**
     * Reject an order – set status to cancelled.
     */
     public function reject(Request $request, $id) 
    {
        // $order = Order::findOrFail($id);
        // if (!in_array($order->status, ['pending', 'confirmed'])) {
        //     return response()->json(['message' => 'Only pending or confirmed orders can be rejected'], 422);
        // }

        $order = Order::findOrFail($id);

        // Validate that a reason is provided
        $request->validate([
            'reason' => 'required|string|max:1000',
        ]);

        // Walk‑in orders cannot be rejected by admin
        if ($order->customer_id === null) {
            return response()->json([
                'message' => 'Walk‑in orders cannot be rejected by admin.'
            ], 403);
        }

        if (!in_array($order->status, ['pending', 'confirmed'])) {
            return response()->json([
                'message' => 'Only pending or confirmed orders can be rejected'
            ], 422);
        }

        // Append the rejection reason to the notes (preserve original notes)
        $reason = $request->reason;
        $oldNotes = $order->notes ?? '';
        $order->notes = $oldNotes
            ? $oldNotes . "\n[REJECTED]: " . $reason
            : "[REJECTED]: " . $reason;

        $order->status = 'cancelled';
        $order->save();

        // Log the activity (optional)
        UserActivityLog::create([
            'user_id'       => auth()->id(),
            'activity_type' => 'order_cancelled',
            'reference_id'  => $order->id,
            'details'       => "Order {$order->order_number} rejected. Reason: {$reason}",
        ]);

        return response()->json([
            'message' => 'Order rejected successfully.',
            'order'   => $order->fresh(),
        ]);
    }

    /**
     * Update schedule (pickup date/time) of an order.
     * Used by admin to adjust schedule if needed.
     */
    public function updateSchedule(Request $request, $id)
    {
        $order = Order::findOrFail($id);

        // 🚫 Walk‑in orders (no customer) are managed by staff, not admin
        if ($order->customer_id === null) {
            return response()->json([
                'message' => 'Pickup schedule for walk‑in orders is managed by staff, not admin.'
            ], 403);
        }

        $validated = $request->validate([
            'pickup_date' => 'required|date|after_or_equal:today',
            'pickup_time' => 'required|date_format:H:i:s',
        ]);

        // Conflict check (excluding current order)
        $conflict = Order::where('id', '!=', $order->id)
            ->where('pickup_date', $validated['pickup_date'])
            ->where('pickup_time', $validated['pickup_time'])
            ->whereIn('status', ['confirmed', 'preparing', 'ready'])
            ->exists();

        if ($conflict) {
            return response()->json([
                'message' => 'Cannot change to this time – another order already scheduled.'
            ], 409);
        }

        // 7‑day rule if menu items contain customizable cakes
        foreach ($order->items as $item) {
            if ($item->menu && $item->menu->menu_type === 'customizable') {
                $cutoff = Carbon::parse($validated['pickup_date'])->subDays(7);
                if (Carbon::now()->greaterThan($cutoff)) {
                    return response()->json([
                        'message' => 'Custom cakes require at least 7 days before pickup.'
                    ], 422);
                }
            }
        }

        $order->update($validated);

        UserActivityLog::create([
            'user_id'       => auth()->id(),
            'activity_type' => 'order_status_updated',
            'reference_id'  => $order->id,
            'details'       => "Admin updated schedule for order {$order->order_number}",
        ]);

        return response()->json([
            'message' => 'Schedule updated successfully.',
            'order'   => $order->fresh('items.menu'),
        ]);
    }
}