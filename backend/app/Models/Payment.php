<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'payment_type',
        'payment_method',
        'amount_paid',
        'discount_amount',
        'discount_id',
        'final_amount',
        'change_amount',
        'payment_date',
        'reference_number',
        'payment_status',
        'processed_by',
    ];

    protected $casts = [
        'amount_paid' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'final_amount' => 'decimal:2',
        'change_amount' => 'decimal:2',
        'payment_date' => 'datetime',
    ];

    // Relationships
    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function processedBy()
    {
        return $this->belongsTo(User::class, 'processed_by');
    }

    public function discount()
    {
        return $this->belongsTo(Discount::class);
    }
}
