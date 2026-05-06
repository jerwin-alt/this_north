<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('custom_designs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users');
            $table->string('design_name', 100)->nullable();
            $table->string('custom_flavor', 255);
            $table->text('flavor_description')->nullable();
            $table->foreignId('cake_size_id')->constrained('cake_sizes');
            $table->json('design_data')->nullable();
            $table->text('dedication_message')->nullable();
            $table->text('special_instructions')->nullable();
            $table->decimal('total_price', 10, 2)->nullable();
            $table->boolean('is_saved')->default(true);
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down()
    {
        Schema::dropIfExists('custom_designs');
    }
};