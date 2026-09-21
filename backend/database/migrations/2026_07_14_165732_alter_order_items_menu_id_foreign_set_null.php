<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            // Drop the existing foreign key
            //$table->dropForeign(['menu_id']);

            // Re-add it with ON DELETE SET NULL
            $table->foreign('menu_id')
                  ->references('id')
                  ->on('menu')
                  ->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            // Drop the modified foreign key
            $table->dropForeign(['menu_id']);

            // Restore the original RESTRICT constraint
            $table->foreign('menu_id')
                  ->references('id')
                  ->on('menu');
        });
    }
};