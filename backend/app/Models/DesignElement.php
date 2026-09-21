<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DesignElement extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'element_type',
        'element_name',
        'category',
        'default_price',
        'image_url',
        'svg_url',
        'svg_code',
        'supports_color',
        'color_parts',
        'is_active',
        'display_order',
    ];

    protected $casts = [
        'default_price' => 'decimal:2',
        'is_active' => 'boolean',
        'display_order' => 'integer',
        'supports_color'  => 'boolean',
        'color_parts'     => 'array',
    ];


    // protected $appends = ['svg_source'];

    // Resolves to the actual SVG markup the mobile app should render.
    // Priority: inline svg_code → svg_url → null (caller falls back to image_url).
    // public function getSvgSourceAttribute(): ?string {
    //     if ($this->svg_code) return $this->svg_code;
    //     if ($this->svg_url)  return url($this->svg_url); // or Storage::url(...)
    //     return null;
    // }


    protected $appends = ['svg_source'];

    public function getSvgSourceAttribute(): ?string
    {
        if (!empty($this->svg_code)) {
            return $this->svg_code;
        }
        if (!empty($this->svg_url)) {
            return str_starts_with($this->svg_url, 'http')
                ? $this->svg_url
                : url($this->svg_url);
        }
        return null;
    }
}