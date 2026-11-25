<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Menu;
use App\Models\LoyaltySignatureLog;
use App\Models\LoyaltyReward;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Carbon\Carbon;

class CustomerAndOrderSeeder extends Seeder
{
    public function run(): void
    {
        // 🛡️ LOOPHOLE FIX: Stop execution if customers already exist!
        if (User::where('role', 'customer')->exists()) {
            $this->command->info('Customers already exist. Skipping CustomerAndOrderSeeder to prevent duplicates.');
            return;
        }

        $faker = \Faker\Factory::create();
        
        // Fetch some existing data so foreign keys don't fail
        $menus = Menu::where('is_active', true)->get();
        $admin = User::where('role', 'admin')->first();
        $staff = User::where('role', 'staff')->first();

        if ($menus->isEmpty()) {
            $this->command->warn('No menu items found. Please add products first before seeding customers/orders.');
            return;
        }

        $adminId = $admin ? $admin->id : 1;
        $staffId = $staff ? $staff->id : $adminId;

        $verificationTypes = [null, 'senior_citizen', 'pwd'];
        $password = Hash::make('password123'); // All seeded customers will use this password

        for ($i = 0; $i < 20; $i++) {
            $firstName = $faker->firstName;
            $lastName = $faker->lastName;
            $email = strtolower($firstName . '.' . $lastName . $i . '@example.com');
            
            $vType = $faker->randomElement($verificationTypes);
            $idNumber = $vType ? 'ID-' . $faker->numerify('########') : null;

            // 1. Create the Customer (Approved so they can log in on Mobile)
            $user = User::create([
                'role' => 'customer',
                'first_name' => $firstName,
                'last_name' => $lastName,
                'email' => $email,
                'email_verified_at' => now(),
                'password' => $password,
                'phone' => $faker->numerify('09#########'),
                'birth_date' => $faker->dateTimeBetween('-60 years', '-18 years')->format('Y-m-d'),
                'address' => $faker->address,
                'verification_type' => $vType,
                'verification_status' => 'approved', // Required for mobile login
                'id_number' => $idNumber,
                'is_active' => true,
                'is_walk_in_customer' => false,
                'signature_stamps' => 0,
                'loyalty_completed' => false,
            ]);

            // 2. Generate 1 to 5 orders for this customer
            $numOrders = rand(1, 5);
            $totalStamps = 0;

            for ($j = 0; $j < $numOrders; $j++) {
                // Spread orders out over the last 60 days
                $orderDate = Carbon::now()->subDays(rand(1, 60));
                
                $order = Order::create([
                    'order_number' => 'ORD-' . strtoupper(Str::random(8)),
                    'customer_id' => $user->id,
                    'customer_name' => $user->first_name . ' ' . $user->last_name,
                    'customer_phone' => $user->phone,
                    'cashier_id' => $staffId,
                    'is_senior_pwd' => $vType ? true : false,
                    'order_date' => $orderDate,
                    'pickup_date' => $orderDate->copy()->addDays(1),
                    'pickup_time' => '14:00:00',
                    'subtotal' => 0,
                    'total_amount' => 0,
                    'status' => $faker->randomElement(['completed', 'completed', 'completed', 'cancelled']),
                    'payment_status' => 'paid',
                    'created_by' => $adminId,
                    'pickup_method' => 'customer',
                ]);

                $orderTotal = 0;
                
                // 3. Add 1 to 3 items to the order
                $numItems = rand(1, 3);
                for ($k = 0; $k < $numItems; $k++) {
                    $menuItem = $menus->random();
                    $qty = rand(1, 2);
                    $price = $menuItem->base_price;
                    $subtotal = $price * $qty;
                    $orderTotal += $subtotal;

                    OrderItem::create([
                        'order_id' => $order->id,
                        'menu_id' => $menuItem->id,
                        'cake_type' => 'standard',
                        'quantity' => $qty,
                        'unit_price' => $price,
                        'subtotal' => $subtotal,
                        'total_price' => $subtotal,
                        'is_free_item' => false,
                    ]);
                }

                // Update order totals
                $order->update([
                    'subtotal' => $orderTotal,
                    'total_amount' => $orderTotal,
                ]);

                // 4. Create Payments and Loyalty Stamps ONLY for completed orders
                if ($order->status === 'completed') {
                    Payment::create([
                        'order_id' => $order->id,
                        'payment_type' => 'full',
                        'payment_method' => $faker->randomElement(['cash', 'gcash']),
                        'amount_paid' => $orderTotal,
                        'discount_amount' => 0,
                        'final_amount' => $orderTotal,
                        'change_amount' => 0,
                        'payment_date' => $orderDate,
                        'payment_status' => 'completed',
                        'processed_by' => $staffId,
                    ]);

                    // Award 1 stamp (Max 10 stamps for demo purposes, avoiding unique day collision)
                    if ($totalStamps < 10) {
                        $signatureDate = $orderDate->format('Y-m-d');
                        
                        if (!LoyaltySignatureLog::where('user_id', $user->id)->where('signature_date', $signatureDate)->exists()) {
                            $totalStamps++;
                            LoyaltySignatureLog::create([
                                'user_id' => $user->id,
                                'order_id' => $order->id,
                                'signature_date' => $signatureDate,
                                'signature_number' => $totalStamps,
                            ]);
                        }
                    }
                }
            } // End Orders Loop

            // Update user's total stamps
            $user->update(['signature_stamps' => $totalStamps]);

            // 5. Generate Rewards if milestones are met
            if ($totalStamps >= 5) {
                LoyaltyReward::create([
                    'user_id' => $user->id,
                    'reward_type' => '30_percent',
                    'order_id' => Order::where('customer_id', $user->id)->latest('id')->first()->id ?? null,
                    'claimed_at' => now(),
                    'expires_at' => now()->addMonths(1),
                    'is_used' => false,
                    'is_active' => true,
                ]);
            }

            if ($totalStamps >= 10) {
                $rewardTypes = ['free_slice', 'free_coffee', 'free_non_coffee'];
                $selectedType = $faker->randomElement($rewardTypes);
                
                LoyaltyReward::create([
                    'user_id' => $user->id,
                    'reward_type' => $selectedType,
                    'order_id' => Order::where('customer_id', $user->id)->latest('id')->first()->id ?? null,
                    'claimed_at' => now(),
                    'expires_at' => now()->addMonths(1),
                    'is_used' => false,
                    'is_active' => true,
                ]);
                
                $user->update(['loyalty_completed' => true]);
            }
        }

        $this->command->info('✅ 20 Customers with Order History and Rewards seeded successfully!');
        $this->command->info('🔑 Password for all seeded customers: password123');
    }
}