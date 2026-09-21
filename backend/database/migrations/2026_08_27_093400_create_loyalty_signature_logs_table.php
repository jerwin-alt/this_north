<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('loyalty_signature_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('order_id')->constrained('orders')->onDelete('cascade');
            $table->date('signature_date');
            $table->integer('signature_number'); // the sequential stamp number (1,2,3,…)
            $table->timestamps(); // adds created_at & updated_at

            // ---- Database-level enforcement of 1‑star‑per‑day ----
            $table->unique(['user_id', 'signature_date']);

            // Indexes for performance
            $table->index('user_id');
            $table->index('order_id');
            $table->index('signature_date');
        });
    }

    public function down()
    {
        Schema::dropIfExists('loyalty_signature_logs');
    }
};