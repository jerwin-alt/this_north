<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LoyaltyReward extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'reward_type', 'order_id', 'claimed_at',
        'expires_at', 'is_used','is_active', 'used_at', 'used_order_id',
    ];

    protected $casts = [
        'claimed_at' => 'datetime',
        'expires_at' => 'date',
        'used_at' => 'datetime',
        'is_used' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function usedOrder()
    {
        return $this->belongsTo(Order::class, 'used_order_id');
    }
}