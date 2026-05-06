<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('design_mapping', function (Blueprint $table) {
            $table->id();
            $table->foreignId('design_id')->constrained('custom_designs');
            $table->foreignId('element_id')->constrained('design_elements');
            $table->integer('position_x')->nullable();
            $table->integer('position_y')->nullable();
            $table->string('custom_text', 255)->nullable();
        });
    }

    public function down()
    {
        Schema::dropIfExists('design_mapping');
    }
};