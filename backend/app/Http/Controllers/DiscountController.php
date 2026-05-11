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
// app/Http/Controllers/DiscountController.php
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

    // Check for existing active discount with the same name
    $existing = Discount::where('discount_name', $validated['discount_name'])
                        ->where('is_active', true)
                        ->first();

    if ($existing) {
        // Check if the value and type are identical → duplicate
        if ($existing->discount_value == $validated['discount_value']
            && $existing->discount_type == $validated['discount_type']) {
            return response()->json([
                'message' => 'A discount with this name, type and value already exists and is active.',
                'existing_discount' => $existing
            ], 409);  // 409 Conflict
        }

        // Different value → deactivate the old discount, new one becomes new version
        $existing->update(['is_active' => false]);
        $validated['parent_id'] = $existing->id;
        $validated['version'] = $existing->version + 1;
    }

    $discount = Discount::create($validated);

    // Log activity
    UserActivityLog::create([
        'user_id'       => auth()->id(),
        'activity_type' => 'discount_applied',
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
        'discount_name'         => 'sometimes|required|string|max:100',
        'discount_type'         => 'sometimes|required|string|max:50',
        'discount_value'        => 'sometimes|required|numeric|min:0',
        'description'           => 'nullable|string',
        'is_active'             => 'sometimes|boolean',
        'requires_verification' => 'sometimes|boolean',
    ]);

    $oldName = $discount->discount_name;
    $discount->update($validated);

    // If activating this discount, deactivate any other active discounts with the same name
    if (isset($validated['is_active']) && $validated['is_active']) {
        Discount::where('discount_name', $discount->discount_name)
            ->where('id', '!=', $discount->id)
            ->where('is_active', true)
            ->update(['is_active' => false]);
    }

    // Log activity
    UserActivityLog::create([
        'user_id'       => auth()->id(),
        'activity_type' => 'discount_applied',
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