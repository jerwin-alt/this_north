<?php
namespace Database\Seeders;
use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Category;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder {
    public function run() {
        // Default admin
        User::create([
            'first_name' => 'System',
            'last_name' => 'Administrator',
            'email' => 'admin@northcakes.com',
            'password' => Hash::make('admin123'),
            'role' => 'admin',
            'is_active' => true
        ]);
        // Default categories
        $categories = ['Cakes', 'Drinks', 'Custom Cakes', 'Event Cakes', 'Pastries', 'Others'];
        foreach ($categories as $cat) {
            Category::create(['name' => $cat, 'is_active' => true]);
        }
    }
}