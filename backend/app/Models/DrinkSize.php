<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DrinkSize extends Model
{
    use HasFactory;

    protected $table = 'drink_sizes';

    protected $fillable = [
        'menu_id',
        'size_name',
        'price_modifier',
        'is_active'
    ];

    protected $casts = [
        'price_modifier' => 'decimal:2',
        'is_active'      => 'boolean',
    ];

    public function menu()
    {
        return $this->belongsTo(Menu::class);
    }
}