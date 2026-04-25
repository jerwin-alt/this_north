<?php

namespace App\Http\Controllers;

use App\Models\User;
use Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;



//MUST READ\\

//WLA KO KABALO UNSAY EXACT CAUSE SA ISSUE GANIHA, PERO NAG ASSUME KO NGA NAAY TYPO/NAAY FIELD NGA
//WALA NAAPIL PAG POST SA POSTMAN.
//KAY SA AKONG CASE GANIHA, NA REPLICATE NAKO ANG ERROR PERO ANG CAUSE KY WALA NAKO NAAPIL ANG
//ADDRESS SA FIELDS SA PAG POST SA API SA POSTMAN
//AKONG GIBUHAT LNG KARON IS BACKEND FUNCTIONS PARA SA REGISTER, LOGIN OG LOGOUT.
class AuthController extends Controller
{


    //FUNCTION ANI IS PARA MAKUHA NIYA ANG DATA NI USER (EX. NAME, ADDRESS, EMAIL, ETC.)
    public function use (Request $request)
    {
        return $request->user();
    }


    //PAG REGISTER SA ACCOUNT
    public function register(Request $request)
    {
        //VALIDATE SA UNA AYHA NIYA I PASA SA DATABASE ANG DATA
        $request->validate([
            'role' => ['required', 'string'],
            'first_name' => ['required', 'string'],
            'last_name' => ['required', 'string'],
            'email' => ['required', 'string', 'email', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::defaults()],
            'phone' => ['required', 'numeric'],
            'birth_date' => ['required', 'date', 'date_format:Y-m-d'],
            'address' => ['required', 'string'],
            'verification_type' => ['required', 'string'],
            'verification_status' => ['required', 'string'],
            'id_number' => ['required', 'string'],
            'expires_at' => ['required', 'date', 'date_format:Y-m-d']
        ]);

        //PAG CREATE OG DATA OG PAGLABAY NIYA SA DATABASE
        User::create([
            'role' => $request->role,
            'first_name' => $request->first_name,
            'last_name' => $request->last_name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'phone' => $request->phone,
            'birth_date' => $request->birth_date,
            'address' => $request->address,
            'verification_type' => $request->verification_type,
            'verification_status' => $request->verification_status,
            'id_number' => $request->id_number,
            'expires_at' => $request->expires_at
        ]);

        //RESPONSE MESSAGE ONCE SUCCESSFUL ANG PAG REGISTER 
        return response()->json([
            'message' => 'User Registered Successfully'
        ], 200);
    }

    

    // Get all staff users
    public function getStaffUsers()
    {
        $staffUsers = User::where('role', 'staff')->get();

        return response()->json([
            'users' => $staffUsers,
            'count' => $staffUsers->count(),
            'message' => 'Staff users retrieved successfully'
        ], 200);
    }


    // Admin-only: get all users (admins and staff)
    public function getAllUsers()
    {
        $users = User::all(); // or paginate if needed
        return response()->json([
            'users' => $users,
            'count' => $users->count(),
            'message' => 'All users retrieved successfully'
        ], 200);
    }


    /**
     * Admin-only: Create a new user (admin or staff)
     */
    public function adminCreateUser(Request $request)
    {
        try {
            $request->validate([
                'role' => ['required', 'string', 'in:admin,staff'],
                'first_name' => ['required', 'string'],
                'last_name' => ['required', 'string'],
                'email' => ['required', 'string', 'email', 'unique:users,email'],
                'password' => ['required', 'confirmed', Password::defaults()],
                'phone' => ['required', 'numeric'],
                'birth_date' => ['required', 'date', 'date_format:Y-m-d'],
                'address' => ['required', 'string'],
                'verification_type' => ['required', 'string'],
                'verification_status' => ['required', 'string'],
                'id_number' => ['required', 'string'],
                'expires_at' => ['required', 'date', 'date_format:Y-m-d']
            ]);

            $user = User::create([
                'role' => $request->role,
                'first_name' => $request->first_name,
                'last_name' => $request->last_name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'phone' => $request->phone,
                'birth_date' => $request->birth_date,
                'address' => $request->address,
                'verification_type' => $request->verification_type,
                'verification_status' => $request->verification_status,
                'id_number' => $request->id_number,
                'expires_at' => $request->expires_at,
            ]);

            return response()->json([
                'message' => 'User created successfully',
                'user' => $user
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            // Validation errors – returns 422
            return response()->json(['errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            // Any other error – log it and return 500 with details (for debugging)
            \Log::error('Admin create user error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }


    // Admin-only: update an existing user
public function adminUpdateUser(Request $request, $id)
{
    $user = User::findOrFail($id);

    $request->validate([
        'role' => ['required', 'string', 'in:admin,staff'],
        'first_name' => ['required', 'string'],
        'last_name' => ['required', 'string'],
        'email' => ['required', 'string', 'email', 'unique:users,email,' . $id],
        'phone' => ['required', 'numeric'],
        'birth_date' => ['required', 'date', 'date_format:Y-m-d'],
        'address' => ['required', 'string'],
        // optional: if you want to allow password update
        'password' => ['nullable', 'confirmed', Password::defaults()],
    ]);

    $updateData = [
        'role' => $request->role,
        'first_name' => $request->first_name,
        'last_name' => $request->last_name,
        'email' => $request->email,
        'phone' => $request->phone,
        'birth_date' => $request->birth_date,
        'address' => $request->address,
    ];

    // Update password only if provided
    if ($request->filled('password')) {
        $updateData['password'] = Hash::make($request->password);
    }

    $user->update($updateData);

    return response()->json([
        'message' => 'User updated successfully',
        'user' => $user
    ], 200);
}



        /**
     * Admin: Create a new menu item (product)
     * Accepts multipart/form-data
     */
    public function adminAddMenu(Request $request)
    {
        // 1. Validate the request
        $validated = $request->validate([
            // Basic fields
            'category_id'          => 'required|exists:categories,id,is_active,1',
            'name'                 => 'required|string|max:150',
            'description'          => 'nullable|string',
            'base_price'           => 'required|numeric|min:0',
            'menu_type'            => 'required|in:standard,customizable',
            'has_size_options'     => 'boolean',
            'is_active'            => 'boolean',
            'stock_quantity'       => 'required_if:track_stock,true|nullable|integer|min:0',
            'is_ready_made'        => 'boolean',
            'track_stock'          => 'boolean',
            'expiration_date'      => 'nullable|date|after:today',
            'min_stock_level'      => 'nullable|integer|min:0',
            'sku'                  => 'nullable|string|unique:menu,sku',
            // Image (required)
            'image'                => 'required|image|mimes:jpeg,png,jpg,gif|max:5120', // 5MB
            // Optional drink sizes (JSON string)
            'drink_sizes'          => 'nullable|json',
            // Optional BOM (JSON string)
            'recipe'               => 'nullable|json',
        ]);

        // 2. Auto‑generate SKU if not provided
        $sku = $request->sku ?? 'MENU-' . time();

        // 3. Handle image upload
        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('uploads/menu', 'public');
            if (!$imagePath) {
                return response()->json(['message' => 'Image upload failed'], 500);
            }
        } else {
            return response()->json(['message' => 'Image is required'], 422);
        }

        // 4. Begin database transaction
        DB::beginTransaction();
        try {
            // 4.1 Create the menu item
            $menu = \App\Models\Menu::create([
                'category_id'       => $request->category_id,
                'sku'               => $sku,
                'name'              => $request->name,
                'description'       => $request->description,
                'base_price'        => $request->base_price,
                'menu_type'         => $request->menu_type,
                'has_size_options'  => $request->has_size_options ?? false,
                'is_active'         => $request->is_active ?? true,
                'stock_quantity'    => $request->track_stock ? ($request->stock_quantity ?? 0) : null,
                'is_ready_made'     => $request->is_ready_made ?? true,
                'track_stock'       => $request->track_stock ?? false,
                'expiration_date'   => $request->expiration_date,
                'min_stock_level'   => $request->min_stock_level,
                'image_url'         => Storage::url($imagePath),
                'stocked_at'        => now(),
            ]);

            // 4.2 Insert drink sizes if provided and valid
            $drinkSizes = [];
            if ($request->filled('drink_sizes')) {
                $sizes = json_decode($request->drink_sizes, true);
                if (is_array($sizes) && count($sizes)) {
                    foreach ($sizes as $size) {
                        $drinkSizes[] = \App\Models\DrinkSize::create([
                            'menu_id'        => $menu->id,
                            'size_name'      => $size['size_name'],
                            'price_modifier' => $size['price_modifier'] ?? 0,
                            'is_active'      => $size['is_active'] ?? true,
                        ]);
                    }
                }
            }

            // 4.3 Insert Bill of Materials if recipe provided
            $bomEntries = [];
            if ($request->filled('recipe')) {
                $recipe = json_decode($request->recipe, true);
                if (is_array($recipe) && count($recipe)) {
                    foreach ($recipe as $item) {
                        // Validate ingredient exists
                        $ingredient = \App\Models\Ingredient::find($item['ingredient_id']);
                        if (!$ingredient) {
                            throw new \Exception("Ingredient ID {$item['ingredient_id']} not found");
                        }
                        $bomEntries[] = \App\Models\BillOfMaterials::create([
                            'menu_id'           => $menu->id,
                            'ingredient_id'     => $item['ingredient_id'],
                            'quantity_needed'   => $item['quantity_needed'],
                            'unit'              => $item['unit'],
                            'wastage_percentage'=> $item['wastage_percentage'] ?? 0,
                        ]);
                    }
                }
            }

            // 4.4 Log activity
            \App\Models\UserActivityLog::create([
                'user_id'       => auth()->id(),
                'activity_type' => 'inventory_updated', // you may want 'menu_created'
                'reference_id'  => $menu->id,
                'details'       => "Created menu item: {$menu->name} (ID: {$menu->id})",
            ]);

            DB::commit();

            // 5. Return successful response
            return response()->json([
                'message' => 'Product created successfully',
                'product' => $menu->load(['category', 'drinkSizes', 'billOfMaterials.ingredient']),
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();

            // Delete uploaded image if something failed
            if ($imagePath && Storage::disk('public')->exists($imagePath)) {
                Storage::disk('public')->delete($imagePath);
            }

            Log::error('Menu creation failed: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to create product',
                'error'   => $e->getMessage()
            ], 500);
        }
    }




    public function login(Request $request)
    {
        $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required']
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Credentials Provided are Incorrect'], 422);
        }

        $token = $user->createToken('token')->plainTextToken;

        return response()->json([
            'token' => $token,
            $user = [
                'id' => $user->id,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'email' => $user->email,
                'phone' => $user->phone,
                'role' => $user->role
            ],
            
            'message' => 'Login Successful'

        ], 200);
    }

    public function logout(Request $request)
    {
        $user = $request->user();
        $user->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logout Successful'
        ], 200);
    }
}
