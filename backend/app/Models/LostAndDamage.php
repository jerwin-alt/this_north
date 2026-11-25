<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class LostAndDamage extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'lost_and_damages';

    /**
     * The table uses `reported_at` and `approved_at` instead of the
     * default `created_at` / `updated_at` pair, so we disable Eloquent's
     * automatic timestamp management.
     */
    public $timestamps = false;

    protected $fillable = [
        'parent_id',
        'order_id',          
        'order_item_id',      
        'item_id',
        'item_type',
        'quantity',
        'unit',
        'estimated_cost',
        'damage_type',
        'description',
        'reported_by',
        'reported_at',
        'approved_by',
        'approved_at',
        'status',
        'is_auto_generated', 
    ];

    protected $casts = [
        'quantity'       => 'decimal:2',
        'estimated_cost' => 'decimal:2',
        'reported_at'    => 'datetime',
        'approved_at'    => 'datetime',
        'is_auto_generated' => 'boolean', 
    ];

    /**
     * Attributes automatically appended to JSON output so the frontend
     * can render a table without extra requests.
     */
    protected $appends = ['item_name', 'item_sku', 'item_type_label', 'order_number', 'parent_item_name'];


    // Inside app/Models/LostAndDamage.php

    protected static function booted()
    {
        static::deleting(function ($record) {
            // If this is a parent record, soft-delete all its children too
            // (Assuming you want them to be deleted together)
            $record->children()->delete(); 
        });

        static::restoring(function ($record) {
            // Restore children that were deleted at the same time
            $record->children()->onlyTrashed()
                ->where('deleted_at', '>=', $record->deleted_at)
                ->restore();
        });
    }

    // ─── Relationships ──────────────────────────────────────────────

    public function reportedBy()
    {
        return $this->belongsTo(User::class, 'reported_by');
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function orderItem()
    {
        return $this->belongsTo(OrderItem::class);
    }

    public function getOrderNumberAttribute(): ?string
    {
        return $this->order?->order_number;
    }

    public function parent()
    {
        return $this->belongsTo(LostAndDamage::class, 'parent_id');
    }

    public function children()
    {
        return $this->hasMany(LostAndDamage::class, 'parent_id')->orderBy('id');
    }




    // ─── Polymorphic item resolver ──────────────────────────────────

    /**
     * Resolve the actual item this record refers to.
     *
     * `item_type` is either 'product' (points to menu.id) or
     * 'ingredient' (points to ingredients.id). MySQL does not support
     * conditional foreign keys, so we resolve on the fly.
     *
     * Exposed both as a model method AND as an attribute accessor.
     */
    public function resolveItem()
    {
        if ($this->item_type === 'product') {
            return Menu::find($this->item_id);
        }
        if ($this->item_type === 'ingredient') {
            return Ingredient::find($this->item_id);
        }
        return null;
    }

    public function getItemAttribute()
    {
        return $this->resolveItem();
    }

    public function getItemNameAttribute(): ?string
    {
        return $this->resolveItem()?->name;
    }

    public function getItemSkuAttribute(): ?string
    {
        if ($this->item_type !== 'product') {
            return null;
        }
        return Menu::find($this->item_id)?->sku;
    }

    public function getItemTypeLabelAttribute(): string
    {
        return $this->item_type === 'product' ? 'Product' : 'Ingredient';
    }

    // ─── Scopes ─────────────────────────────────────────────────────

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    public function scopeRejected($query)
    {
        return $query->where('status', 'rejected');
    }

    public function scopeOfType($query, string $type)
    {
        return $query->where('item_type', $type);
    }

    /**
     * Resolves the parent's item_name when this row is an auto-generated
     * BOM child. Returns null for root records.
     */
    public function getParentItemNameAttribute(): ?string
    {
        if (!$this->parent_id) {
            return null;
        }
        // Uses the eager-loaded parent when available; otherwise lazy-loads once.
        return $this->parent?->item_name;
    }
}