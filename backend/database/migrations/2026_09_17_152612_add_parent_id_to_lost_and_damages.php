<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lost_and_damages', function (Blueprint $table) {
            $table->foreignId('parent_id')
                  ->nullable()
                  ->after('id')
                  ->constrained('lost_and_damages')
                  ->nullOnDelete();

            $table->boolean('is_auto_generated')
                  ->default(false)
                  ->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('lost_and_damages', function (Blueprint $table) {
            $table->dropForeign(['parent_id']);
            $table->dropColumn(['parent_id', 'is_auto_generated']);
        });
    }
};