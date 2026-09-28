<?php

namespace App\Http\Controllers;

use App\Models\CustomDesign;
use App\Models\DesignElement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class CustomDesignController extends Controller
{
    /**
     * Save a custom cake design.
     */
    public function store(Request $request)
    {
        // ─── 1. Base validation (decorations validated separately below) ───
        $validated = $request->validate([
            'cake_size_id'        => 'required|exists:cake_sizes,id',
            'cake_flavor_id'      => 'nullable|exists:cake_flavors,id',
            'frosting_flavor'     => 'nullable|string|max:100',
            'tiers'               => 'nullable|integer|min:1|max:3',
            'design_name'         => 'nullable|string|max:100',
            'special_instructions'=> 'nullable|string',
            'total_price'         => 'nullable|numeric|min:0',
            'reference_image'     => 'nullable|image|mimes:jpeg,png,jpg,webp|max:10240',
        ]);

        // ─── 2. Decode decorations (works for both JSON and multipart) ───
        $decorationsInput = $request->input('decorations');
        if (is_string($decorationsInput)) {
            $decorationsInput = json_decode($decorationsInput, true);
        }
        $decorations = is_array($decorationsInput) ? $decorationsInput : [];

        // ─── 3. Validate decorations if present ───
        if (!empty($decorations)) {
            $decoValidator = Validator::make(['decorations' => $decorations], [
                'decorations.*.element_id'  => 'required|exists:design_elements,id',
                'decorations.*.x'           => 'required|numeric',
                'decorations.*.y'           => 'required|numeric',
                'decorations.*.scale'       => 'nullable|numeric|min:0.1|max:5',
                'decorations.*.color'       => 'nullable|string|max:9',
                'decorations.*.colors'      => 'nullable|array',
                'decorations.*.tier_index'  => 'nullable|integer|min:0|max:2',
            ]);
            if ($decoValidator->fails()) {
                return response()->json(['errors' => $decoValidator->errors()], 422);
            }
        }

        // ─── 4. Handle reference image upload ───
        $referenceImagePath = null;
        if ($request->hasFile('reference_image')) {
            $referenceImagePath = $request->file('reference_image')->store('reference_images', 'public');
        }

        // ─── 5. Create the design row ───
        $design = CustomDesign::create([
            'user_id'             => Auth::id(),
            'cake_size_id'        => $validated['cake_size_id'],
            'cake_flavor_id'      => $validated['cake_flavor_id'] ?? null,
            'frosting_flavor'     => $validated['frosting_flavor'] ?? null,
            'tiers'               => $validated['tiers'] ?? 1,
            'design_name'         => $validated['design_name'] ?? null,
            'design_data'         => $decorations,
            'special_instructions'=> $validated['special_instructions'] ?? null,
            'total_price'         => $validated['total_price'] ?? 0,
            'is_saved'            => true,
            'reference_image'     => $referenceImagePath,   // ← NEW
        ]);

        return response()->json([
            'design_id' => $design->id,
            'message'   => 'Cake design saved successfully.',
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