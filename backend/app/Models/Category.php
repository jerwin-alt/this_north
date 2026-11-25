<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Category extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'description',
        'is_active'
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function menuItems()
    {
        return $this->hasMany(Menu::class);
    }

    // In App\Models\Category
    protected static function booted()
    {
        static::deleting(function ($category) {
            // Soft-delete all associated menu items
            $category->menuItems()->delete();
        });

        static::restoring(function ($category) {
            // Restore menu items that were soft-deleted at the same time or after the category
            $category->menuItems()->onlyTrashed()
                    ->where('deleted_at', '>=', $category->deleted_at)
                    ->restore();
        });
    }
}
