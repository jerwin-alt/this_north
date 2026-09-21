<?php

namespace App\Http\Controllers;

use App\Models\LoyaltyReward;
use Illuminate\Http\Request;
use App\Models\LoyaltySetting;

class AdminLoyaltyController extends Controller
{
    /**
     * Display all loyalty rewards grouped by type.
     */
    public function index()
    {
        $rewards = LoyaltyReward::all();

        // Group rewards by type
        $grouped = $rewards->groupBy('reward_type')->map(function ($group) {
            return $group->map(function ($reward) {
                return [
                    'id' => $reward->id,
                    'user_id' => $reward->user_id,
                    'user_name' => $reward->user ? $reward->user->first_name . ' ' . $reward->user->last_name : 'N/A',
                    'reward_type' => $reward->reward_type,
                    'claimed_at' => $reward->claimed_at,
                    'is_used' => $reward->is_used,
                    'is_active' => $reward->is_active,
                    'used_at' => $reward->used_at,
                ];
            });
        });

        // Get reward counts
        $stats = [
            'total_rewards' => $rewards->count(),
            'active_rewards' => $rewards->where('is_active', true)->count(),
            'used_rewards' => $rewards->where('is_used', true)->count(),
            'by_type' => [
                '30_percent' => $rewards->where('reward_type', '30_percent')->count(),
                'free_slice' => $rewards->where('reward_type', 'free_slice')->count(),
                'free_coffee' => $rewards->where('reward_type', 'free_coffee')->count(),
                'free_non_coffee' => $rewards->where('reward_type', 'free_non_coffee')->count(),
            ],
        ];

        // Get global settings
        $settings = LoyaltySetting::getSettings();

        return response()->json([
            'rewards' => $grouped,
            'stats' => $stats,
            'settings' => [
                'is_30_percent_active' => $settings->is_30_percent_active,
                'is_10_star_active' => $settings->is_10_star_active,
            ],
        ]);
    }




        /**
     * Get loyalty settings (public endpoint for customers)
     */
    public function settings()
    {
        $settings = LoyaltySetting::getSettings();

        return response()->json([
            'is_30_percent_active' => $settings->is_30_percent_active,
            'is_10_star_active' => $settings->is_10_star_active,
        ]);
    }



        /**
     * Toggle global loyalty settings (admin only)
     */
    public function toggleSettings(Request $request)
    {
        $request->validate([
            'setting' => 'required|in:is_30_percent_active,is_10_star_active',
            'value' => 'required|boolean',
        ]);

        $settings = LoyaltySetting::getSettings();
        $settings->{$request->setting} = $request->value;
        $settings->save();

        return response()->json([
            'message' => 'Loyalty setting updated successfully',
            'settings' => $settings,
        ]);
    }



    /**
     * Toggle the active status of a reward (per-customer)
     */
    public function toggleActive($id)
    {
        $reward = LoyaltyReward::findOrFail($id);
        $reward->is_active = !$reward->is_active;
        $reward->save();

        return response()->json([
            'message' => 'Reward status updated successfully',
            'reward' => $reward,
        ]);
    }

    /**
     * Update multiple rewards' active status.
     */
    public function batchUpdate(Request $request)
    {
        $request->validate([
            'reward_ids' => 'required|array',
            'reward_ids.*' => 'exists:loyalty_rewards,id',
            'is_active' => 'required|boolean',
        ]);

        LoyaltyReward::whereIn('id', $request->reward_ids)
            ->update(['is_active' => $request->is_active]);

        return response()->json([
            'message' => 'Rewards updated successfully',
        ]);
    }



    /**
     * Toggle all loyalty settings at once
     */
    public function toggleAll(Request $request)
    {
        $request->validate([
            'active' => 'required|boolean',
        ]);

        $settings = LoyaltySetting::getSettings();
        $settings->is_30_percent_active = $request->active;
        $settings->is_10_star_active = $request->active;
        $settings->save();

        return response()->json([
            'message' => 'All loyalty settings updated successfully',
            'settings' => $settings,
        ]);
    }


}