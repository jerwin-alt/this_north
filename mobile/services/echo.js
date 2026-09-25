// mobile/services/echo.js

// import Echo from 'laravel-echo';
// import Pusher from 'pusher-js';
// import { getToken } from './auth-storage';

// // ─── POLYFILLS for React Native ────────────────────────────

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
//     implementation: {
//       createHTMLDocument: () => mockDocument,
//     },
//   };

//   const mockWindow = {
//     document: mockDocument,
//     navigator: {
//       userAgent: 'react-native',
//       platform: 'React Native',
//     },
//     addEventListener: () => {},
//     removeEventListener: () => {},
//     getComputedStyle: () => ({ getPropertyValue: () => '' }),
//     matchMedia: () => ({ matches: false, addListener: () => {} }),
//     localStorage: {
//       getItem: () => null,
//       setItem: () => {},
//       removeItem: () => {},
//       clear: () => {},
//     },
//     sessionStorage: {
//       getItem: () => null,
//       setItem: () => {},
//       removeItem: () => {},
//       clear: () => {},
//     },
//     location: {
//       href: 'http://localhost',
//       protocol: 'http:',
//       host: 'localhost',
//       hostname: 'localhost',
//       port: '80',
//       pathname: '/',
//       search: '',
//       hash: '',
//     },
//     history: {
//       pushState: () => {},
//       replaceState: () => {},
//     },
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

// // MutationObserver polyfill (used by some libraries)
// if (typeof MutationObserver === 'undefined') {
//   global.MutationObserver = class {
//     observe() {}
//     disconnect() {}
//     takeRecords() { return []; }
//   };
// }

// // ─── Make Pusher globally available for Echo ──────────────
// window.Pusher = Pusher;

// // ─── Echo instance ──────────────────────────────────────────
// let echoInstance = null;

// export const initEcho = async () => {
//   const token = await getToken();
//   if (!token) {
//     console.warn('No token – cannot initialise Echo');
//     return null;
//   }

 
//   const HOST = '10.90.129.170';   
//   const PORT = 8080;              // Reverb port
//   const APP_KEY = '10.90.129.170'; // REVERB_APP_KEY from .env

//   const options = {
//     broadcaster: 'pusher',
//     key: APP_KEY,
//     wsHost: HOST,
//     wsPort: PORT,
//     wssPort: PORT,
//     forceTLS: false,              // set to true if using HTTPS
//     encrypted: true,
//     enabledTransports: ['ws', 'wss'],
//     authEndpoint: `http://${HOST}:8000/broadcasting/auth`,
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



// mobile/services/echo.js
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { getToken } from './auth-storage';

// ─── React Native polyfills (unchanged) ────────────────────────
if (typeof window === 'undefined') {
  const mockDocument = {
    createElement: () => ({}),
    createElementNS: () => ({}),
    documentElement: { style: {} },
    head: { appendChild: () => {} },
    body: { appendChild: () => {} },
    addEventListener: () => {},
    removeEventListener: () => {},
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementsByTagName: () => ({ length: 0, item: () => null }),
    getElementsByClassName: () => [],
    getElementsByName: () => [],
    createEvent: () => ({ initEvent: () => {} }),
    createTextNode: () => ({}),
    implementation: { createHTMLDocument: () => mockDocument },
  };

  const mockWindow = {
    document: mockDocument,
    navigator: { userAgent: 'react-native', platform: 'React Native' },
    addEventListener: () => {},
    removeEventListener: () => {},
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    matchMedia: () => ({ matches: false, addListener: () => {} }),
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} },
    sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} },
    location: { href: 'http://localhost', protocol: 'http:', host: 'localhost', hostname: 'localhost', port: '80', pathname: '/', search: '', hash: '' },
    history: { pushState: () => {}, replaceState: () => {} },
    setTimeout: global.setTimeout,
    clearTimeout: global.clearTimeout,
    setInterval: global.setInterval,
    clearInterval: global.clearInterval,
    console: global.console,
  };

  global.window = mockWindow;
  global.document = mockWindow.document;
  global.navigator = mockWindow.navigator;
}

if (typeof MutationObserver === 'undefined') {
  global.MutationObserver = class {
    observe() {}
    disconnect() {}
    takeRecords() { return []; }
  };
}

window.Pusher = Pusher;

let echoInstance = null;

// ─── Production endpoints ──────────────────────────────────────
// Pull these from Expo's public env vars, or hardcode the
// Railway values. They must match what your backend has.
// const REVERB_KEY  = process.env.EXPO_PUBLIC_REVERB_APP_KEY  || 't34yzindehe8rurmywzi';
// const REVERB_HOST = process.env.EXPO_PUBLIC_REVERB_HOST     || 'thisnorth-production-backend.up.railway.app';
// const REVERB_PORT = Number(process.env.EXPO_PUBLIC_REVERB_PORT || 443);
// const API_BASE    = process.env.EXPO_PUBLIC_API_URL || 'https://thisnorth-production-backend.up.railway.app';

// const REVERB_HOST = process.env.EXPO_PUBLIC_REVERB_HOST || '10.90.129.170';
// const REVERB_PORT = Number(process.env.EXPO_PUBLIC_REVERB_PORT || 8080);
// const API_BASE    = process.env.EXPO_PUBLIC_API_URL || 'http://10.90.129.170:8000';

const REVERB_KEY  = process.env.EXPO_PUBLIC_REVERB_APP_KEY  || 't34yzindehe8rurmywzi';
const REVERB_HOST = process.env.EXPO_PUBLIC_REVERB_HOST     || 'thisnorth-production-backend.up.railway.app';
const REVERB_PORT = Number(process.env.EXPO_PUBLIC_REVERB_PORT || 443);
const REVERB_SCHEME = process.env.EXPO_PUBLIC_REVERB_SCHEME || 'https';   // ← NEW
const API_BASE    = process.env.EXPO_PUBLIC_API_URL || 'https://thisnorth-production-backend.up.railway.app';

export const initEcho = async () => {
  const token = await getToken();
  if (!token) {
    console.warn('No token – cannot initialise Echo');
    return null;
  }

  // const options = {
  //   broadcaster: 'pusher',
  //   key: REVERB_KEY,
  //   cluster: 'mt1',                    // required by pusher-js even when self-hosting
  //   wsHost: REVERB_HOST,
  //   wsPort: REVERB_PORT,
  //   wssPort: REVERB_PORT,
  //   // forceTLS: true,                    // Railway is HTTPS
  //   // forceTLS: false, 
  //   forceTLS: !API_BASE.startsWith('http://'),  
  //   encrypted: true,
  //   enabledTransports: ['ws', 'wss'],
  //   authEndpoint: `${API_BASE}/broadcasting/auth`,
  //   auth: {
  //     headers: {
  //       Authorization: `Bearer ${token}`,
  //       Accept: 'application/json',
  //     },
  //   },
  // };


    const options = {
    broadcaster: 'pusher',
    key: REVERB_KEY,
    cluster: 'mt1',
    wsHost: REVERB_HOST,
    wsPort: REVERB_PORT,
    wssPort: REVERB_PORT,
    forceTLS: REVERB_SCHEME === 'https',
    encrypted: REVERB_SCHEME === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: `${API_BASE}/broadcasting/auth`,
    auth: {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    },
  };

  echoInstance = new Echo(options);
  return echoInstance;
};

export const getEcho = () => echoInstance;