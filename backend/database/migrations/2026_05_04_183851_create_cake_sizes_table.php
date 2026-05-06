<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('cake_sizes', function (Blueprint $table) {
            $table->id();
            $table->string('size_name', 50);
            $table->integer('size_inches');
            $table->integer('servings')->nullable();
            $table->decimal('price_modifier', 10, 2)->default(0);
            $table->boolean('is_active')->default(true);
        });
    }

    public function down()
    {
        Schema::dropIfExists('cake_sizes');
    }
};