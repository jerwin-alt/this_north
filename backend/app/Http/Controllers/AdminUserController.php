<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use Hash;
use Illuminate\Validation\Rules\Password;

class AdminUserController extends Controller
{
    // ---------- EXISTING METHODS (keep them) ----------
    public function getAllUsers()
    {
        $users = User::whereIn('role', ['admin', 'staff'])->get(); 
        return response()->json([
            'users'   => $users,
            'count'   => $users->count(),
            'message' => 'All users retrieved successfully'
        ]);
    }

    public function getStaffUsers()
    {
        $staffUsers = User::where('role', 'staff')->get();
        return response()->json([
            'users'   => $staffUsers,
            'count'   => $staffUsers->count(),
            'message' => 'Staff users retrieved successfully'
        ]);
    }

    public function adminCreateUser(Request $request)
    {
        try {
            $request->validate([
                'role' => ['required', 'string', 'in:admin,staff,'],
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
            return response()->json(['errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Server error: ' . $e->getMessage()], 500);
        }
    }

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

        if ($request->filled('password')) {
            $updateData['password'] = Hash::make($request->password);
        }

        $user->update($updateData);

        return response()->json([
            'message' => 'User updated successfully',
            'user' => $user
        ]);
    }

    public function softDeleteUser($id)
    {
        $user = User::findOrFail($id);
        $user->update(['is_active' => false]);

        return response()->json(['message' => 'User deactivated successfully']);
    }

    public function toggleUserStatus($id)
    {
        $user = User::findOrFail($id);
        $user->update(['is_active' => !$user->is_active]);

        return response()->json([
            'message' => 'User status toggled',
            'user' => $user->fresh()
        ]);
    }

    // ---------- NEW CUSTOMER MANAGEMENT METHODS ----------
    /**
     * Get all customers (role = 'customer').
     */
    public function getCustomers()
    {
        $customers = User::where('role', 'customer')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'customers' => $customers,
            'count'     => $customers->count(),
        ]);
    }

    /**
     * Approve customer verification.
     */
    public function approveCustomer($id)
    {
        $customer = User::where('role', 'customer')->findOrFail($id);
        $customer->update(['verification_status' => 'approved']);

        return response()->json(['message' => 'Customer approved successfully']);
    }

    /**
     * Reject customer verification.
     */
    public function rejectCustomer($id)
    {
        $customer = User::where('role', 'customer')->findOrFail($id);
        $customer->update(['verification_status' => 'rejected']);

        return response()->json(['message' => 'Customer rejected successfully']);
    }
}