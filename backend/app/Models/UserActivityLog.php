<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserActivityLog extends Model
{
    use HasFactory;

    protected $table = 'user_activity_logs';

    protected $fillable = [
        'user_id',
        'activity_type',
        'reference_id',
        'details',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    // Disable Laravel's default timestamps if your table doesn't have `updated_at`
    public $timestamps = false;

    public function user()
    {
        return $this->belongsTo(User::class);
    }

        // ✅ Force UTC ISO-8601 with 'Z' for all date attributes
    protected function serializeDate(\DateTimeInterface $date)
    {
        return $date->toIso8601ZuluString();
    }
}