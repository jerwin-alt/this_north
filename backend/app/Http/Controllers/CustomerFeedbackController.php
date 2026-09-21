<?php

namespace App\Http\Controllers;

use App\Models\Feedback;
use App\Models\Order;
use App\Models\UserActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class CustomerFeedbackController extends Controller
{
    /**
     * Store a new feedback entry.
     * Only the authenticated customer can submit.
     */
    public function store(Request $request)
    {
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'order_id'      => 'nullable|exists:orders,id',
            'menu_id'       => 'nullable|exists:menu,id',
            'rating'        => 'required|integer|min:1|max:5',
            'comment'       => 'nullable|string|max:1000',
            'feedback_type' => 'required|in:order,product,service',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Ensure the order belongs to the customer (if provided)
        if ($request->filled('order_id')) {
            $order = Order::find($request->order_id);
            if (!$order || $order->customer_id !== $user->id) {
                return response()->json([
                    'message' => 'You are not authorised to provide feedback for this order.'
                ], 403);
            }
        }

        // Check if feedback already exists for this order and user
        $existing = Feedback::where('customer_id', $user->id)
                            ->where('order_id', $request->order_id)
                            ->exists();
        if ($existing) {
            return response()->json([
                'message' => 'You have already submitted feedback for this order.'
            ], 409);
        }
    

        $feedback = Feedback::create([
            'customer_id'   => $user->id,
            'order_id'      => $request->order_id,
            'menu_id'       => $request->menu_id,
            'rating'        => $request->rating,
            'comment'       => $request->comment,
            'feedback_type' => $request->feedback_type,
        ]);

        // Log activity
        UserActivityLog::create([
            'user_id'       => $user->id,
            'activity_type' => 'feedback_submitted', // you may add this enum to the migration
            'reference_id'  => $feedback->id,
            'details'       => "Customer submitted feedback (type: {$request->feedback_type})",
        ]);

        return response()->json([
            'message'  => 'Thank you for your feedback!',
            'feedback' => $feedback,
        ], 201);
    }


    public function show($orderId)
    {
        $user = auth()->user();
        $feedback = Feedback::with('menu')
                            ->where('customer_id', $user->id)
                            ->where('order_id', $orderId)
                            ->first();

        if (!$feedback) {
            return response()->json(['message' => 'Review not found'], 404);
        }

        return response()->json(['review' => $feedback]);
    }
}