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
                if (!in_array('cake_flavor_id',  $cols, true)) {
                    $table->foreignId('cake_flavor_id')->nullable()->constrained('cake_flavors')->nullOnDelete();
                }
                if (!in_array('frosting_flavor', $cols, true)) {
                    $table->string('frosting_flavor')->nullable();
                }
                if (!in_array('tiers',           $cols, true)) {
                    $table->unsignedInteger('tiers')->default(1);
                }
            });

            // Force custom_flavor to be NULLABLE (MySQL raw — safe + idempotent)
            try {
                $colInfo = \DB::select("SHOW COLUMNS FROM custom_designs LIKE 'custom_flavor'");
                if (!empty($colInfo) && strtoupper($colInfo[0]->Null) !== 'YES') {
                    \DB::statement("ALTER TABLE custom_designs MODIFY custom_flavor VARCHAR(255) NULL");
                    $this->command->info('✓ custom_flavor made nullable.');
                }
            } catch (\Exception $e) {
                $this->command->warn('Could not alter custom_flavor: ' . $e->getMessage());
            }

            $this->command->info('✓ custom_designs schema checked.');
        }




                // ─── order_items repairs ──────────────────────────────
        if (Schema::hasTable('order_items')) {
            try {
                // 1. Check if menu_id is currently NOT NULL
                $colInfo = \DB::select("SHOW COLUMNS FROM order_items WHERE Field = 'menu_id'");

                if (!empty($colInfo) && strtoupper($colInfo[0]->Null) !== 'YES') {
                    // 2. Drop any existing FK constraint on menu_id
                    $fkList = \DB::select("
                        SELECT CONSTRAINT_NAME
                        FROM information_schema.KEY_COLUMN_USAGE
                        WHERE TABLE_SCHEMA = DATABASE()
                        AND TABLE_NAME = 'order_items'
                        AND COLUMN_NAME = 'menu_id'
                        AND REFERENCED_TABLE_NAME IS NOT NULL
                    ");

                    foreach ($fkList as $fk) {
                        \DB::statement("ALTER TABLE order_items DROP FOREIGN KEY `{$fk->CONSTRAINT_NAME}`");
                    }

                    // 3. Make the column nullable
                    \DB::statement("ALTER TABLE order_items MODIFY menu_id BIGINT UNSIGNED NULL");

                    // 4. Re-add the FK with ON DELETE SET NULL
                    \DB::statement("
                        ALTER TABLE order_items
                        ADD CONSTRAINT order_items_menu_id_foreign
                        FOREIGN KEY (menu_id) REFERENCES menu(id) ON DELETE SET NULL
                    ");

                    $this->command->info('✓ order_items.menu_id made nullable with SET NULL FK.');
                } else {
                    $this->command->info('✓ order_items.menu_id is already nullable.');
                }
            } catch (\Exception $e) {
                $this->command->warn('Could not alter order_items.menu_id: ' . $e->getMessage());
            }
        }
    }
}