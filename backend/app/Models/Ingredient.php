<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Ingredient extends Model
{
    use HasFactory;

    protected $table = 'ingredients';

    protected $fillable = [
        'name',
        'unit',
        'scale_per_uni',
        'current_stock',
        'is_active',
    ];

    protected $casts = [
        'current_stock' => 'decimal:2',
        'is_active'     => 'boolean',
    ];

    public function billOfMaterials()
    {
        return $this->hasMany(BillOfMaterials::class);
    }

    public function inventoryTransactions()
    {
        return $this->hasMany(InventoryTransaction::class);
    }
}