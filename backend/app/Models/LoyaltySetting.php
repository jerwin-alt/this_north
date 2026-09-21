<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LoyaltySetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'is_30_percent_active',
        'is_10_star_active',
    ];

    protected $casts = [
        'is_30_percent_active' => 'boolean',
        'is_10_star_active' => 'boolean',
    ];

    /**
     * Get the current settings (singleton pattern)
     */
    public static function getSettings()
    {
        return self::first() ?? self::create([
            'is_30_percent_active' => true,
            'is_10_star_active' => true,
        ]);
    }
}