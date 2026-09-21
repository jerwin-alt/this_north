<?php

namespace App\Services;

use App\Models\LoyaltySignatureLog;
use App\Models\LoyaltyReward;
use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Database\UniqueConstraintViolationException;

class LoyaltyService
{
    /**
     * Award a stamp when an order is completed.
     */
    public function awardStamp(Order $order): bool
    {
        // 1. Only registered customers
        if (!$order->customer_id) {
            return false;
        }

        $user = $order->customer;

        // 2. If loyalty already completed (10-star redeemed), skip
        if ($user->loyalty_completed) {
            return false;
        }

        // 3. Only completed orders
        if ($order->status !== 'completed') {
            return false;
        }

        $today = now('Asia/Manila')->toDateString();

        try {
            DB::transaction(function () use ($user, $order, $today) {
                // Lock user row to prevent race conditions
                $user = User::where('id', $user->id)->lockForUpdate()->first();

                // Double-check completion after lock
                if ($user->loyalty_completed) {
                    return;
                }

                // Count existing stamps
                $currentCount = LoyaltySignatureLog::where('user_id', $user->id)->count();

                // Create the log – unique constraint prevents duplicate day
                $log = LoyaltySignatureLog::create([
                    'user_id'         => $user->id,
                    'order_id'        => $order->id,
                    'signature_date'  => $today,
                    'signature_number' => $currentCount + 1,
                ]);

                // Update denormalized stamp count
                $user->signature_stamps = $currentCount + 1;
                $user->save();

                // Log activity (optional)
                \App\Models\UserActivityLog::create([
                    'user_id'       => $user->id,
                    'activity_type' => 'signature_earned',
                    'reference_id'  => $order->id,
                    'details'       => "Earned loyalty stamp #{$log->signature_number} from order {$order->order_number}",
                ]);

                // Check milestones
                $this->checkMilestones($user, $log->signature_number);
            });

            return true;
        } catch (UniqueConstraintViolationException $e) {
            // User already got a stamp today – silently ignore
            return false;
        } catch (\Exception $e) {
            Log::error("Loyalty stamp error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Check for milestone rewards after a new stamp.
     */
    protected function checkMilestones(User $user, int $newTotal)
    {
        // 5 stamps → 30% discount
        if ($newTotal == 5) {
            $this->createReward($user, '30_percent', null);
        }

        // 10 stamps → free slice (beverage will be created at redemption)
        if ($newTotal == 10) {
            $this->createReward($user, 'free_slice', null);
        }
    }

    /**
     * Create a reward if it doesn't already exist.
     */
    protected function createReward(User $user, string $rewardType, ?int $orderId)
    {
        $existing = LoyaltyReward::where('user_id', $user->id)
                                 ->where('reward_type', $rewardType)
                                 ->first();
        if ($existing) {
            return;
        }

        LoyaltyReward::create([
            'user_id'    => $user->id,
            'reward_type'=> $rewardType,
            'order_id'   => $orderId,
            'claimed_at' => now(),
            'is_used'    => false,
        ]);
    }

    /**
     * Redeem the 30% discount reward.
     */
    public function redeem30Percent(User $user, Order $order): bool
    {
        $reward = LoyaltyReward::where('user_id', $user->id)
                               ->where('reward_type', '30_percent')
                               ->where('is_used', false)
                               ->first();

        if (!$reward) {
            return false;
        }

        $reward->update([
            'is_used'       => true,
            'used_at'       => now(),
            'used_order_id' => $order->id,
        ]);

        return true;
    }

    /**
     * Redeem the 10‑star reward (free slice + free beverage).
     * The customer chooses beverage type: 'coffee' or 'non_coffee'.
     */
    public function redeem10Star(User $user, Order $order, string $beverageType): bool
    {
        if (!in_array($beverageType, ['coffee', 'non_coffee'])) {
            return false;
        }

        $beverageRewardType = ($beverageType === 'coffee') ? 'free_coffee' : 'free_non_coffee';

        // Check if already completed
        if ($user->loyalty_completed) {
            return false;
        }

        // Check for available free_slice reward
        $sliceReward = LoyaltyReward::where('user_id', $user->id)
                                    ->where('reward_type', 'free_slice')
                                    ->where('is_used', false)
                                    ->first();

        if (!$sliceReward) {
            return false;
        }

        // Ensure user hasn't already received a beverage reward
        $existingBeverage = LoyaltyReward::where('user_id', $user->id)
                                         ->whereIn('reward_type', ['free_coffee', 'free_non_coffee'])
                                         ->exists();
        if ($existingBeverage) {
            return false;
        }

        DB::transaction(function () use ($user, $order, $sliceReward, $beverageRewardType) {
            // Mark free_slice as used
            $sliceReward->update([
                'is_used'       => true,
                'used_at'       => now(),
                'used_order_id' => $order->id,
            ]);

            // Create the beverage reward and mark it used immediately
            LoyaltyReward::create([
                'user_id'       => $user->id,
                'reward_type'   => $beverageRewardType,
                'order_id'      => null,
                'claimed_at'    => now(),
                'is_used'       => true,
                'used_at'       => now(),
                'used_order_id' => $order->id,
            ]);

            // Mark loyalty as permanently completed
            $user->loyalty_completed = true;
            $user->save();
        });

        return true;
    }
}