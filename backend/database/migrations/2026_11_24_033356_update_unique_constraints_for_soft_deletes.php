<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Drop the unique rule on users.email
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['email']); 
        });

        // 2. Drop the unique rule on menu.sku
        Schema::table('menu', function (Blueprint $table) {
            $table->dropUnique(['sku']);
        });
    }

    public function down(): void
    {
        // Revert back if needed
        Schema::table('users', function (Blueprint $table) {
            $table->unique('email');
        });

        Schema::table('menu', function (Blueprint $table) {
            $table->unique('sku');
        });
    }
};