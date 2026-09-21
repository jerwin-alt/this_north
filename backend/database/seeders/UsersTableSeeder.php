<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class UsersTableSeeder extends Seeder
{


        public function run(): void
    {
        DB::table('users')->insert([
            'role'                   => 'admin',
            'first_name'             => 'Juan',
            'last_name'              => 'Dela Cruz',
            'email'                  => 'admin@gmail.com',
            'password'               => Hash::make('northcakeyesss'), 
            'id_number'              => 'SC-123456789',
            'is_active'              => 1,
        ]);
    }

}
