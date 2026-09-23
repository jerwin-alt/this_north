<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\CakeSize;

class CakeSizesSeeder extends Seeder
{
    public function run(): void
    {
        // ── STEP 1: Normalize existing rows ──
        // Old rows have shape='round' and base_size_inches=6 (migration default).
        // The authoritative source is `size_inches`. Fix any mismatch.
        $normalized = 0;
        foreach (CakeSize::all() as $row) {
            $updates = [];
            if (!$row->shape) {
                $updates['shape'] = 'round';
            }
            if (!$row->tiers) {
                $updates['tiers'] = 1;
            }
            if ((int) $row->base_size_inches !== (int) $row->size_inches) {
                $updates['base_size_inches'] = (int) $row->size_inches;
            }
            if (!empty($updates)) {
                $row->update($updates);
                $this->command->info("Normalized id={$row->id} '{$row->size_name}' → " . json_encode($updates));
                $normalized++;
            }
        }

        // ── STEP 2: Create missing shape+size combinations ──
        $matrix = [
            // shape, inches, price_modifier
            ['round',  6,    900],
            ['round',  8,    1800],
            ['round',  10,   2600],
            ['round',  12,   3400],
            ['square', 6,    1200],
            ['square', 8,    2200],
            ['square', 10,   3200],
            ['square', 12,   4200],
        ];

        $created = 0;
        $skipped = 0;

        foreach ($matrix as [$shape, $inches, $price]) {
            $exists = CakeSize::where('size_inches', $inches)
                ->where('shape', $shape)
                ->exists();

            if ($exists) {
                $this->command->info("Skipped: {$shape} {$inches}\" already exists.");
                $skipped++;
                continue;
            }

            CakeSize::create([
                'size_name'        => "{$inches}\" " . ucfirst($shape),
                'shape'            => $shape,
                'tiers'            => 1,
                'base_size_inches' => $inches,
                'size_inches'      => $inches,
                'servings'         => $shape === 'square'
                                        ? (int) (($inches * $inches) / 4)
                                        : (int) (pi() * pow($inches / 2, 2) / 4),
                'price_modifier'   => $price,
                'is_active'        => true,
            ]);

            $this->command->info("Created: {$shape} {$inches}\" (₱{$price})");
            $created++;
        }

        $this->command->info("Done. Normalized: {$normalized}, Created: {$created}, Skipped: {$skipped}");
    }
}