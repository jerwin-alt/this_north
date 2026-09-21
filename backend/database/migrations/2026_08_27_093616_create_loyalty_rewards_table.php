<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('loyalty_rewards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->enum('reward_type', ['30_percent', 'free_slice', 'free_coffee', 'free_non_coffee']);
            $table->foreignId('order_id')->nullable()->constrained('orders')->onDelete('set null');
            $table->timestamp('claimed_at')->nullable();
            $table->date('expires_at')->nullable(); // optional expiry
            $table->boolean('is_used')->default(false);
            $table->timestamp('used_at')->nullable();
            $table->foreignId('used_order_id')->nullable()->constrained('orders')->onDelete('set null');
            $table->timestamps();

            // ---- One reward of each type per user ----
            $table->unique(['user_id', 'reward_type']);

            $table->index('user_id');
            $table->index('reward_type');
            $table->index('is_used');
            $table->index('used_order_id');
        });
    }

    public function down()
    {
        Schema::dropIfExists('loyalty_rewards');
    }
};