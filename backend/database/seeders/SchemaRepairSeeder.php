<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;

class SchemaRepairSeeder extends Seeder
{
    public function run(): void
    {
        if (!Schema::hasTable('design_elements')) {
            $this->command->warn('design_elements table does not exist — skipping repair.');
            return;
        }

        $existingColumns = Schema::getColumnListing('design_elements');

        $hasImageUrl      = in_array('image_url', $existingColumns, true);
        $hasSvgUrl        = in_array('svg_url', $existingColumns, true);
        $hasSvgCode       = in_array('svg_code', $existingColumns, true);
        $hasSupportsColor = in_array('supports_color', $existingColumns, true);
        $hasColorParts    = in_array('color_parts', $existingColumns, true);

        Schema::table('design_elements', function (Blueprint $table) use (
            $hasImageUrl,
            $hasSvgUrl,
            $hasSvgCode,
            $hasSupportsColor,
            $hasColorParts
        ) {
            if (!$hasImageUrl) {
                $table->string('image_url')->nullable()->after('default_price');
            }
            if (!$hasSvgUrl) {
                $table->string('svg_url')->nullable();
            }
            if (!$hasSvgCode) {
                $table->longText('svg_code')->nullable();
            }
            if (!$hasSupportsColor) {
                $table->boolean('supports_color')->default(false);
            }
            if (!$hasColorParts) {
                $table->json('color_parts')->nullable();
            }
        });

        $added = [];
        if (!$hasImageUrl)      $added[] = 'image_url';
        if (!$hasSvgUrl)        $added[] = 'svg_url';
        if (!$hasSvgCode)       $added[] = 'svg_code';
        if (!$hasSupportsColor) $added[] = 'supports_color';
        if (!$hasColorParts)    $added[] = 'color_parts';

        if (empty($added)) {
            $this->command->info('✓ design_elements schema is already correct.');
        } else {
            $this->command->info('✓ Repaired design_elements — added: ' . implode(', ', $added));
        }
    }
}