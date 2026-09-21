<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LoyaltySignatureLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'order_id', 'signature_date', 'signature_number',
    ];

    protected $casts = [
        'signature_date' => 'date',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function order()
    {
        return $this->belongsTo(Order::class);
    }
}