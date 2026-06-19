<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Payment;
use App\Models\UserActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class CustomerPaymentController extends Controller
{
    /**
     * Store a newly created payment (customer side).
     * Payment is only allowed if the order is not pending or cancelled.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'order_id'          => 'required|exists:orders,id',
            'payment_method'    => ['required', Rule::in(['cash', 'gcash'])],
            'amount_paid'       => 'required|numeric|min:0.01',
            'reference_number'  => 'nullable|string|max:100',
        ]);

        $order = Order::with('payments')->findOrFail($validated['order_id']);

        // 🔒 NEW: Only allow payment if order is NOT pending or cancelled
        if (in_array($order->status, ['pending', 'cancelled'])) {
            return response()->json([
                'message' => 'Payment is not allowed for pending or cancelled orders. Please wait for admin approval.'
            ], 403);
        }

        // Calculate total already paid
        $alreadyPaid = $order->payments->where('payment_status', 'completed')->sum('amount_paid');
        $remainingBalance = $order->total_amount - $alreadyPaid;

        if ($validated['amount_paid'] <= 0) {
            return response()->json(['message' => 'Amount must be greater than zero'], 422);
        }

        // Check if overpayment (but allow if remaining balance is >0)
        $changeAmount = 0;
        if ($validated['amount_paid'] > $remainingBalance && $remainingBalance > 0) {
            // Overpayment – will be handled as change
            $changeAmount = $validated['amount_paid'] - $remainingBalance;
        }

        DB::beginTransaction();
        try {
            $newPaid = $alreadyPaid + $validated['amount_paid'];
            $paymentStatus = 'unpaid';

            if ($newPaid >= $order->total_amount) {
                $paymentStatus = 'paid';
                // If overpaid, change is already computed
                if ($newPaid > $order->total_amount) {
                    $changeAmount = $newPaid - $order->total_amount;
                }
            } elseif ($newPaid > 0) {
                $paymentStatus = 'partially_paid';
            }

            // Create payment record
            $payment = Payment::create([
                'order_id'         => $order->id,
                'payment_type'     => 'full', // customers always pay full or down? but we have payment_option from frontend – we can ignore for now
                'payment_method'   => $validated['payment_method'],
                'amount_paid'      => $validated['amount_paid'],
                'discount_amount'  => 0, // no discount applied at payment level yet
                'final_amount'     => $validated['amount_paid'],
                'change_amount'    => $changeAmount,
                'payment_date'     => now(),
                'reference_number' => $validated['reference_number'] ?? null,
                'payment_status'   => 'completed',
                'processed_by'     => auth()->id(), // customer is the one paying
            ]);

            // Update order payment status
            $order->update(['payment_status' => $paymentStatus]);

            // Log activity
            UserActivityLog::create([
                'user_id'       => auth()->id(),
                'activity_type' => 'discount_applied', // using generic; could add 'payment_made'
                'reference_id'  => $payment->id,
                'details'       => "Payment of ₱{$validated['amount_paid']} received for order {$order->order_number}",
            ]);

            DB::commit();

            return response()->json([
                'message'               => 'Payment recorded successfully',
                'payment'               => $payment->load('order'),
                'order_payment_status'  => $paymentStatus,
                'change'                => $changeAmount,
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Payment failed: ' . $e->getMessage()
            ], 500);
        }
    }
}