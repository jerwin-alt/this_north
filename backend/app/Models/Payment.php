<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
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
        'proof_image',          // <-- added for payment proof
        'payment_status',
        'processed_by',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'amount_paid'    => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'final_amount'   => 'decimal:2',
        'change_amount'  => 'decimal:2',
        'payment_date'   => 'datetime',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var array<int, string>
     */
    protected $appends = ['proof_image_url'];

    // ─── Relationships ──────────────────────────────────────────────

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

    // ─── Accessors ──────────────────────────────────────────────────

    /**
     * Get the full URL for the proof image.
     */
    public function getProofImageUrlAttribute(): ?string
    {
        if (!$this->proof_image) {
            return null;
        }

        // If the path already starts with 'http', return as is
        if (filter_var($this->proof_image, FILTER_VALIDATE_URL)) {
            return $this->proof_image;  
        }

        // Otherwise, build the URL using the storage disk
        return asset('storage/' . $this->proof_image);
    }
}