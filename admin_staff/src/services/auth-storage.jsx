// Simple in-memory cache
let token = null;

// Set token (save to memory and localStorage)
export function setToken(newToken) {
  token = newToken;
  
  // Only run in browser environment
  if (typeof window !== 'undefined') {
    if (newToken) {
      window.localStorage.setItem('token', newToken);
    } else {
      window.localStorage.removeItem('token');
    }
  }
}

// Get token (from memory first, then localStorage)
export function getToken() {
  // Return from memory if available
  if (token) {
    return token;
  }
  
  // Try to get from localStorage (browser only)
  if (typeof window !== 'undefined') {
    token = window.localStorage.getItem('token');
  }
  
  return token;
}

// Remove token (clear from memory and localStorage)
export function removeToken() {
  token = null;
  
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem('token');
  }
}