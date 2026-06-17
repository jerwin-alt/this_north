<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class CustomerPaymentController extends Controller
{
    /**
     * Record a payment for an order (30% down or full).
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'order_id'         => 'required|exists:orders,id',
            'payment_method'   => ['required', Rule::in(['gcash', 'credit_card', 'bank_transfer'])],
            'amount_paid'      => 'required|numeric|min:0.01',
            'reference_number' => 'nullable|string|max:100',
        ]);

        $order = Order::with('payments')->findOrFail($validated['order_id']);

        // Ensure the order belongs to the authenticated customer
        if ($order->customer_id !== auth()->id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Only allow payment if order is still pending
        if ($order->status !== 'pending') {
            return response()->json(['message' => 'Order already processed'], 422);
        }

        $totalAmount = $order->total_amount;
        $alreadyPaid = $order->payments->where('payment_status', 'completed')->sum('amount_paid');

        // If already paid partially, the remaining can be any amount up to balance
        $remaining = $totalAmount - $alreadyPaid;

        $validPercentages = [0.3, 1.0];
        $isValidAmount = false;
        $paymentType = null;

        foreach ($validPercentages as $pct) {
            $expected = round($totalAmount * $pct, 2);
            if (abs($validated['amount_paid'] - $expected) < 0.01) {
                $isValidAmount = true;
                $paymentType = ($pct == 1.0) ? 'full' : 'downpayment';
                break;
            }
        }

        // Also allow paying the exact remaining balance
        if (abs($validated['amount_paid'] - $remaining) < 0.01) {
            $isValidAmount = true;
            $paymentType = ($remaining == $totalAmount) ? 'downpayment' : 'full';
        }

        if (!$isValidAmount && $alreadyPaid == 0) {
            return response()->json([
                'message' => "Payment amount must be either 30% of total (₱" . round($totalAmount * 0.3, 2) . ") or full amount (₱{$totalAmount})."
            ], 422);
        }

        if ($validated['amount_paid'] > $remaining) {
            return response()->json(['message' => 'Amount exceeds remaining balance'], 422);
        }

        DB::beginTransaction();
        try {
            $newPaid = $alreadyPaid + $validated['amount_paid'];
            $changeAmount = 0;

            if ($newPaid >= $totalAmount) {
                $paymentStatus = 'paid';
                $changeAmount = $newPaid - $totalAmount;
            } else {
                $paymentStatus = 'partially_paid';
            }

            $payment = Payment::create([
                'order_id'         => $order->id,
                'payment_type'     => $paymentType,
                'payment_method'   => $validated['payment_method'],
                'amount_paid'      => $validated['amount_paid'],
                'discount_amount'  => 0,
                'final_amount'     => $validated['amount_paid'],
                'change_amount'    => $changeAmount,
                'payment_date'     => now(),
                'reference_number' => $validated['reference_number'] ?? null,
                'payment_status'   => 'completed',
                'processed_by'     => auth()->id(),
            ]);

            $order->update(['payment_status' => $paymentStatus]);

            // Log activity
            \App\Models\UserActivityLog::create([
                'user_id'       => auth()->id(),
                'activity_type' => 'discount_applied', // or add 'payment_made'
                'reference_id'  => $payment->id,
                'details'       => "Customer paid ₱{$validated['amount_paid']} for order {$order->order_number}",
            ]);

            DB::commit();

            return response()->json([
                'message'    => 'Payment recorded successfully',
                'payment'    => $payment,
                'order_payment_status' => $paymentStatus,
                'change'     => $changeAmount,
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Payment failed: ' . $e->getMessage()], 500);
        }
    }
}