<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->onDelete('cascade');
            $table->enum('payment_type', ['downpayment', 'full', 'other'])->default('full');
            $table->enum('payment_method', ['cash', 'gcash']);
            $table->decimal('amount_paid', 10, 2);
            $table->decimal('discount_amount', 10, 2)->default(0);
            $table->foreignId('discount_id')->nullable()->constrained('discounts')->nullOnDelete();
            $table->decimal('final_amount', 10, 2);
            $table->decimal('change_amount', 10, 2)->default(0);
            $table->timestamp('payment_date')->useCurrent();
            $table->string('reference_number', 100)->nullable();
            $table->enum('payment_status', ['completed', 'failed'])->default('completed');
            $table->foreignId('processed_by')->constrained('users');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
