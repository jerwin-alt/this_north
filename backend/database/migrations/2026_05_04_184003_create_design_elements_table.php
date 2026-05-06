<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('design_elements', function (Blueprint $table) {
            $table->id();
            $table->enum('element_type', ['shape', 'icing', 'topping', 'decoration', 'color', 'border']);
            $table->string('element_name', 100);
            $table->string('category', 50)->nullable();
            $table->decimal('default_price', 10, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->integer('display_order')->default(0);
        });
    }

    public function down()
    {
        Schema::dropIfExists('design_elements');
    }
};