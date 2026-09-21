<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('feedback', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')
                  ->constrained('users')
                  ->cascadeOnDelete();

            $table->foreignId('order_id')
                  ->nullable()
                  ->constrained('orders')
                  ->nullOnDelete();

            $table->foreignId('menu_id')
                  ->nullable()
                  ->constrained('menu')
                  ->nullOnDelete();

            $table->integer('rating')->unsigned()->check('rating between 1 and 5');
            $table->text('comment')->nullable();

            // feedback_type: order, product, service
            $table->enum('feedback_type', ['order', 'product', 'service'])
                  ->default('order');

            $table->timestamp('created_at')->useCurrent();
            // No updated_at column – we'll set $timestamps = false in the model
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('feedback');
    }
};