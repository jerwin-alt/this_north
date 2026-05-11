<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CakeSize extends Model
{
    use HasFactory;

    public $timestamps = false;  
    
    protected $table = 'cake_sizes';

    protected $fillable = [
        'size_name',
        'size_inches',
        'price_modifier',
        'is_active',
    ];

    protected $casts = [
        'price_modifier' => 'decimal:2',
        'is_active' => 'boolean',
    ];
}