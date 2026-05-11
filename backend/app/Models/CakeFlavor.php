<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CakeFlavor extends Model
{
    use HasFactory;


    public $timestamps = false;  
    
    protected $table = 'cake_flavors';

    protected $fillable = [
        'flavor_name',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];
}