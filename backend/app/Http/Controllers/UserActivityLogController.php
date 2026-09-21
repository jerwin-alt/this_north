<?php

namespace App\Http\Controllers;

use App\Models\UserActivityLog;
use Illuminate\Http\Request;

class UserActivityLogController extends Controller
{
    /**
     * Get activity logs for the authenticated user.
     */
public function userLogs(Request $request)
{
    $query = UserActivityLog::where('user_id', auth()->id())->orderBy('created_at', 'desc');

    if ($request->filled('type')) {
        $query->where('activity_type', $request->type);
    }
    if ($request->filled('limit')) {
        $query->limit((int) $request->limit);
    }

    $logs = $query->get();
    $logs = $logs->map(function ($log) {
        if ($log->created_at) {
            $log->created_at = $log->created_at->toIso8601ZuluString();
        }
        return $log;
    });

    return response()->json(['logs' => $logs]);
}

    

    /**
     * Get all activity logs for a specific order (by reference_id).
     * This is used by customers to see admin/status updates.
     */
public function orderLogs($orderId)
{
    $logs = UserActivityLog::where('reference_id', $orderId)
        ->where('activity_type', 'order_status_updated')
        ->orderBy('created_at', 'asc')
        ->get();

    // Force UTC ISO-8601 with 'Z' for every log
    $logs = $logs->map(function ($log) {
        if ($log->created_at) {
            $log->created_at = $log->created_at->toIso8601ZuluString();
        }
        return $log;
    });

    return response()->json(['logs' => $logs]);
}

    

    
}