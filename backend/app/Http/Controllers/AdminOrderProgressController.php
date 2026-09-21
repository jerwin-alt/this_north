<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\UserActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class AdminOrderProgressController extends Controller
{
    /**
     * Upload a progress image for a custom order.
     */
    public function upload(Request $request, $orderId)
    {
        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:10240', // 10MB
        ]);

        $order = Order::findOrFail($orderId);

        // Check if order has custom items
        $hasCustom = $order->items()->where('cake_type', 'custom')->exists();
        if (!$hasCustom) {
            return response()->json([
                'message' => 'Only custom orders can have progress images.'
            ], 422);
        }

        // Store image
        $path = $request->file('image')->store('order_progress', 'public');

        $newImage = [
            'path' => $path,
            'uploaded_by' => auth()->id(),
            'created_at' => now()->toISOString(),
        ];

        // Use transaction with lock to prevent race conditions
        DB::transaction(function () use ($order, $newImage) {
            // Lock the order row
            $order = Order::where('id', $order->id)->lockForUpdate()->first();
            $images = $order->progress_images ?? [];
            $images[] = $newImage;
            $order->progress_images = $images;
            $order->save();
        });

        // Log activity
        UserActivityLog::create([
            'user_id' => auth()->id(),
            'activity_type' => 'order_status_updated',
            'reference_id' => $order->id,
            'details' => "Admin uploaded progress image for order {$order->order_number}",
        ]);

        // Return the newly added image with URL
        $newImage['image_url'] = asset('storage/' . $path);

        return response()->json([
            'message' => 'Progress image uploaded successfully',
            'image' => $newImage,
        ]);
    }
}