<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Services\LoyaltyService;
use Illuminate\Http\Request;

class LoyaltyController extends Controller
{
    public function __construct(protected LoyaltyService $loyaltyService) {}

    public function index(Request $request)
    {
        $user = $request->user();

        $stamps = $user->loyaltySignatureLogs()->count();
        $rewards = $user->loyaltyRewards()
                        ->where('is_used', false)
                        ->get(['reward_type', 'claimed_at']);

        return response()->json([
            'total_stamps' => $stamps,
            'available_rewards' => $rewards,
            'loyalty_completed' => $user->loyalty_completed,
        ]);
    }

    public function redeem30Percent(Request $request)
    {
        $user = $request->user();
        $order = Order::where('customer_id', $user->id)
                      ->where('status', 'pending')
                      ->latest()
                      ->first();

        if (!$order) {
            return response()->json(['message' => 'No pending order to apply discount'], 422);
        }

        $success = $this->loyaltyService->redeem30Percent($user, $order);

        return $success
            ? response()->json(['message' => '30% discount applied successfully'])
            : response()->json(['message' => 'No available 30% reward'], 422);
    }

    public function redeem10Star(Request $request)
    {
        $request->validate([
            'beverage_type' => 'required|in:coffee,non_coffee',
        ]);

        $user = $request->user();
        $order = Order::where('customer_id', $user->id)
                      ->where('status', 'pending')
                      ->latest()
                      ->first();

        if (!$order) {
            return response()->json(['message' => 'No pending order'], 422);
        }

        $success = $this->loyaltyService->redeem10Star(
            $user,
            $order,
            $request->beverage_type
        );

        return $success
            ? response()->json(['message' => '10-star reward redeemed! Free slice + free beverage added.'])
            : response()->json(['message' => 'No available 10-star reward'], 422);
    }
}