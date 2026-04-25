<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('bill_of_materials', function (Blueprint $table) {
            $table->id();
            $table->foreignId('menu_id')->constrained('menu')->onDelete('cascade');
            $table->foreignId('ingredient_id')->constrained('ingredients')->onDelete('restrict');
            $table->decimal('quantity_needed', 10, 2);
            $table->string('unit', 20);
            $table->decimal('wastage_percentage', 5, 2)->default(0);
            $table->timestamps();

            $table->unique(['menu_id', 'ingredient_id']);
            $table->index('ingredient_id');
        });
    }

    public function down()
    {
        Schema::dropIfExists('bill_of_materials');
    }
};