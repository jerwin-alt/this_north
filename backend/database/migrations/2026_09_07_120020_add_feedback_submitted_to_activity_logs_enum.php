<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE user_activity_logs 
            MODIFY activity_type ENUM(
                'registration', 
                'order_placed', 
                'order_cancelled',
                'signature_earned', 
                'reward_claimed', 
                'discount_applied',
                'design_saved', 
                'order_status_updated', 
                'inventory_updated',
                'damage_reported',
                'feedback_submitted'   
            ) NOT NULL");
    }

    public function down(): void
    {
        // Revert to the old list (without feedback_submitted)
        DB::statement("ALTER TABLE user_activity_logs 
            MODIFY activity_type ENUM(
                'registration', 
                'order_placed', 
                'order_cancelled',
                'signature_earned', 
                'reward_claimed', 
                'discount_applied',
                'design_saved', 
                'order_status_updated', 
                'inventory_updated',
                'damage_reported'
            ) NOT NULL");
    }
};