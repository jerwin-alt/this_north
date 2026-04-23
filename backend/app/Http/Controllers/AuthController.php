<?php

namespace App\Http\Controllers;

use App\Models\User;
use Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Http\Request;


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
