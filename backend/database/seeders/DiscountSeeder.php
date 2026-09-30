<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Discount;

class DiscountSeeder extends Seeder
{
    public function run(): void
    {
        // Static PWD / Senior Citizen discount — 30% off, requires ID verification.
        // Matches what the mobile app and staff menu look for:
        //   requires_verification = true, discount_type = 'percentage',
        //   discount_value = 30, is_active = true
        Discount::firstOrCreate(
            ['discount_name' => 'PWD/Senior Citizen'],
            [
                'parent_id'             => null,
                'version'               => 1,
                'discount_type'         => 'percentage',
                'discount_value'        => 30,
                'description'           => '30% discount for verified PWD and Senior Citizens. Requires valid ID.',
                'is_active'             => true,
                'requires_verification' => true,
            ]
        );

        $this->command->info('✓ PWD/Senior Citizen discount is ready.');
    }
}