<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
// use App\Models\Order;
// use Illuminate\Validation\Rule;

class AdminOrderController extends Controller
{
        /**
     * TEMPORARY SAFE VERSION
     */
    public function index(Request $request)
    {
        return response()->json([
            'data' => [], // IMPORTANT: matches frontend expectation
            'message' => 'Order system not implemented yet'
        ]);
    }

    public function updateSchedule(Request $request, $id)
    {
        return response()->json([
            'message' => 'Schedule update not available yet'
        ], 501); // Not implemented
    }



}
