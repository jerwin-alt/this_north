<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class AdminCustomerController extends Controller
{
    /**
     * GET /api/admin/customers/{customerId}/orders
     *
     * Returns the full order history for ONE specific customer,
     * strictly scoped via orders.customer_id.
     */
    public function getCustomerOrders(Request $request, int $customerId)
    {
        $validator = Validator::make($request->query(), [
            'search'         => 'nullable|string|max:100',
            'status'         => 'nullable|in:pending,confirmed,preparing,ready,completed,cancelled',
            'payment_status' => 'nullable|in:unpaid,partially_paid,paid,refunded',
            'order_type'     => 'nullable|in:standard,custom',
            'date_from'      => 'nullable|date',
            'date_to'        => 'nullable|date|after_or_equal:date_from',
            'per_page'       => 'nullable|integer|min:1|max:50',
            'page'           => 'nullable|integer|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Invalid filter parameters.',
                'errors'  => $validator->errors(),
            ], 422);
        }

        // Only real customers — never staff/admin IDs
        $customer = User::where('id', $customerId)
            ->where('role', 'customer')
            ->first();

        if (!$customer) {
            return response()->json(['message' => 'Customer not found.'], 404);
        }

        $query = $customer->orders()
            ->with([
                'items.menu:id,name,sku,image_url,base_price',
                'items.cakeSize',
                'items.cakeFlavor',
                'items.drinkSize',
                'items.customDesign.cakeSize',
                'items.customDesign.cakeFlavor',
                'payments',
                'discount:id,discount_name,discount_type,discount_value',
            ]);

        if ($request->filled('search')) {
            $search = trim($request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                  ->orWhere('id', $search);
            });
        }
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }
        if ($request->filled('payment_status')) {
            $query->where('payment_status', $request->input('payment_status'));
        }
        if ($request->filled('order_type')) {
            $type = $request->input('order_type');
            $query->whereHas('items', fn ($q) => $q->where('cake_type', $type));
        }
        if ($request->filled('date_from')) {
            $query->whereDate('order_date', '>=', $request->input('date_from'));
        }
        if ($request->filled('date_to')) {
            $query->whereDate('order_date', '<=', $request->input('date_to'));
        }

        $orders = $query
            ->orderByDesc('order_date')
            ->orderByDesc('id')
            ->paginate((int) $request->input('per_page', 10));

        return response()->json([
            'message'  => 'Customer order history retrieved successfully.',
            'customer' => [
                'id'         => $customer->id,
                'first_name' => $customer->first_name,
                'last_name'  => $customer->last_name,
                'email'      => $customer->email,
            ],
            'orders'     => $orders->items(),
            'pagination' => [
                'current_page' => $orders->currentPage(),
                'last_page'    => $orders->lastPage(),
                'per_page'     => $orders->perPage(),
                'total'        => $orders->total(),
                'from'         => $orders->firstItem(),
                'to'           => $orders->lastItem(),
            ],
        ], 200);
    }
}