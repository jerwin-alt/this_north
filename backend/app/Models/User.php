<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\SoftDeletes;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'role',
        'first_name',
        'last_name',
        'email',
        'email_verified_at',
        'password',
        'phone',
        'birth_date',
        'address',
        'verification_type',
        'verification_status',
        'id_number',
        'image',
        'expires_at',
        'is_active',
        'is_walk_in_customer',
        'signature_stamps',
        'loyalty_completed',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        
        'password',
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
    ];


    // In App\Models\User

    public function loyaltySignatureLogs()
    {
        return $this->hasMany(LoyaltySignatureLog::class);
    }

    public function loyaltyRewards()
    {
        return $this->hasMany(LoyaltyReward::class);
    }

    public function getTotalStampsAttribute()
    {
        return $this->loyaltySignatureLogs()->count();
    }



    // Add inside App\Models\User, right below loyaltyRewards()

    /**
     * Orders placed by this customer through the mobile app.
     *
     * IMPORTANT: This is the ONLY correct relationship for customer order
     * history. Walk-in orders have customer_id = NULL and are therefore
     * naturally excluded by this relationship.
     */
    public function orders()
    {
        return $this->hasMany(\App\Models\Order::class, 'customer_id');
    }
}
