<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OtpCode extends Model
{
    protected $table = 'otp_codes';

    protected $fillable = [
        'user_id',
        'otp_code',
        'expires_at',
        'is_used',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'is_used'    => 'boolean',
        'created_at' => 'datetime',
    ];

    // The table has only created_at, no updated_at
    public $timestamps = false;

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}