<?php

namespace App\Http\Controllers;

use App\Models\CustomDesign;
use App\Models\DesignElement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CustomDesignController extends Controller
{
    /**
     * Save a custom cake design.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'cake_size_id' => 'required|exists:cake_sizes,id',
            'cake_flavor_id' => 'nullable|exists:cake_flavors,id',
            'frosting_flavor' => 'nullable|string|max:100',
            'design_name' => 'nullable|string|max:100',
            'decorations' => 'nullable|array',
            'decorations.*.element_id' => 'required|exists:design_elements,id',
            'decorations.*.x' => 'required|numeric',
            'decorations.*.y' => 'required|numeric',
            'special_instructions' => 'nullable|string',
            'total_price' => 'nullable|numeric|min:0',
        ]);

        $design = CustomDesign::create([
            'user_id' => Auth::id(),
            'cake_size_id' => $validated['cake_size_id'],
            'cake_flavor_id' => $validated['cake_flavor_id'] ?? null,
            'frosting_flavor' => $validated['frosting_flavor'] ?? null,
            'design_name' => $validated['design_name'] ?? null,
            'design_data' => $validated['decorations'] ?? [],
            'special_instructions' => $validated['special_instructions'] ?? null,
            'total_price' => $validated['total_price'] ?? 0,
            'is_saved' => true,
        ]);

        return response()->json([
            'design_id' => $design->id,
            'message' => 'Cake design saved successfully.',
        ], 201);
    }

    /**
     * Get a specific custom design with its decorations.
     */
    public function show($id)
    {
        $design = CustomDesign::with(['cakeSize', 'cakeFlavor'])
            ->where('user_id', Auth::id())
            ->findOrFail($id);

        $decorations = $design->getDecorationsWithElements();

        return response()->json([
            'design' => $design,
            'decorations' => $decorations,
        ]);
    }
}