<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    use HasFactory;

    public $timestamps = false; // only updated_at exists, no created_at

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
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
        'pickup_method',
        'rider_name',
        'rider_phone',
        'progress_images',          // JSON column for cake progress images
        'pickup_proof_images',      // NEW: JSON column for pickup proof images
        'rider_photo',
        'discount_id',
        'discount_total',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'is_senior_pwd'               => 'boolean',
        'order_date'                  => 'datetime',
        'pickup_date'                 => 'date:Y-m-d',
        'subtotal'                    => 'decimal:2',
        'total_amount'                => 'decimal:2',
        'loyalty_signatures_earned'   => 'integer',
        'progress_images'             => 'array',          // cast to array
        'pickup_proof_images'         => 'array',          // NEW: cast to array
        'discount_total' => 'decimal:2',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var array<int, string>
     */
    protected $appends = [
        'progress_images_with_urls',
        'pickup_proof_images_with_urls',   // NEW: appended attribute
        'rider_photo_url'

    ];

    // ─── Relationships ──────────────────────────────────────────────

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

    public function feedback()
    {
        return $this->hasOne(Feedback::class);
    }

    public function discount()
    {
        return $this->belongsTo(\App\Models\Discount::class, 'discount_id');
    }

    // ─── Accessors ──────────────────────────────────────────────────

    /**
     * Get progress images with full URLs appended.
     */
    public function getProgressImagesWithUrlsAttribute(): array
    {
        $images = $this->progress_images ?? [];
        return collect($images)->map(function ($img) {
            $img['image_url'] = $img['path'] ? asset('storage/' . $img['path']) : null;
            return $img;
        })->toArray();
    }

    /**
     * Get pickup proof images with full URLs appended.
     * NEW: accessor for pickup_proof_images_with_urls
     */
    public function getPickupProofImagesWithUrlsAttribute(): array
    {
        $images = $this->pickup_proof_images ?? [];
        return collect($images)->map(function ($img) {
            $img['image_url'] = $img['path'] ? asset('storage/' . $img['path']) : null;
            return $img;
        })->toArray();
    }

    public function getRiderPhotoUrlAttribute(): ?string
    {
        if (!$this->rider_photo) {
            return null;
        }
        // If already full URL, return as is
        if (filter_var($this->rider_photo, FILTER_VALIDATE_URL)) {
            return $this->rider_photo;
        }
        return asset('storage/' . $this->rider_photo);
    }
}