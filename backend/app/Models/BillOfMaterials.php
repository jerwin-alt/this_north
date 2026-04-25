<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BillOfMaterials extends Model
{
    use HasFactory;

    protected $table = 'bill_of_materials';

    protected $fillable = [
        'menu_id',
        'ingredient_id',
        'quantity_needed',
        'unit',
        'wastage_percentage'
    ];

    protected $casts = [
        'quantity_needed'    => 'decimal:2',
        'wastage_percentage' => 'decimal:2',
    ];

    public function menu()
    {
        return $this->belongsTo(Menu::class);
    }

    public function ingredient()
    {
        return $this->belongsTo(Ingredient::class);
    }
}