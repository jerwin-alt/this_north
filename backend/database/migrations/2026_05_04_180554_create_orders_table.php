<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_number', 50)->unique();
            $table->foreignId('customer_id')->nullable()->constrained('users');
            $table->string('customer_name', 150)->nullable();
            $table->string('customer_phone', 20)->nullable();
            $table->foreignId('cashier_id')->nullable()->constrained('users');
            $table->boolean('is_senior_pwd')->default(false);
            $table->dateTime('order_date')->useCurrent();
            $table->date('pickup_date')->nullable();
            $table->time('pickup_time')->nullable();
            $table->decimal('subtotal', 10, 2);
            $table->decimal('total_amount', 10, 2);
            $table->integer('loyalty_signatures_earned')->default(0);
            $table->enum('status', ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'])
                  ->default('pending');
            $table->enum('payment_status', ['unpaid', 'partially_paid', 'paid', 'refunded'])
                  ->default('unpaid');
            $table->text('notes')->nullable();
            $table->enum('event_type', ['birthday', 'wedding', 'anniversary', 'corporate', 'other'])
                  ->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();
        });
    }

    public function down()
    {
        Schema::dropIfExists('orders');
    }
};