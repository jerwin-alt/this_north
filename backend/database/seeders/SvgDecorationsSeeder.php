<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\DesignElement;

class SvgDecorationsSeeder extends Seeder
{
    public function run(): void
    {
        // element_type must be one of: shape, icing, topping, decoration, color, border
        $decorations = [
            // ── Existing 8 ──
            'Strawberry'      => ['strawberry.svg',            'Fruit',           'topping',    10, ['body']],
            'Cherry'          => ['cherry.svg',                'Fruit',           'topping',    10, ['body']],
            'Blueberry'       => ['blueberry.svg',             'Fruit',           'topping',    10, ['body']],
            'Flower'          => ['flower.svg',                'Flowers',         'decoration', 12, ['petals', 'center']],
            'Sprinkles'       => ['sprinkles.svg',             'Sprinkles',       'decoration',  5, ['body']],
            'Candle'          => ['candle.svg',                'Candles',         'decoration',  8, ['body']],
            'Chocolate Piece' => ['chocolate-piece.svg',       'Chocolate',       'topping',    15, ['body']],
            'Macaron'         => ['macaron.svg',               'Macarons',        'topping',    12, ['shell']],

            // ── NEW: Top Frostings (fill the top ellipse of the base cake) ──
            'Chocolate Top Frosting'  => ['frosting-top-chocolate.svg',  'Frostings - Top', 'icing', 45, ['top']],
            'Vanilla Top Frosting'    => ['frosting-top-vanilla.svg',    'Frostings - Top', 'icing', 40, ['top']],
            'Strawberry Top Frosting' => ['frosting-top-strawberry.svg', 'Frostings - Top', 'icing', 50, ['top']],

            // ── NEW: Side Frostings (fill the side ellipse of the base cake) ──
            'Chocolate Side Frosting'  => ['frosting-side-chocolate.svg',  'Frostings - Side', 'icing', 45, ['side']],
            'Vanilla Side Frosting'    => ['frosting-side-vanilla.svg',    'Frostings - Side', 'icing', 40, ['side']],
            'Strawberry Side Frosting' => ['frosting-side-strawberry.svg', 'Frostings - Side', 'icing', 50, ['side']],

            // ── NEW: Modeling Materials ──
            'Fondant Flower' => ['modeling-fondant-flower.svg', 'Modeling', 'decoration', 25, ['petals', 'center']],
            'Fondant Leaf'   => ['modeling-fondant-leaf.svg',   'Modeling', 'decoration', 15, ['body']],
            'Sugar Pearls'   => ['modeling-sugar-pearls.svg',   'Modeling', 'decoration', 10, ['body']],
        ];

        foreach ($decorations as $name => [$file, $category, $type, $price, $colorParts]) {
            $el = DesignElement::where('element_name', $name)->first();

            if (!$el) {
                DesignElement::create([
                    'element_name'   => $name,
                    'element_type'   => $type,
                    'category'       => $category,
                    'default_price'  => $price,
                    'image_url'      => null,
                    'svg_url'        => '/storage/decorations/' . $file,
                    'svg_code'       => null,
                    'supports_color' => true,
                    'color_parts'    => $colorParts,
                    'is_active'      => true,
                    'display_order'  => 0,
                ]);
                $this->command->info("Created '{$name}' → {$file}");
            } else {
                $el->update([
                    'svg_url'        => '/storage/decorations/' . $file,
                    'svg_code'       => null,
                    'supports_color' => true,
                    'color_parts'    => $colorParts,
                ]);
                $this->command->info("Updated '{$name}' → {$file}");
            }
        }

        $this->command->info('SVG decoration seeding complete.');
    }
}