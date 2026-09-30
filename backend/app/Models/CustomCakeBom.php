<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CustomCakeBom extends Model
{
    use HasFactory;

    protected $table = 'custom_cake_bom';

    protected $fillable = [
        'order_id',
        'ingredient_id',
        'quantity_needed',
        'unit',
    ];

    protected $casts = [
        'quantity_needed' => 'decimal:2',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function ingredient()
    {
        return $this->belongsTo(Ingredient::class);
    }
}