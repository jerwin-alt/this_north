<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('design_elements', function (Blueprint $table) {
            $table->string('svg_url')->nullable();
            $table->longText('svg_code')->nullable();
            $table->boolean('supports_color')->default(false);
            // e.g. ["body", "outline", "leaf"] – only the parts the user can tint
            $table->json('color_parts')->nullable();
        });
    }
    public function down(): void {
        Schema::table('design_elements', function (Blueprint $table) {
            $table->dropColumn(['svg_url','svg_code','supports_color','color_parts']);
        });
    }
};