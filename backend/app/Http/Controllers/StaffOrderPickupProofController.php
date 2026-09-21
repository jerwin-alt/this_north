<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\UserActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class StaffOrderPickupProofController extends Controller
{
    public function upload(Request $request, $orderId)
    {
        $request->validate([
            'images.*' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:10240',
        ]);

        $order = Order::findOrFail($orderId);

        if (!in_array($order->status, ['ready', 'completed']) || $order->pickup_method !== 'rider') {
            return response()->json([
                'message' => 'Pickup proof can only be uploaded for ready/completed orders with rider pickup.'
            ], 422);
        }

        $uploaded = [];
        foreach ($request->file('images') as $image) {
            $path = $image->store('pickup_proof', 'public');
            $uploaded[] = [
                'path' => $path,
                'uploaded_by' => auth()->id(),
                'created_at' => now()->toISOString(),
            ];
        }

        DB::transaction(function () use ($order, $uploaded) {
            $order = Order::where('id', $order->id)->lockForUpdate()->first();
            $existing = $order->pickup_proof_images ?? [];
            $order->pickup_proof_images = array_merge($existing, $uploaded);
            $order->save();
        });

        UserActivityLog::create([
            'user_id' => auth()->id(),
            'activity_type' => 'order_status_updated',
            'reference_id' => $order->id,
            'details' => "Staff uploaded pickup proof images for order {$order->order_number}",
        ]);

        $order->refresh();

        return response()->json([
            'message' => 'Pickup proof images uploaded successfully',
            'images' => $order->pickup_proof_images_with_urls,
        ]);
    }
}