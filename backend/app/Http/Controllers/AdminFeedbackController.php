<?php

namespace App\Http\Controllers;

use App\Models\Feedback;
use App\Models\UserActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class AdminFeedbackController extends Controller
{
    /**
     * Store a reply to a customer's feedback.
     */
    public function reply(Request $request, $id)
    {
        // Validate the reply
        $validator = Validator::make($request->all(), [
            'reply' => 'required|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Find the feedback or fail
        $feedback = Feedback::findOrFail($id);

        // Store the reply and timestamp
        $feedback->admin_reply = $request->reply;
        $feedback->admin_replied_at = now();
        $feedback->save();

        // Log the admin action (optional – you may need to add 'feedback_replied' to the enum if you want a dedicated type)
        UserActivityLog::create([
            'user_id'       => auth()->id(),
            'activity_type' => 'feedback_replied', // ensure this exists in the enum, or use 'discount_applied' temporarily
            'reference_id'  => $feedback->id,
            'details'       => "Admin replied to feedback #{$feedback->id}",
        ]);

        return response()->json([
            'message'  => 'Reply added successfully.',
            'feedback' => $feedback, // return the updated feedback model
        ], 200);
    }
}