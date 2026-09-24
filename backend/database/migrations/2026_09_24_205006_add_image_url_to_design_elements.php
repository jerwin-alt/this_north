<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('design_elements', function (Blueprint $table) {
            $table->string('image_url')->nullable()->after('default_price');
        });
    }

    public function down(): void
    {
        Schema::table('design_elements', function (Blueprint $table) {
            $table->dropColumn('image_url');
        });
    }
};