<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('user_activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->enum('activity_type', [
                'registration', 'order_placed', 'order_cancelled',
                'signature_earned', 'reward_claimed', 'discount_applied',
                'design_saved', 'order_status_updated', 'inventory_updated',
                'damage_reported'
            ]);
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->text('details')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index('user_id');
            $table->index('activity_type');
        });
    }

    public function down()
    {
        Schema::dropIfExists('user_activity_logs');
    }
};