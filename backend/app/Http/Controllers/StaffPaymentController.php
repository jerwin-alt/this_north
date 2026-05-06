<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class StaffPaymentController extends Controller
{
    /**
     * POST /api/staff/payments
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

        // Calculate total already paid
        $alreadyPaid = $order->payments->where('payment_status', 'completed')->sum('amount_paid');
        $remainingBalance = $order->total_amount - $alreadyPaid;

        if ($validated['amount_paid'] <= 0) {
            return response()->json(['message' => 'Amount must be greater than zero'], 422);
        }

        if ($validated['amount_paid'] > $remainingBalance && $remainingBalance > 0) {
            // Overpayment
            $change = $validated['amount_paid'] - $remainingBalance;
        }

        DB::beginTransaction();
        try {
            $newPaid = $alreadyPaid + $validated['amount_paid'];
            $paymentStatus = 'unpaid';
            $changeAmount = 0;

            if ($newPaid >= $order->total_amount) {
                $paymentStatus = 'paid';
                $changeAmount = $newPaid - $order->total_amount;
            } elseif ($newPaid > 0) {
                $paymentStatus = 'partially_paid';
            }

            // Create payment record
            $payment = Payment::create([
                'order_id'         => $order->id,
                'payment_type'     => 'full', // or 'downpayment' if you need; keep simple
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

            // Update order payment status
            $order->update(['payment_status' => $paymentStatus]);

            // Log activity
            \App\Models\UserActivityLog::create([
                'user_id'       => auth()->id(),
                'activity_type' => 'discount_applied', // using generic; better add a 'payment' type
                'reference_id'  => $payment->id,
                'details'       => "Payment of ₱{$validated['amount_paid']} received for order {$order->order_number}",
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Payment recorded successfully',
                'payment' => $payment->load('order'),
                'order_payment_status' => $paymentStatus,
                'change' => $changeAmount,
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Payment failed: ' . $e->getMessage()], 500);
        }
    }
}