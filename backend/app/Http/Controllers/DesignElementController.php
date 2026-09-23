<?php

namespace App\Http\Controllers;

use App\Models\DesignElement;
use Illuminate\Http\Request;

class DesignElementController extends Controller
{
    /**
     * Get all active design elements, grouped by category.
     */
    public function index()
    {
        $elements = DesignElement::where('is_active', true)
            ->orderBy('display_order')
            ->get();

        // Group by category
        $grouped = $elements->groupBy('category')->map(function ($group) {
            return $group->map(function ($item) {
                return [
                    'id' => $item->id,
                    'element_name' => $item->element_name,
                    'element_type' => $item->element_type,
                    'category' => $item->category,
                    'image_url' => $item->image_url,
                    'svg_source'     => $item->svg_source,     // NEW
                    'supports_color' => $item->supports_color, // NEW
                    'color_parts'    => $item->color_parts,    // NEW
                    'default_price' => $item->default_price,
                ];
            });
        });

        return response()->json([
            'categories' => $grouped->keys(),
            'elements' => $grouped,
        ]);
    }
}