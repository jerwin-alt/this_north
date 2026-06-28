// mobile/services/echo.js

import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { getToken } from './auth-storage';

// ─── POLYFILLS for React Native ────────────────────────────

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
    implementation: {
      createHTMLDocument: () => mockDocument,
    },
  };

  const mockWindow = {
    document: mockDocument,
    navigator: {
      userAgent: 'react-native',
      platform: 'React Native',
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    matchMedia: () => ({ matches: false, addListener: () => {} }),
    localStorage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
    },
    sessionStorage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
    },
    location: {
      href: 'http://localhost',
      protocol: 'http:',
      host: 'localhost',
      hostname: 'localhost',
      port: '80',
      pathname: '/',
      search: '',
      hash: '',
    },
    history: {
      pushState: () => {},
      replaceState: () => {},
    },
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

// MutationObserver polyfill (used by some libraries)
if (typeof MutationObserver === 'undefined') {
  global.MutationObserver = class {
    observe() {}
    disconnect() {}
    takeRecords() { return []; }
  };
}

// ─── Make Pusher globally available for Echo ──────────────
window.Pusher = Pusher;

// ─── Echo instance ──────────────────────────────────────────
let echoInstance = null;

export const initEcho = async () => {
  const token = await getToken();
  if (!token) {
    console.warn('No token – cannot initialise Echo');
    return null;
  }

  // ⚙️ Replace with your actual backend IP and port
  const HOST = '10.130.48.170';   // your local IP
  const PORT = 8080;              // Reverb port
  const APP_KEY = '10.130.48.170'; // REVERB_APP_KEY from .env

  const options = {
    broadcaster: 'pusher',
    key: APP_KEY,
    wsHost: HOST,
    wsPort: PORT,
    wssPort: PORT,
    forceTLS: false,              // set to true if using HTTPS
    encrypted: true,
    enabledTransports: ['ws', 'wss'],
    authEndpoint: `http://${HOST}:8000/broadcasting/auth`,
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