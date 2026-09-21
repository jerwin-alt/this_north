<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CustomDesign extends Model
{
    use HasFactory;

    public $timestamps = false; // only created_at exists

    protected $fillable = [
        'user_id',
        'design_name',
        'custom_flavor', // kept for backward compatibility, but we now use cake_flavor_id
        'flavor_description',
        'cake_size_id',
        'cake_flavor_id',
        'frosting_flavor',
        'design_data', // JSON storing decoration placements
        'dedication_message',
        'special_instructions',
        'total_price',
        'is_saved',
    ];

    protected $casts = [
        'design_data' => 'array',
        'total_price' => 'decimal:2',
        'is_saved' => 'boolean',
    ];


        // Append enriched decorations to JSON output
    protected $appends = ['decorations_with_elements'];

    // Relationships
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function cakeSize()
    {
        return $this->belongsTo(CakeSize::class);
    }

    public function cakeFlavor()
    {
        return $this->belongsTo(CakeFlavor::class);
    }

    // Helper to get decorations with element details
    // Get decorations with element details (image_url, name, price)
    public function getDecorationsWithElements()
    {
        $decorations = $this->design_data ?? [];
        if (empty($decorations)) return [];

        $elementIds = array_column($decorations, 'element_id');
        $elements = DesignElement::whereIn('id', $elementIds)->get()->keyBy('id');

        return array_map(function ($dec) use ($elements) {
            $element = $elements->get($dec['element_id']);
            return [
                'element_id' => $dec['element_id'],
                'x' => $dec['x'],
                'y' => $dec['y'],
                'scale'          => $dec['scale']  ?? 1,     // NEW, default 1
                'color'          => $dec['color']  ?? null,  // NEW, single-color tint
                'colors'         => $dec['colors'] ?? null,  // NEW, part → hex
                'element_name' => $element->element_name ?? null,
                'image_url' => $element->image_url ?? null,
                'svg_source'     => $element->svg_source   ?? null,
                'supports_color' => $element->supports_color ?? false,
                'color_parts'    => $element->color_parts  ?? null,
                'default_price' => $element->default_price ?? 0,
            ];
        }, $decorations);
    }

    // Accessor for the appended attribute
    public function getDecorationsWithElementsAttribute()
    {
        return $this->getDecorationsWithElements();
    }

    public function orderItems()
    {
        return $this->hasMany(OrderItem::class);
    }



    
}