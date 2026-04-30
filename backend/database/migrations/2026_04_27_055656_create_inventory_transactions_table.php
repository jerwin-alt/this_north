<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('inventory_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ingredient_id')->constrained('ingredients')->onDelete('cascade');
            $table->enum('transaction_type', ['purchase', 'usage', 'adjustment']);
            $table->decimal('quantity', 10, 2);
            $table->decimal('previous_stock', 10, 2);
            $table->decimal('new_stock', 10, 2);
            $table->enum('reference_type', ['order', 'purchase_order', 'adjustment'])->nullable();
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->timestamp('created_at')->useCurrent(); // only created_at, no updated_at
        });
    }

    public function down()
    {
        Schema::dropIfExists('inventory_transactions');
    }
};