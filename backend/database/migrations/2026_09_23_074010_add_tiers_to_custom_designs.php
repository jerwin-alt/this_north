<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('custom_designs', function (Blueprint $table) {
            $table->unsignedInteger('tiers')->default(1)->after('cake_size_id');
        });
    }

    public function down(): void {
        Schema::table('custom_designs', function (Blueprint $table) {
            $table->dropColumn('tiers');
        });
    }
};