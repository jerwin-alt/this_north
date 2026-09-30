// // mobile/contexts/auth-context.tsx




// mobile/contexts/auth-context.tsx

import axios from "@/api/axios";
import { getToken, setToken } from "@/services/auth-storage";
import { initEcho } from "@/services/echo";
import { useNotificationStore } from "@/stores/notificationStore";
import { create } from "zustand";

interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: string;
  signature_stamps: number;
  verification_type?: 'senior_citizen' | 'pwd' | null;         // ← ADD
  verification_status?: 'pending' | 'approved' | 'rejected';   // ← ADD
}

interface LoginData { email: string; password: string; }
interface RegisterData {
  first_name: string; last_name: string; phone: string; address: string;
  birth_date: string; verification_type: any; email: string;
  id_number: string; password: string; password_confirmation: string;
  image: string;
}

interface OrderStatusEvent {
  order_id: number;
  order_number: string;
  status: string;
  payment_status: string;
  message: string;
  type: string;
  extra?: any;
  updated_at: string;
}

interface AuthState {
  user: User | null | undefined;
  getUser: () => Promise<void>;
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<any>;
  logout: () => Promise<void>;
}

// ─────────────────────────────────────────────────────────────
// Echo subscription guard — prevents duplicate subscriptions
// when both getUser() and login() invoke connectEcho().
// ─────────────────────────────────────────────────────────────
let echoSubscribedUserId: number | null = null;

async function connectEcho(user: User) {
  try {
    if (!user) return;
    if (echoSubscribedUserId === user.id) {
      console.log(`[auth] Already subscribed as user ${user.id} — skipping`);
      return;
    }

    console.log(`[auth] Initialising Echo for user ${user.id}...`);
    const echo = await initEcho();
    if (!echo) {
      console.warn('[auth] initEcho returned null — Reverb will not connect');
      return;
    }

    // Channel name — must match backend's PrivateChannel('private-customer.<id>')
  const channelName = `private-customer.${user.id}`;
  const channel = echo.private(channelName);

  // Only log AFTER Pusher confirms the subscription
  channel.subscribed(() => {
    console.log(`✅ CHANNEL CONFIRMED: ${channelName}`);
  });

  channel.error((err: any) => {
    console.error(`❌ CHANNEL SUBSCRIPTION ERROR on ${channelName}:`, err);
  });

  channel.listen('.order.status.updated', (event: OrderStatusEvent) => {
    console.log('🔔 Event received from Reverb:', event);
    useNotificationStore.getState().addNotification(event);
  });

  echoSubscribedUserId = user.id;
  console.log(`[auth] Listen registered for ${channelName} (awaiting confirmation)`);

    echoSubscribedUserId = user.id;
    console.log(`✅ Subscribed to ${channelName}`);
  } catch (err) {
    // Never let Echo crash the login flow
    console.warn('[auth] connectEcho failed (non-fatal):', err);
  }
}

export const useAuth = create<AuthState>((set, get) => ({
  user: undefined,

  // ── Called on app start (existing session) AND after login ──
  getUser: async () => {
    try {
      const token = await getToken();
      if (!token) {
        set({ user: null });
        return;
      }
      const { data } = await axios.get("/user");
      set({ user: data });

      // ─── CRITICAL: initialise Echo here, not just in login() ───
      try {
        await connectEcho(data);
      } catch (echoErr) {
        console.warn("[auth] Echo init failed (auth still OK):", echoErr);
      }
    } catch (error) {
      console.log("GET USER ERROR:", error);
      set({ user: null });
    }
  },

  login: async (data) => {
    try {
      const response = await axios.post("/login", data);
      await setToken(response.data.token);

      // getUser() now also calls connectEcho()
      await get().getUser();
    } catch (error) {
      throw error;
    }
  },

  register: async (data) => {
    try {
      await axios.post("/register", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    } catch (error) {
      throw error;
    }
  },



  

  logout: async () => {
    try {
      await axios.post("/logout");
      await setToken(null);
      set({ user: null });
      echoSubscribedUserId = null;   // allow next user to subscribe
    } catch (error) {
      console.log("LOGOUT ERROR:", error);
    }
  },
}));











// import axios from "@/api/axios";
// import { getToken, setToken } from "@/services/auth-storage";
// import { initEcho } from "@/services/echo";
// import { useNotificationStore } from "@/stores/notificationStore";
// import { create } from "zustand";

// interface User {
//   id: number;
//   first_name: string;
//   last_name: string;
//   email: string;
//   phone: string;
//   role: string;
//   signature_stamps: number;
// }

// interface LoginData {
//   email: string;
//   password: string;
// }

// interface RegisterData {
//   first_name: string;
//   last_name: string;
//   phone: string;
//   address: string;
//   birth_date: string;
//   verification_type: any;
//   email: string;
//   id_number: string;
//   password: string;
//   password_confirmation: string;
//   image: string;
// }

// // ── Shape of the broadcast event ──
// interface OrderStatusEvent {
//   order_id: number;
//   order_number: string;
//   status: string;
//   payment_status: string;
//   message: string;
//   type: string;
//   extra?: any;
//   updated_at: string;
// }

// interface AuthState {
//   user: User | null | undefined;
//   getUser: () => Promise<void>;
//   login: (data: LoginData) => Promise<void>;
//   register: (data: RegisterData) => Promise<any>;
//   logout: () => Promise<void>;
// }





// export const useAuth = create<AuthState>((set, get) => ({
//   user: undefined,

//   getUser: async () => {
//     try {
//       const token = await getToken();
//       if (!token) {
//         set({ user: null });
//         return;
//       }
//       const { data } = await axios.get("/user");
//       set({ user: data });
//     } catch (error) {
//       console.log("GET USER ERROR:", error);
//       set({ user: null });
//     }
//   },

//   login: async (data) => {
//     try {
//       const response = await axios.post("/login", data);
//       await setToken(response.data.token);

//       // Fetch the authenticated user
//       await get().getUser();

//       const user = get().user;
//       if (user) {
//         // Initialise Laravel Echo and subscribe to the private channel
//         const echo = await initEcho();
//         if (echo) {
//           const channel = echo.private(`private-customer.${user.id}`);

//           // ─── LISTEN FOR ORDER STATUS UPDATES ──────────────────────────
//           // This callback runs whenever an event is broadcast to this customer's channel.
//           channel.listen('.order.status.updated', (event: OrderStatusEvent) => {
//             // ─── DEBUG LOG ──────────────────────────────────────────────
//             // This log confirms the event was received over WebSocket.
//             console.log('🔔 Event received from Reverb:', event);
//             // ──────────────────────────────────────────────────────────────

//             // Add notification to the store – this will trigger the toast and update the Alerts tab
//             useNotificationStore.getState().addNotification(event);
//           });

//           console.log(`✅ Subscribed to private-customer.${user.id}`);
//         }
//       }
//     } catch (error) {
//       throw error;
//     }
//   },

//   register: async (data) => {
//     try {
//       await axios.post("/register", data, {
//         headers: {
//           "Content-Type": "multipart/form-data",
//         },
//       });
//     } catch (error) {
//       throw error;
//     }
//   },

//   logout: async () => {
//     try {
//       await axios.post("/logout");
//       await setToken(null);
//       set({ user: null });
//     } catch (error) {
//       console.log("LOGOUT ERROR:", error);
//     }
//   },
// }));