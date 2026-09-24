<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class UsersTableSeeder extends Seeder
{


        public function run(): void
    {
        User::firstOrCreate(
            ['email' => 'northcakes@gmail.com'],
            [
                'first_name' => 'North Cakes',
                'last_name'  => 'Administrator',
                'password'   => Hash::make('AdminNorthCakes123!'),
                'role'       => 'admin',
                'is_active'  => true,
            ]
        );

        $this->command->info('✓ Admin user is ready.');
    }




    //     public function run(): void
    // {

    //         User::firstOrCreate(
    //         ['email' => 'northcakes@gmail.com'],
    //         [
    //             'first_name' => 'North Cakes',
    //             'last_name'  => 'Administrator',
    //             'password'   => Hash::make('AdminNorthCakes123!'),
    //             'role'       => 'admin',
    //             'is_active'  => true,
    //         ]
    //     );

    //     $this->command->info('Admin user is ready.');


    //     DB::table('users')->insert([
    //         'role'                   => 'admin',
    //         'first_name'             => 'Juan',
    //         'last_name'              => 'Dela Cruz',
    //         'email'                  => 'admin@gmail.com',
    //         'password'               => Hash::make('northcakeyesss'), 
    //         'id_number'              => 'SC-123456789',
    //         'is_active'              => 1,
    //     ]);
    //         User::create([
    //         'first_name' => 'North Cakes',
    //         'last_name' => 'Administrator',
    //         'email' => 'northcakes@gmail.com',
    //         'password' => Hash::make('AdminNorthCakes123!'),
    //         'role' => 'admin',
    //         'is_active' => true
    //     ]);




    // }

}
