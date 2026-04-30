<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InventoryTransaction extends Model
{
    use HasFactory;

    protected $table = 'inventory_transactions';
    public $timestamps = false; // only created_at

    protected $fillable = [
        'ingredient_id',
        'transaction_type',
        'quantity',
        'previous_stock',
        'new_stock',
        'reference_type',
        'reference_id',
        'notes',
        'created_by',
        'created_at',
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
        'previous_stock' => 'decimal:2',
        'new_stock' => 'decimal:2',
    ];

    public function ingredient()
    {
        return $this->belongsTo(Ingredient::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}