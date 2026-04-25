<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Menu extends Model
{
    use HasFactory;

    protected $table = 'menu';

    protected $fillable = [
        'category_id',
        'sku',
        'name',
        'description',
        'base_price',
        'menu_type',
        'has_size_options',
        'is_active',
        'stock_quantity',
        'is_ready_made',
        'track_stock',
        'expiration_date',
        'min_stock_level',
        'image_url',
        'stocked_at'
    ];

    protected $casts = [
        'has_size_options' => 'boolean',
        'is_active'        => 'boolean',
        'is_ready_made'    => 'boolean',
        'track_stock'      => 'boolean',
        'base_price'       => 'decimal:2',
        'stock_quantity'   => 'integer',
        'min_stock_level'  => 'integer',
        'expiration_date'  => 'date',
        'stocked_at'       => 'datetime',
    ];

    // Relationships
    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function drinkSizes()
    {
        return $this->hasMany(DrinkSize::class);
    }

    public function billOfMaterials()
    {
        return $this->hasMany(BillOfMaterials::class);
    }

    public function orderItems()
    {
        return $this->hasMany(OrderItem::class);
    }
}
