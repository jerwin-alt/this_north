<?php

namespace App\Http\Controllers;

use App\Models\Discount;
use App\Models\UserActivityLog;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DiscountController extends Controller
{
    /**
     * Display a listing of all discounts.
     * Admin only – returns active discounts first, then inactive.
     */
    public function index()
    {
        $discounts = Discount::orderBy('is_active', 'desc')
                            ->orderBy('discount_name')
                            ->get();

        return response()->json([
            'discounts' => $discounts,
            'message'   => 'Discounts retrieved successfully'
        ]);
    }

    /**
     * Store a newly created discount.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'discount_name'         => 'required|string|max:100',
            'discount_type'         => 'required|string|max:50',
            'discount_value'        => 'required|numeric|min:0',
            'description'           => 'nullable|string',
            'is_active'             => 'boolean',
            'requires_verification' => 'boolean',
        ]);

        // Ensure boolean conversion
        $validated['is_active'] = $validated['is_active'] ?? true;
        $validated['requires_verification'] = $validated['requires_verification'] ?? false;

        $discount = Discount::create($validated);

        // Log activity (reusing your existing logs table)
        UserActivityLog::create([
            'user_id'       => auth()->id(),
            'activity_type' => 'discount_applied',  // or a new type 'discount_created'
            'reference_id'  => $discount->id,
            'details'       => "Created discount: {$discount->discount_name} (type: {$discount->discount_type})",
        ]);

        return response()->json([
            'message'  => 'Discount created successfully',
            'discount' => $discount
        ], 201);
    }

    /**
     * Display the specified discount.
     */
    public function show($id)
    {
        $discount = Discount::findOrFail($id);
        return response()->json([
            'discount' => $discount,
            'message'  => 'Discount retrieved successfully'
        ]);
    }

    /**
     * Update the specified discount.
     */
    public function update(Request $request, $id)
    {
        $discount = Discount::findOrFail($id);

        $validated = $request->validate([
            'discount_name'         => 'required|string|max:100',
            'discount_type'         => 'required|string|max:50',
            'discount_value'        => 'required|numeric|min:0',
            'description'           => 'nullable|string',
            'is_active'             => 'boolean',
            'requires_verification' => 'boolean',
        ]);

        $oldName = $discount->discount_name;
        $discount->update($validated);

        // Log activity
        UserActivityLog::create([
            'user_id'       => auth()->id(),
            'activity_type' => 'discount_applied', // or 'discount_updated'
            'reference_id'  => $discount->id,
            'details'       => "Updated discount: {$oldName} → {$discount->discount_name}",
        ]);

        return response()->json([
            'message'  => 'Discount updated successfully',
            'discount' => $discount->fresh()
        ]);
    }

    /**
     * Remove the specified discount.
     */
    public function destroy($id)
    {
        $discount = Discount::findOrFail($id);

        // Optional: prevent deletion if discount is already used in any payment
        // if ($discount->payments()->exists()) {
        //     return response()->json(['message' => 'Cannot delete discount that has been used in payments'], 409);
        // }

        $discount->delete();

        return response()->json([
            'message' => 'Discount deleted successfully'
        ]);
    }




        public function staffIndex()
    {
        // Return all discounts – you can uncomment the where clause to show only active ones.
        $discounts = Discount::orderBy('is_active', 'desc')
                            ->orderBy('discount_name')
                            // ->where('is_active', true)
                            ->get();

        return response()->json([
            'discounts' => $discounts,
            'message'   => 'Discounts retrieved successfully'
        ]);
    }
}