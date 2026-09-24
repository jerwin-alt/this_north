<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;

class SchemaRepairSeeder extends Seeder
{
    public function run(): void
    {
        // ─── design_elements repairs ─────────────────────────────
        if (Schema::hasTable('design_elements')) {
            $cols = Schema::getColumnListing('design_elements');
            Schema::table('design_elements', function (Blueprint $table) use ($cols) {
                if (!in_array('image_url',      $cols, true)) $table->string('image_url')->nullable()->after('default_price');
                if (!in_array('svg_url',        $cols, true)) $table->string('svg_url')->nullable();
                if (!in_array('svg_code',       $cols, true)) $table->longText('svg_code')->nullable();
                if (!in_array('supports_color', $cols, true)) $table->boolean('supports_color')->default(false);
                if (!in_array('color_parts',    $cols, true)) $table->json('color_parts')->nullable();
            });
            $this->command->info('✓ design_elements schema checked.');
        }

        // ─── custom_designs repairs ──────────────────────────────
        if (Schema::hasTable('custom_designs')) {
            $cols = Schema::getColumnListing('custom_designs');
            Schema::table('custom_designs', function (Blueprint $table) use ($cols) {
                if (!in_array('cake_flavor_id',  $cols, true)) $table->foreignId('cake_flavor_id')->nullable()->constrained('cake_flavors')->nullOnDelete();
                if (!in_array('frosting_flavor', $cols, true)) $table->string('frosting_flavor')->nullable();
                if (!in_array('tiers',           $cols, true)) $table->unsignedInteger('tiers')->default(1);
            });
            $this->command->info('✓ custom_designs schema checked.');
        }
    }
}