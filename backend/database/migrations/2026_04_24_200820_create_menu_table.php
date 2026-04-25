<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('menu', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained('categories')->onDelete('restrict');
            $table->string('sku', 50)->unique();
            $table->string('name', 150);
            $table->text('description')->nullable();
            $table->decimal('base_price', 10, 2);
            $table->enum('menu_type', ['standard', 'customizable'])->default('standard');
            $table->boolean('has_size_options')->default(false);
            $table->boolean('is_active')->default(true);
            $table->integer('stock_quantity')->default(0);
            $table->boolean('is_ready_made')->default(true);
            $table->boolean('track_stock')->default(true);
            $table->date('expiration_date')->nullable();
            $table->integer('min_stock_level')->default(0);
            $table->string('image_url', 255)->nullable();
            $table->timestamp('stocked_at')->nullable();
            $table->timestamps();

            $table->index('category_id');
            $table->index('sku');
            $table->index('is_active');
        });
    }

    public function down()
    {
        Schema::dropIfExists('menu');
    }
};