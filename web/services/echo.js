// web/src/services/echo.js
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { getToken } from './auth-storage';

// Echo's Pusher driver expects a global Pusher.
window.Pusher = Pusher;

let echoInstance = null;

export function initWebEcho() {
  const token = getToken();
  if (!token) return null;

  if (echoInstance) return echoInstance;

  const scheme  = import.meta.env.VITE_REVERB_SCHEME || 'http';
  const host    = import.meta.env.VITE_REVERB_HOST   || 'localhost';
  const port    = Number(import.meta.env.VITE_REVERB_PORT || 8080);
  const key     = import.meta.env.VITE_REVERB_APP_KEY || '';
  const rawApiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
  const apiBase = rawApiBase.replace(/\/api\/?$/, '');   // strip trailing /api
  const useTLS  = scheme === 'https';

  echoInstance = new Echo({
    broadcaster: 'pusher',
    key,
    cluster: 'mt1',
    wsHost: host,
    wsPort: port,
    wssPort: port,
    forceTLS: useTLS,
    encrypted: useTLS,
    disableStats: true,
    enabledTransports: ['ws', 'wss'],
    authEndpoint: `${apiBase}/broadcasting/auth`,        // → http://localhost:8000/broadcasting/auth
    auth: {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    },
  });

  return echoInstance;
}

export function disconnectWebEcho() {
  if (echoInstance) {
    try { echoInstance.disconnect(); } catch {}
    echoInstance = null;
  }
}