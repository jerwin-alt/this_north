<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->onDelete('cascade');
            $table->foreignId('menu_id')->constrained('menu');
            $table->enum('cake_type', ['standard', 'custom']);
            $table->foreignId('cake_size_id')->nullable()->constrained('cake_sizes');
            $table->foreignId('drink_sizes_id')->nullable()->constrained('drink_sizes');
            $table->foreignId('cake_flavor_id')->nullable()->constrained('cake_flavors');
            $table->string('custom_flavor', 255)->nullable();
            $table->foreignId('custom_design_id')->nullable()->constrained('custom_designs');
            $table->integer('quantity');
            $table->decimal('unit_price', 10, 2);
            $table->decimal('subtotal', 10, 2);
            $table->decimal('total_price', 10, 2);
            $table->boolean('is_free_item')->default(false);
        });
    }

    public function down()
    {
        Schema::dropIfExists('order_items');
    }
};