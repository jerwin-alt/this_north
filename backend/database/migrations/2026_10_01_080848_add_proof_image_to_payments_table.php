<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('payments')) {
            return;
        }

        if (!Schema::hasColumn('payments', 'proof_image')) {
            Schema::table('payments', function (Blueprint $table) {
                $table->string('proof_image', 255)->nullable()->after('reference_number');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('payments', 'proof_image')) {
            Schema::table('payments', function (Blueprint $table) {
                $table->dropColumn('proof_image');
            });
        }
    }
};