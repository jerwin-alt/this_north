<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Ingredient extends Model
{
    use HasFactory;

    protected $table = 'ingredients';
    public $timestamps = false; // we only have updated_at, not created_at

    protected $fillable = [
        'name',
        'unit',
        'scale_per_uni',
        'current_stock',
        'is_active',
        'updated_at',
    ];

    protected $casts = [
        'current_stock' => 'decimal:2',
        'is_active' => 'boolean',
        'updated_at' => 'datetime',
    ];

    // Automatically update updated_at when saving
    public static function boot()
    {
        parent::boot();
        static::updating(function ($model) {
            $model->updated_at = now();
        });
        static::creating(function ($model) {
            $model->updated_at = now();
        });
    }

    public function billOfMaterials()
    {
        return $this->hasMany(BillOfMaterials::class);
    }

    public function inventoryTransactions()
    {
        return $this->hasMany(InventoryTransaction::class);
    }
}