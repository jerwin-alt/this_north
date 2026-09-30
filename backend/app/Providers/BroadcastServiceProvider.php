<?php

namespace App\Providers;

use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\ServiceProvider;

class BroadcastServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // Use Sanctum's token guard for private-channel authentication.
        // The default 'web' middleware expects session cookies, which
        // the mobile app does not send — that is what caused the
        // 403 AccessDeniedHttpException in PusherBroadcaster::auth().
        Broadcast::routes(['middleware' => ['auth:sanctum']]);

        require base_path('routes/channels.php');
    }
}