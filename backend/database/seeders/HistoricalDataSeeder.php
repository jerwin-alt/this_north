<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Menu;
use App\Models\User;
use App\Models\Discount;
use App\Models\Ingredient;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class HistoricalDataSeeder extends Seeder
{
    public function run(): void
    {
        // ─── Skip if already seeded ───
        $existing = DB::table('orders')
            ->where('notes', 'like', '[HISTORICAL DEMO]%')
            ->count();
        if ($existing > 0) {
            $this->command->info('✓ Historical data already exists. Skipping.');
            return;
        }

        // ─── Resolve existing products by SKU ───
        $products = Menu::whereIn('sku', [
            'CA-0001', 'CA-0002', 'CA-0003', 'CA-0004',
            'PA-0001', 'PA-0002',
        ])->get();
        if ($products->isEmpty()) {
            $this->command->warn('No demo products found (CA-0001..CA-0004, PA-0001..PA-0002). Aborting.');
            return;
        }

        // ─── Resolve existing users ───
        $staffUsers = User::where('role', 'staff')->get();

        // Ensure 2 staff members
        if ($staffUsers->count() < 2) {
            $needed = 2 - $staffUsers->count();
            for ($i = 0; $i < $needed; $i++) {
                $created = User::firstOrCreate(
                    ['email' => 'staff' . ($staffUsers->count() + $i + 1) . '@northcakes.demo'],
                    [
                        'first_name' => $i === 0 ? 'Carlo' : 'Denise',
                        'last_name'  => $i === 0 ? 'Mendoza' : 'Villanueva',
                        'password'   => Hash::make('password'),
                        'role'       => 'staff',
                        'phone'      => '0917' . mt_rand(1000000, 9999999),
                        'birth_date' => '1995-01-15',
                        'address'    => 'CDO, Misamis Oriental',
                        'is_active'  => 1,
                    ]
                );
                $staffUsers->push($created);
            }
        }

        $staff1 = $staffUsers[0];
        $staff2 = $staffUsers[1];
        $admin  = User::where('role', 'admin')->first();

        $customers = User::where('role', 'customer')->get();
        $discount  = Discount::where('discount_name', 'like', '%PWD%')->first();

        // ─── Deterministic random for reproducibility ───
        mt_srand(20261001);

        $startDate = Carbon::today()->subMonths(2)->startOfMonth();
        $endDate   = Carbon::today();
        $orderCounter = DB::table('orders')->count();

        $walkInNames = [
            'Mark Santos', 'Ana Reyes', 'Paolo Cruz', 'Grace Lim', 'Ryan Bautista',
            'Kim Lopez', 'Jessa Ramos', 'Miguel Torres', 'Bianca Reyes', 'Carlos Tan',
        ];
        $customCakePrices = [1200, 1500, 1800, 2200, 2500, 3000, 3500];

        $totalOrders = 0;
        $day = $startDate->copy();

        while ($day->lte($endDate)) {
            // Skip ~20% of days for realism
            if (mt_rand(1, 10) <= 2) {
                $day->addDay();
                continue;
            }

            $ordersToday = mt_rand(2, 6);

            for ($i = 0; $i < $ordersToday; $i++) {
                $orderCounter++;
                $orderDate = $day->copy()->setTime(mt_rand(8, 20), mt_rand(0, 59), 0);

                // Pick order type
                $roll = mt_rand(1, 100);
                if ($roll <= 50) {
                    $orderType = 'walk_in';
                } elseif ($roll <= 80) {
                    $orderType = 'online';
                } else {
                    $orderType = 'custom_cake';
                }

                // Decide if PWD/Senior discount applies (20% of walk-in + online)
                $useDiscount = $discount
                    && $orderType !== 'custom_cake'
                    && mt_rand(1, 100) <= 20;

                // Pick the staff who handled this order
                $handlingStaff = mt_rand(0, 1) === 0 ? $staff1 : $staff2;

                // Order number
                $orderNumber = 'ORD-' . $orderDate->format('Ymd')
                    . '-' . str_pad($orderCounter, 4, '0', STR_PAD_LEFT);

                // Pickup schedule
                $pickupDate = $orderDate->copy()->addDays(mt_rand(0, 3));
                $pickupTime = sprintf('%02d:%02d:00', mt_rand(9, 18), mt_rand(0, 59));

                // Build items
                $items = [];
                $subtotal = 0.0;

                if ($orderType === 'custom_cake') {
                    $price = $customCakePrices[array_rand($customCakePrices)];
                    $items[] = [
                        'menu_id'          => null,
                        'cake_type'        => 'custom',
                        'custom_design_id' => null,
                        'quantity'         => 1,
                        'unit_price'       => $price,
                        'subtotal'         => $price,
                        'total_price'      => $price,
                        'discount_amount'  => 0,
                        'is_free_item'     => false,
                    ];
                    $subtotal = $price;
                } else {
                    $itemCount = min(mt_rand(1, 3), $products->count());
                    $picked    = $products->random($itemCount);
                    foreach ($picked as $product) {
                        $qty    = mt_rand(1, 3);
                        $price  = (float) $product->base_price;
                        $line   = $price * $qty;
                        $items[] = [
                            'menu_id'          => $product->id,
                            'cake_type'        => 'standard',
                            'custom_design_id' => null,
                            'quantity'         => $qty,
                            'unit_price'       => $price,
                            'subtotal'         => $line,
                            'total_price'      => $line,
                            'discount_amount'  => 0,
                            'is_free_item'     => false,
                        ];
                        $subtotal += $line;
                    }
                }

                // Apply discount to lowest-priced item
                $discountTotal = 0.0;
                if ($useDiscount) {
                    $lowestIdx   = null;
                    $lowestTotal = PHP_FLOAT_MAX;
                    foreach ($items as $idx => $item) {
                        if ($item['subtotal'] < $lowestTotal) {
                            $lowestTotal = $item['subtotal'];
                            $lowestIdx   = $idx;
                        }
                    }
                    if ($lowestIdx !== null) {
                        $amt = round($lowestTotal * ($discount->discount_value / 100), 2);
                        $items[$lowestIdx]['discount_amount'] = $amt;
                        $items[$lowestIdx]['total_price']     = $lowestTotal - $amt;
                        $discountTotal = $amt;
                    }
                }

                $totalAmount = round($subtotal - $discountTotal, 2);

                // Customer info
                $customerId    = null;
                $customerName  = null;
                $customerPhone = null;
                $createdBy     = $handlingStaff->id;

                if ($orderType === 'online' && $customers->isNotEmpty()) {
                    $cust          = $customers->random();
                    $customerId    = $cust->id;
                    $customerName  = trim($cust->first_name . ' ' . $cust->last_name);
                    $customerPhone = $cust->phone;
                    $createdBy     = $cust->id;
                } else {
                    $customerName  = $walkInNames[array_rand($walkInNames)];
                    $customerPhone = '09' . mt_rand(100000000, 999999999);
                }

                // ─── Insert order (DB::table to control timestamps) ───
                $orderId = DB::table('orders')->insertGetId([
                    'order_number'              => $orderNumber,
                    'customer_id'               => $customerId,
                    'customer_name'             => $customerName,
                    'customer_phone'            => $customerPhone,
                    'cashier_id'                => $handlingStaff->id,
                    'is_senior_pwd'             => $useDiscount ? 1 : 0,
                    'order_date'                => $orderDate->toDateTimeString(),
                    'pickup_date'               => $pickupDate->toDateString(),
                    'pickup_time'               => $pickupTime,
                    'subtotal'                  => $subtotal,
                    'total_amount'              => $totalAmount,
                    'loyalty_signatures_earned' => 0,
                    'status'                    => 'completed',
                    'payment_status'            => 'paid',
                    'notes'                     => '[HISTORICAL DEMO] Seeded for reports',
                    'event_type'                => null,
                    'created_by'                => $createdBy,
                    'updated_at'                => $orderDate->copy()->addHours(mt_rand(1, 6))->toDateTimeString(),
                    'discount_id'               => $useDiscount ? $discount->id : null,
                    'discount_total'            => $discountTotal,
                ]);

                // ─── Insert items ───
                foreach ($items as $item) {
                    DB::table('order_items')->insert([
                        'order_id'         => $orderId,
                        'menu_id'          => $item['menu_id'],
                        'cake_type'        => $item['cake_type'],
                        'cake_size_id'     => null,
                        'drink_sizes_id'   => null,
                        'cake_flavor_id'   => null,
                        'custom_flavor'    => null,
                        'custom_design_id' => null,
                        'quantity'         => $item['quantity'],
                        'unit_price'       => $item['unit_price'],
                        'subtotal'         => $item['subtotal'],
                        'total_price'      => $item['total_price'],
                        'is_free_item'     => 0,
                        'discount_amount'  => $item['discount_amount'],
                    ]);
                }

                // ─── Insert payment ───
                $paymentMethod = mt_rand(0, 1) === 0 ? 'cash' : 'gcash';
                DB::table('payments')->insert([
                    'order_id'         => $orderId,
                    'payment_type'     => 'full',
                    'payment_method'   => $paymentMethod,
                    'amount_paid'      => $totalAmount,
                    'discount_amount'  => $discountTotal,
                    'discount_id'      => $useDiscount ? $discount->id : null,
                    'final_amount'     => $totalAmount,
                    'change_amount'    => 0,
                    'payment_date'     => $orderDate->copy()->addMinutes(mt_rand(5, 90))->toDateTimeString(),
                    'reference_number' => $paymentMethod === 'gcash'
                        ? 'REF' . mt_rand(100000, 999999)
                        : null,
                    'payment_status'   => 'completed',
                    'processed_by'     => $handlingStaff->id,
                    'created_at'       => $orderDate->toDateTimeString(),
                    'updated_at'       => $orderDate->toDateTimeString(),
                ]);

                $totalOrders++;
            }

            $day->addDay();
        }

        $this->command->info("✓ Historical orders seeded: {$totalOrders}");

        // ─── Menu stock transactions (stock-in / stock-out / sold) ───
        $this->seedMenuTransactions($products, [$staff1, $staff2], $admin);

        // ─── Ingredient transactions (purchase / usage / adjustment) ───
        $this->seedIngredientTransactions([$staff1, $staff2], $admin);
    }

    /**
     * Menu transactions (activity logs the reports controller parses).
     *  - Stock In  → "Added stock to {name}: +{qty}"
     *  - Sold      → "Deducted stock for {name}: -{qty} (was X, now Y)"
     */
    private function seedMenuTransactions($products, $staffList, $admin): void
    {
        foreach ($products as $product) {
            // 4 stock-in events
            for ($i = 0; $i < 4; $i++) {
                $qty  = mt_rand(10, 50);
                $date = Carbon::today()->subDays(mt_rand(1, 60))->setTime(mt_rand(8, 17), mt_rand(0, 59));
                DB::table('user_activity_logs')->insert([
                    'user_id'       => $staffList[array_rand($staffList)]->id,
                    'activity_type' => 'inventory_updated',
                    'reference_id'  => $product->id,
                    'details'       => "Added stock to {$product->name}: +{$qty}",
                    'created_at'    => $date->toDateTimeString(),
                ]);
            }

            // 10 sold events
            for ($i = 0; $i < 10; $i++) {
                $qty = mt_rand(1, 5);
                $was = mt_rand(20, 80);
                $now = $was - $qty;
                $date = Carbon::today()->subDays(mt_rand(1, 60))->setTime(mt_rand(9, 20), mt_rand(0, 59));
                DB::table('user_activity_logs')->insert([
                    'user_id'       => $staffList[array_rand($staffList)]->id,
                    'activity_type' => 'inventory_updated',
                    'reference_id'  => $product->id,
                    'details'       => "Deducted stock for {$product->name}: -{$qty} (was {$was}, now {$now})",
                    'created_at'    => $date->toDateTimeString(),
                ]);
            }
        }
    }

    /**
     * Ingredient transactions across the last 2 months.
     */
    private function seedIngredientTransactions($staffList, $admin): void
    {
        $ingredients = Ingredient::where('is_active', 1)->get();
        if ($ingredients->isEmpty()) {
            $this->command->warn('No active ingredients found; skipping ingredient transactions.');
            return;
        }

        foreach ($ingredients as $ingredient) {
            // Purchases
            for ($i = 0; $i < 3; $i++) {
                $qty  = mt_rand(5, 30);
                $prev = mt_rand(10, 50);
                $date = Carbon::today()->subDays(mt_rand(1, 60))->setTime(mt_rand(8, 12), mt_rand(0, 59));
                DB::table('inventory_transactions')->insert([
                    'ingredient_id'    => $ingredient->id,
                    'transaction_type' => 'purchase',
                    'quantity'         => $qty,
                    'previous_stock'   => $prev,
                    'new_stock'        => $prev + $qty,
                    'reference_type'   => 'purchase_order',
                    'reference_id'     => null,
                    'notes'            => '[HISTORICAL DEMO] Purchase restock',
                    'created_by'       => $staffList[array_rand($staffList)]->id,
                    'created_at'       => $date->toDateTimeString(),
                ]);
            }

            // Usages
            for ($i = 0; $i < 5; $i++) {
                $qty  = mt_rand(1, 5);
                $prev = mt_rand(20, 60);
                $date = Carbon::today()->subDays(mt_rand(1, 60))->setTime(mt_rand(10, 19), mt_rand(0, 59));
                DB::table('inventory_transactions')->insert([
                    'ingredient_id'    => $ingredient->id,
                    'transaction_type' => 'usage',
                    'quantity'         => $qty,
                    'previous_stock'   => $prev,
                    'new_stock'        => max(0, $prev - $qty),
                    'reference_type'   => 'order',
                    'reference_id'     => null,
                    'notes'            => '[HISTORICAL DEMO] Ingredient used for production',
                    'created_by'       => $staffList[array_rand($staffList)]->id,
                    'created_at'       => $date->toDateTimeString(),
                ]);
            }

            // Adjustments
            for ($i = 0; $i < 2; $i++) {
                $delta = mt_rand(1, 5);
                $prev  = mt_rand(20, 50);
                $date  = Carbon::today()->subDays(mt_rand(1, 60))->setTime(mt_rand(9, 17), mt_rand(0, 59));
                DB::table('inventory_transactions')->insert([
                    'ingredient_id'    => $ingredient->id,
                    'transaction_type' => 'adjustment',
                    'quantity'         => $delta,
                    'previous_stock'   => $prev,
                    'new_stock'        => $prev + $delta,
                    'reference_type'   => 'adjustment',
                    'reference_id'     => null,
                    'notes'            => '[HISTORICAL DEMO] Stock count correction',
                    'created_by'       => $admin ? $admin->id : $staffList[0]->id,
                    'created_at'       => $date->toDateTimeString(),
                ]);
            }
        }
    }
}