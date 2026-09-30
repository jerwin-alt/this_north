<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('custom_cake_bom', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->onDelete('cascade');
            $table->foreignId('ingredient_id')->constrained('ingredients')->onDelete('restrict');
            $table->decimal('quantity_needed', 10, 2);
            $table->string('unit', 20);
            $table->timestamps();

            $table->unique(['order_id', 'ingredient_id']);
            $table->index('order_id');
        });

        // Idempotency flag: prevents double-deduction on repeated completion
        Schema::table('orders', function (Blueprint $table) {
            $table->boolean('custom_cake_bom_deducted')
                  ->default(false)
                  ->after('discount_total');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('custom_cake_bom_deducted');
        });
        Schema::dropIfExists('custom_cake_bom');
    }
};