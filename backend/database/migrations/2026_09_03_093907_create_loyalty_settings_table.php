<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('loyalty_settings', function (Blueprint $table) {
            $table->id();
            $table->boolean('is_30_percent_active')->default(true);
            $table->boolean('is_10_star_active')->default(true);
            $table->timestamps();
        });

        // Insert default settings
        DB::table('loyalty_settings')->insert([
            'is_30_percent_active' => true,
            'is_10_star_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down()
    {
        Schema::dropIfExists('loyalty_settings');
    }
};