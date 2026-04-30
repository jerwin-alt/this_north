<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Discount extends Model
{
    use HasFactory;

    protected $table = 'discounts';

    protected $fillable = [
        'parent_id',
        'version',
        'discount_name',
        'discount_type',
        'discount_value',
        'description',
        'is_active',
        'requires_verification'
    ];

    protected $casts = [
        'discount_value' => 'decimal:2',
        'is_active' => 'boolean',
        'requires_verification' => 'boolean',
        'version' => 'integer'
    ];

    // Optional: relationship to parent version
    public function parent()
    {
        return $this->belongsTo(Discount::class, 'parent_id');
    }

    public function children()
    {
        return $this->hasMany(Discount::class, 'parent_id');
    }
}