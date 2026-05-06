<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    public $timestamps = false; // only updated_at exists, no created_at

    protected $fillable = [
        'order_number',
        'customer_id',
        'customer_name',
        'customer_phone',
        'cashier_id',
        'is_senior_pwd',
        'order_date',
        'pickup_date',
        'pickup_time',
        'subtotal',
        'total_amount',
        'loyalty_signatures_earned',
        'status',
        'payment_status',
        'notes',
        'event_type',
        'created_by',
        'updated_at',
    ];

    protected $casts = [
        'is_senior_pwd'               => 'boolean',
        'order_date'                  => 'datetime',
        'pickup_date'                 => 'date',
        'subtotal'                    => 'decimal:2',
        'total_amount'                => 'decimal:2',
        'loyalty_signatures_earned'   => 'integer',
    ];

    // Relationships
    public function customer()
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function cashier()
    {
        return $this->belongsTo(User::class, 'cashier_id');
    }

    public function items()
    {
        return $this->hasMany(OrderItem::class, 'order_id');
    }

    public function payments()
    {
        return $this->hasMany(Payment::class, 'order_id');
    }
}
