<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('cake_sizes', function (Blueprint $table) {
            $table->string('shape', 20)->default('round')->after('size_name');
            $table->unsignedInteger('tiers')->default(1)->after('shape');
            $table->unsignedInteger('base_size_inches')->default(6)->after('tiers');
        });
    }

    public function down(): void {
        Schema::table('cake_sizes', function (Blueprint $table) {
            $table->dropColumn(['shape', 'tiers', 'base_size_inches']);
        });
    }
};