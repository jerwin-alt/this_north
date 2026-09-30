<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\OtpCode;
use App\Mail\OtpVerificationMail;
use Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\DB;

class AuthController extends Controller
{
    public function user(Request $request)
    {
        return $request->user();
    }

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

        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('id_images', 'public');
        }

        DB::beginTransaction();
        try {
            $user = User::create([
                'role'                => 'customer',
                'first_name'          => $request->first_name,
                'last_name'           => $request->last_name,
                'email'               => $request->email,
                'password'            => Hash::make($request->password),
                'phone'               => $request->phone,
                'birth_date'          => $request->birth_date,
                'address'             => $request->address,
                'verification_type'   => $request->verification_type,
                'verification_status' => 'pending',
                'id_number'           => $request->id_number,
                'image'               => $imagePath ? Storage::url($imagePath) : null,
            ]);

            $otp = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
            $expiryMinutes = 5;

            OtpCode::create([
                'user_id'    => $user->id,
                'otp_code'   => $otp,
                'expires_at' => now()->addMinutes($expiryMinutes),
                'is_used'    => false,
            ]);

            Mail::to($user->email)->send(
                new OtpVerificationMail(
                    $user->first_name . ' ' . $user->last_name,
                    $otp,
                    $expiryMinutes,
                )
            );

            DB::commit();

            return response()->json([
                'message'      => 'Registration successful. Please check your email for the verification code.',
                'requires_otp' => true,
                'email'        => $user->email,
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Registration/OTP failed: ' . $e->getMessage());
            return response()->json([
                'message' => 'Registration failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function verifyOtp(Request $request)
    {
        $request->validate([
            'email' => ['required', 'email'],
            'otp'   => ['required', 'string', 'size:6'],
        ]);

        $user = User::where('email', $request->email)->first();
        if (!$user) {
            return response()->json(['message' => 'Account not found.'], 404);
        }

        if ($user->email_verified_at) {
            return response()->json([
                'message' => 'Email is already verified. You may proceed to login.',
            ], 200);
        }

        $record = OtpCode::where('user_id', $user->id)
            ->where('otp_code', $request->otp)
            ->where('is_used', false)
            ->latest('id')
            ->first();

        if (!$record) {
            return response()->json(['message' => 'Wrong OTP. Please try again.'], 422);
        }

        if (now()->greaterThan($record->expires_at)) {
            return response()->json(['message' => 'OTP expired. Please request a new code.'], 422);
        }

        DB::transaction(function () use ($user, $record) {
            $user->email_verified_at = now();
            $user->save();
            $record->is_used = true;
            $record->save();
        });

        return response()->json(['message' => 'Email verified successfully!'], 200);
    }

    public function resendOtp(Request $request)
    {
        $request->validate([
            'email' => ['required', 'email'],
        ]);

        $user = User::where('email', $request->email)->first();
        if (!$user) {
            return response()->json(['message' => 'Account not found.'], 404);
        }

        if ($user->email_verified_at) {
            return response()->json(['message' => 'Email is already verified.'], 200);
        }

        $last = OtpCode::where('user_id', $user->id)->latest('id')->first();
        if ($last && $last->created_at && now()->diffInSeconds($last->created_at) < 60) {
            $wait = 60 - now()->diffInSeconds($last->created_at);
            return response()->json([
                'message'  => "Please wait {$wait} seconds before requesting a new code.",
                'cooldown' => $wait,
            ], 429);
        }

        OtpCode::where('user_id', $user->id)
            ->where('is_used', false)
            ->update(['is_used' => true]);

        $otp = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $expiryMinutes = 5;

        OtpCode::create([
            'user_id'    => $user->id,
            'otp_code'   => $otp,
            'expires_at' => now()->addMinutes($expiryMinutes),
            'is_used'    => false,
        ]);

        try {
            Mail::to($user->email)->send(
                new OtpVerificationMail(
                    $user->first_name . ' ' . $user->last_name,
                    $otp,
                    $expiryMinutes,
                )
            );
        } catch (\Exception $e) {
            \Log::error('Resend OTP failed: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to send the code. Please try again.'], 500);
        }

        return response()->json(['message' => 'A new verification code has been sent.'], 200);
    }

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

        if ($user->role === 'customer' && $user->verification_status !== 'approved') {
            return response()->json([
                'message' => 'Your account is not yet verified. Please wait for admin approval.',
            ], 403);
        }

        $token = $user->createToken('token')->plainTextToken;

        return response()->json([
            'token'   => $token,
            'user'    => [
                'id'               => $user->id,
                'first_name'       => $user->first_name,
                'last_name'        => $user->last_name,
                'email'            => $user->email,
                'phone'            => $user->phone,
                'role'             => $user->role,
                'signature_stamps' => $user->signature_stamps,
                'image'            => $user->image,
            ],
            'message' => 'Login Successful',
        ], 200);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logout Successful'], 200);
    }
}