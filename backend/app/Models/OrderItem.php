<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OrderItem extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'order_id',
        'menu_id',
        'cake_type',
        'cake_size_id',
        'drink_sizes_id',
        'cake_flavor_id',
        'custom_flavor',
        'custom_design_id',
        'quantity',
        'unit_price',
        'subtotal',
        'total_price',
        'is_free_item',
    ];

    protected $casts = [
        'is_free_item' => 'boolean',
        'unit_price'   => 'decimal:2',
        'subtotal'     => 'decimal:2',
        'total_price'  => 'decimal:2',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function menu()
    {
        return $this->belongsTo(Menu::class, 'menu_id');
    }

    public function cakeSize()
    {
        return $this->belongsTo(CakeSize::class);
    }

    public function drinkSize()
    {
        return $this->belongsTo(DrinkSize::class, 'drink_sizes_id');
    }

    public function cakeFlavor()
    {
        return $this->belongsTo(CakeFlavor::class);
    }

    public function customDesign()
    {
        return $this->belongsTo(CustomDesign::class);
    }
}
