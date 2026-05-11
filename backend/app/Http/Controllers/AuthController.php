<?php

namespace App\Http\Controllers;

use App\Models\User;
use Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AuthController extends Controller
{
    /**
     * Get the authenticated user.
     */
    public function user(Request $request)
    {
        return $request->user();
    }

    /**
     * Register a new customer account.
     * (Admin/staff accounts are created by the admin panel, not here.)
     */
    public function register(Request $request)
    {
        $request->validate([
            'role'               => ['required', 'string', 'in:customer'],
            'first_name'         => ['required', 'string'],
            'last_name'          => ['required', 'string'],
            'email'              => ['required', 'string', 'email', 'unique:users,email'],
            'password'           => ['required', 'confirmed', Password::defaults()],
            'phone'              => ['required', 'numeric'],
            'birth_date'         => ['required', 'date', 'date_format:Y-m-d'],
            'address'            => ['required', 'string'],
            'verification_type'  => ['nullable', 'in:senior_citizen,pwd'],
            'id_number'          => ['nullable', 'string'],
            'image'              => ['nullable', 'image', 'mimes:jpeg,png,jpg', 'max:2048'],
        ]);

        // Handle ID image upload
        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('id_images', 'public');
        }

        User::create([
            'role'                => 'customer',
            'first_name'          => $request->first_name,
            'last_name'           => $request->last_name,
            'email'               => $request->email,
            'password'            => Hash::make($request->password),
            'phone'               => $request->phone,
            'birth_date'          => $request->birth_date,
            'address'             => $request->address,
            'verification_type'   => $request->verification_type,
            'verification_status' => 'pending',          // all self‑registered customers start as pending
            'id_number'           => $request->id_number,
            'image'               => $imagePath ? Storage::url($imagePath) : null,
        ]);

        return response()->json([
            'message' => 'Registration successful. Please wait for admin verification.',
        ], 201);
    }

    /**
     * Login.
     */
    public function login(Request $request)
    {
        $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required'],
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Credentials Provided are Incorrect'], 422);
        }

        // 🚫 Block unverified customers
        if ($user->role === 'customer' && $user->verification_status !== 'approved') {
            return response()->json([
                'message' => 'Your account is not yet verified. Please wait for admin approval.',
            ], 403);
        }

        $token = $user->createToken('token')->plainTextToken;

        return response()->json([
            'token'   => $token,
            'user'    => [
                'id'          => $user->id,
                'first_name'  => $user->first_name,
                'last_name'   => $user->last_name,
                'email'       => $user->email,
                'phone'       => $user->phone,
                'role'        => $user->role,
                'signature_stamps' => $user->signature_stamps,  // add this line
            ],
            'message' => 'Login Successful',
        ], 200);
    }

    /**
     * Logout.
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logout Successful'], 200);
    }
}