


// mobile/services/echo.js
//
// Real-time broadcasting client for North Cakes customer mobile.
// Bulletproof module resolution + env-driven config + full diagnostics.

// mobile/services/echo.js
//
// Real-time broadcasting client for North Cakes customer mobile.
// Uses a custom authorizer so the auth request goes through our
// axios instance (which handles the token + works reliably in RN).

import EchoModule from 'laravel-echo';
import PusherModule from 'pusher-js';
import { getToken } from './auth-storage';
import axios from '@/api/axios';

// ─────────────────────────────────────────────────────────────
// 1. Bulletproof constructor resolver
// ─────────────────────────────────────────────────────────────
function resolveCtor(mod, name) {
  if (!mod) return null;
  if (typeof mod === 'function') return mod;
  if (typeof mod.default === 'function') return mod.default;
  if (name && typeof mod[name] === 'function') return mod[name];
  if (mod.default && typeof mod.default[name] === 'function') return mod.default[name];
  if (mod.default && typeof mod.default.default === 'function') return mod.default.default;
  return null;
}

const Echo   = resolveCtor(EchoModule,   'Echo');
const Pusher = resolveCtor(PusherModule, 'Pusher');

console.log('[echo] Echo resolved:', typeof Echo);
console.log('[echo] Pusher resolved:', typeof Pusher);

// ─────────────────────────────────────────────────────────────
// 2. React Native polyfills
// ─────────────────────────────────────────────────────────────
if (typeof window === 'undefined') {
  const mockDocument = {
    createElement: () => ({}), createElementNS: () => ({}),
    documentElement: { style: {} }, head: { appendChild: () => {} },
    body: { appendChild: () => {} }, addEventListener: () => {},
    removeEventListener: () => {}, getElementById: () => null,
    querySelector: () => null, querySelectorAll: () => [],
    getElementsByTagName: () => ({ length: 0, item: () => null }),
    getElementsByClassName: () => [], getElementsByName: () => [],
    createEvent: () => ({ initEvent: () => {} }),
    createTextNode: () => ({}),
    implementation: { createHTMLDocument: () => mockDocument },
  };
  const mockWindow = {
    document: mockDocument,
    navigator: { userAgent: 'react-native', platform: 'React Native' },
    addEventListener: () => {}, removeEventListener: () => {},
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    matchMedia: () => ({ matches: false, addListener: () => {} }),
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} },
    sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} },
    location: { href: 'http://localhost', protocol: 'http:', host: 'localhost', hostname: 'localhost', port: '80', pathname: '/', search: '', hash: '' },
    history: { pushState: () => {}, replaceState: () => {} },
    setTimeout: global.setTimeout, clearTimeout: global.clearTimeout,
    setInterval: global.setInterval, clearInterval: global.clearInterval,
    console: global.console,
  };
  global.window = mockWindow;
  global.document = mockWindow.document;
  global.navigator = mockWindow.navigator;
}

if (typeof MutationObserver === 'undefined') {
  global.MutationObserver = class {
    observe() {} disconnect() {} takeRecords() { return []; }
  };
}

if (typeof Pusher === 'function') {
  window.Pusher = Pusher;
}

// ─────────────────────────────────────────────────────────────
// 3. Env-driven Reverb config
// ─────────────────────────────────────────────────────────────
const REVERB_KEY    = process.env.EXPO_PUBLIC_REVERB_APP_KEY || 't34yzindehe8rurmywzi';
const REVERB_HOST   = process.env.EXPO_PUBLIC_REVERB_HOST    || '10.195.159.170';
const REVERB_PORT   = Number(process.env.EXPO_PUBLIC_REVERB_PORT || 8080);
const REVERB_SCHEME = process.env.EXPO_PUBLIC_REVERB_SCHEME  || 'http';
const API_BASE      = process.env.EXPO_PUBLIC_API_URL        || 'http://10.195.159.170:8000';

// ─────────────────────────────────────────────────────────────
// 4. Singleton Echo instance
// ─────────────────────────────────────────────────────────────
let echoInstance = null;

export const initEcho = async () => {
  if (typeof Echo !== 'function' || typeof Pusher !== 'function') {
    console.warn('[echo] Skipping init — Echo or Pusher not a constructor');
    return null;
  }

  const token = await getToken();
  if (!token) {
    console.warn('[echo] No token — cannot initialise Echo');
    return null;
  }

  const useTLS = REVERB_SCHEME === 'https';

  console.log(`[echo] Resolved → ${REVERB_SCHEME}://${REVERB_HOST}:${REVERB_PORT}`);
  console.log(`[echo] Auth endpoint → ${API_BASE}/broadcasting/auth`);
  console.log(`[echo] App key → ${REVERB_KEY}`);

  const options = {
    broadcaster: 'pusher',
    key: REVERB_KEY,
    cluster: 'mt1',
    wsHost: REVERB_HOST,
    wsPort: REVERB_PORT,
    wssPort: REVERB_PORT,
    forceTLS: useTLS,
    encrypted: useTLS,
    disableStats: true,
    enabledTransports: ['ws', 'wss'],

    // ─── CRITICAL FIX ────────────────────────────────────────────
    // Custom authorizer — bypasses pusher-js's built-in XHR auth
    // transport, which silently hangs in Expo/React Native.
    // This uses our axios instance, which already attaches the token.
    // ─────────────────────────────────────────────────────────────
    authorizer: (channel) => ({
      authorize: async (socketId, callback) => {
        try {
          console.log(`[echo] Auth request → ${channel.name}`);
          const response = await axios.post(
            '/broadcasting/auth',
            { socket_id: socketId, channel_name: channel.name },
            {
              baseURL: API_BASE,   // ensure it hits the Reverb auth endpoint
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
                'Content-Type': 'application/json',
              },
            }
          );
          console.log(`[echo] Auth SUCCESS for ${channel.name}`);
          callback(null, response.data);
        } catch (err) {
          console.error(`[echo] Auth FAILED for ${channel.name}:`, err?.response?.status, err?.response?.data || err.message);
          callback(err, null);
        }
      },
    }),
  };

  try {
    echoInstance = new Echo(options);
    console.log('[echo] Echo constructor succeeded');

    const pusher = echoInstance.connector?.pusher;
    if (pusher && pusher.connection) {
      pusher.connection.bind('state_change', (s) => {
        console.log(`[echo] Pusher state: ${s.previous} → ${s.current}`);
      });
      pusher.connection.bind('connected', () => {
        console.log('[echo] ✅ Pusher WebSocket CONNECTED');
      });
      pusher.connection.bind('disconnected', () => {
        console.warn('[echo] ⚠️ Pusher WebSocket DISCONNECTED');
      });
      pusher.connection.bind('error', (err) => {
        console.error('[echo] ❌ Pusher WebSocket ERROR:', err);
      });
      // Log every frame sent/received for full visibility
      pusher.connection.bind('message', (msg) => {
        console.log('[echo] Pusher message:', JSON.stringify(msg).slice(0, 250));
      });
      try { pusher.connect(); } catch (e) { console.warn('[echo] pusher.connect() threw:', e); }
    }

    return echoInstance;
  } catch (err) {
    console.warn('[echo] Echo/Pusher constructor threw:', err);
    return null;
  }
};

export const getEcho = () => echoInstance;











// // mobile/services/echo.js

// // import Echo from 'laravel-echo';
// // import Pusher from 'pusher-js';
// // import { getToken } from './auth-storage';

// // // ─── POLYFILLS for React Native ────────────────────────────

// // if (typeof window === 'undefined') {
// //   const mockDocument = {
// //     createElement: () => ({}),
// //     createElementNS: () => ({}),
// //     documentElement: { style: {} },
// //     head: { appendChild: () => {} },
// //     body: { appendChild: () => {} },
// //     addEventListener: () => {},
// //     removeEventListener: () => {},
// //     getElementById: () => null,
// //     querySelector: () => null,
// //     querySelectorAll: () => [],
// //     getElementsByTagName: () => ({ length: 0, item: () => null }),
// //     getElementsByClassName: () => [],
// //     getElementsByName: () => [],
// //     createEvent: () => ({ initEvent: () => {} }),
// //     createTextNode: () => ({}),
// //     implementation: {
// //       createHTMLDocument: () => mockDocument,
// //     },
// //   };

// //   const mockWindow = {
// //     document: mockDocument,
// //     navigator: {
// //       userAgent: 'react-native',
// //       platform: 'React Native',
// //     },
// //     addEventListener: () => {},
// //     removeEventListener: () => {},
// //     getComputedStyle: () => ({ getPropertyValue: () => '' }),
// //     matchMedia: () => ({ matches: false, addListener: () => {} }),
// //     localStorage: {
// //       getItem: () => null,
// //       setItem: () => {},
// //       removeItem: () => {},
// //       clear: () => {},
// //     },
// //     sessionStorage: {
// //       getItem: () => null,
// //       setItem: () => {},
// //       removeItem: () => {},
// //       clear: () => {},
// //     },
// //     location: {
// //       href: 'http://localhost',
// //       protocol: 'http:',
// //       host: 'localhost',
// //       hostname: 'localhost',
// //       port: '80',
// //       pathname: '/',
// //       search: '',
// //       hash: '',
// //     },
// //     history: {
// //       pushState: () => {},
// //       replaceState: () => {},
// //     },
// //     setTimeout: global.setTimeout,
// //     clearTimeout: global.clearTimeout,
// //     setInterval: global.setInterval,
// //     clearInterval: global.clearInterval,
// //     console: global.console,
// //   };

// //   global.window = mockWindow;
// //   global.document = mockWindow.document;
// //   global.navigator = mockWindow.navigator;
// // }

// // // MutationObserver polyfill (used by some libraries)
// // if (typeof MutationObserver === 'undefined') {
// //   global.MutationObserver = class {
// //     observe() {}
// //     disconnect() {}
// //     takeRecords() { return []; }
// //   };
// // }

// // // ─── Make Pusher globally available for Echo ──────────────
// // window.Pusher = Pusher;

// // // ─── Echo instance ──────────────────────────────────────────
// // let echoInstance = null;

// // export const initEcho = async () => {
// //   const token = await getToken();
// //   if (!token) {
// //     console.warn('No token – cannot initialise Echo');
// //     return null;
// //   }

 
// //   const HOST = '10.90.129.170';   
// //   const PORT = 8080;              // Reverb port
// //   const APP_KEY = '10.90.129.170'; // REVERB_APP_KEY from .env

// //   const options = {
// //     broadcaster: 'pusher',
// //     key: APP_KEY,
// //     wsHost: HOST,
// //     wsPort: PORT,
// //     wssPort: PORT,
// //     forceTLS: false,              // set to true if using HTTPS
// //     encrypted: true,
// //     enabledTransports: ['ws', 'wss'],
// //     authEndpoint: `http://${HOST}:8000/broadcasting/auth`,
// //     auth: {
// //       headers: {
// //         Authorization: `Bearer ${token}`,
// //         Accept: 'application/json',
// //       },
// //     },
// //   };

// //   echoInstance = new Echo(options);
// //   return echoInstance;
// // };

// // export const getEcho = () => echoInstance;



// // mobile/services/echo.js
// import Echo from 'laravel-echo';
// import Pusher from 'pusher-js';

// import { getToken } from './auth-storage';

// // ─── React Native polyfills (unchanged) ────────────────────────
// if (typeof window === 'undefined') {
//   const mockDocument = {
//     createElement: () => ({}),
//     createElementNS: () => ({}),
//     documentElement: { style: {} },
//     head: { appendChild: () => {} },
//     body: { appendChild: () => {} },
//     addEventListener: () => {},
//     removeEventListener: () => {},
//     getElementById: () => null,
//     querySelector: () => null,
//     querySelectorAll: () => [],
//     getElementsByTagName: () => ({ length: 0, item: () => null }),
//     getElementsByClassName: () => [],
//     getElementsByName: () => [],
//     createEvent: () => ({ initEvent: () => {} }),
//     createTextNode: () => ({}),
//     implementation: { createHTMLDocument: () => mockDocument },
//   };

//   const mockWindow = {
//     document: mockDocument,
//     navigator: { userAgent: 'react-native', platform: 'React Native' },
//     addEventListener: () => {},
//     removeEventListener: () => {},
//     getComputedStyle: () => ({ getPropertyValue: () => '' }),
//     matchMedia: () => ({ matches: false, addListener: () => {} }),
//     localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} },
//     sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} },
//     location: { href: 'http://localhost', protocol: 'http:', host: 'localhost', hostname: 'localhost', port: '80', pathname: '/', search: '', hash: '' },
//     history: { pushState: () => {}, replaceState: () => {} },
//     setTimeout: global.setTimeout,
//     clearTimeout: global.clearTimeout,
//     setInterval: global.setInterval,
//     clearInterval: global.clearInterval,
//     console: global.console,
//   };

//   global.window = mockWindow;
//   global.document = mockWindow.document;
//   global.navigator = mockWindow.navigator;
// }

// if (typeof MutationObserver === 'undefined') {
//   global.MutationObserver = class {
//     observe() {}
//     disconnect() {}
//     takeRecords() { return []; }
//   };
// }

// window.Pusher = Pusher;

// let echoInstance = null;

// // ─── Production endpoints ──────────────────────────────────────
// // Pull these from Expo's public env vars, or hardcode the
// // Railway values. They must match what your backend has.
// // const REVERB_KEY  = process.env.EXPO_PUBLIC_REVERB_APP_KEY  || 't34yzindehe8rurmywzi';
// // const REVERB_HOST = process.env.EXPO_PUBLIC_REVERB_HOST     || 'thisnorth-production-backend.up.railway.app';
// // const REVERB_PORT = Number(process.env.EXPO_PUBLIC_REVERB_PORT || 443);
// // const API_BASE    = process.env.EXPO_PUBLIC_API_URL || 'https://thisnorth-production-backend.up.railway.app';

// // const REVERB_HOST = process.env.EXPO_PUBLIC_REVERB_HOST || '10.90.129.170';
// // const REVERB_PORT = Number(process.env.EXPO_PUBLIC_REVERB_PORT || 8080);
// // const API_BASE    = process.env.EXPO_PUBLIC_API_URL || 'http://10.90.129.170:8000';

// const REVERB_KEY  = process.env.EXPO_PUBLIC_REVERB_APP_KEY  || 't34yzindehe8rurmywzi';
// const REVERB_HOST = process.env.EXPO_PUBLIC_REVERB_HOST     || 'thisnorth-production-backend.up.railway.app';
// const REVERB_PORT = Number(process.env.EXPO_PUBLIC_REVERB_PORT || 443);
// const REVERB_SCHEME = process.env.EXPO_PUBLIC_REVERB_SCHEME || 'https';   // ← NEW
// const API_BASE    = process.env.EXPO_PUBLIC_API_URL || 'https://thisnorth-production-backend.up.railway.app';

// export const initEcho = async () => {
//   const token = await getToken();
//   if (!token) {
//     console.warn('No token – cannot initialise Echo');
//     return null;
//   }

//   // const options = {
//   //   broadcaster: 'pusher',
//   //   key: REVERB_KEY,
//   //   cluster: 'mt1',                    // required by pusher-js even when self-hosting
//   //   wsHost: REVERB_HOST,
//   //   wsPort: REVERB_PORT,
//   //   wssPort: REVERB_PORT,
//   //   // forceTLS: true,                    // Railway is HTTPS
//   //   // forceTLS: false, 
//   //   forceTLS: !API_BASE.startsWith('http://'),  
//   //   encrypted: true,
//   //   enabledTransports: ['ws', 'wss'],
//   //   authEndpoint: `${API_BASE}/broadcasting/auth`,
//   //   auth: {
//   //     headers: {
//   //       Authorization: `Bearer ${token}`,
//   //       Accept: 'application/json',
//   //     },
//   //   },
//   // };


//     const options = {
//     broadcaster: 'pusher',
//     key: REVERB_KEY,
//     cluster: 'mt1',
//     wsHost: REVERB_HOST,
//     wsPort: REVERB_PORT,
//     wssPort: REVERB_PORT,
//     forceTLS: REVERB_SCHEME === 'https',
//     encrypted: REVERB_SCHEME === 'https',
//     enabledTransports: ['ws', 'wss'],
//     authEndpoint: `${API_BASE}/broadcasting/auth`,
//     auth: {
//       headers: {
//         Authorization: `Bearer ${token}`,
//         Accept: 'application/json',
//       },
//     },
//   };

//   echoInstance = new Echo(options);
//   return echoInstance;
// };

// export const getEcho = () => echoInstance;