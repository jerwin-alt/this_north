<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('design_elements', function (Blueprint $table) {
            if (!Schema::hasColumn('design_elements', 'svg_url')) {
                $table->string('svg_url')->nullable();
            }
            if (!Schema::hasColumn('design_elements', 'svg_code')) {
                $table->longText('svg_code')->nullable();
            }
            if (!Schema::hasColumn('design_elements', 'supports_color')) {
                $table->boolean('supports_color')->default(false);
            }
            if (!Schema::hasColumn('design_elements', 'color_parts')) {
                $table->json('color_parts')->nullable();
            }
        });
    }

    public function down(): void {
        Schema::table('design_elements', function (Blueprint $table) {
            $cols = [];
            foreach (['svg_url','svg_code','supports_color','color_parts'] as $c) {
                if (Schema::hasColumn('design_elements', $c)) $cols[] = $c;
            }
            if (!empty($cols)) $table->dropColumn($cols);
        });
    }
};