<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lost_and_damages', function (Blueprint $table) {
            $table->foreignId('order_id')
                  ->nullable()
                  ->after('id')
                  ->constrained('orders')
                  ->nullOnDelete();

            $table->foreignId('order_item_id')
                  ->nullable()
                  ->after('order_id')
                  ->constrained('order_items')
                  ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('lost_and_damages', function (Blueprint $table) {
            $table->dropForeign(['order_id']);
            $table->dropForeign(['order_item_id']);
            $table->dropColumn(['order_id', 'order_item_id']);
        });
    }
};