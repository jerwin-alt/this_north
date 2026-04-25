<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;
use Illuminate\Http\Request;

class Authenticate extends Middleware
{
    /**
     * Get the path the user should be redirected to when they are not authenticated.
     */
    protected function redirectTo(Request $request): ?string
    {
        // For API requests, return null → throws AuthenticationException → returns 401 JSON
        if ($request->is('api/*') || $request->expectsJson()) {
            return null;
        }

        // For web routes (if any), you can define a fallback – or leave as is
        return route('login'); // you can also use '/login' directly
    }
}