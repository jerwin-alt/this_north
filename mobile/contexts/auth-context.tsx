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
}

interface LoginData {
  email: string;
  password: string;
}

interface RegisterData {
  first_name: string;
  last_name: string;
  phone: string;
  address: string;
  birth_date: string;
  verification_type: any;
  email: string;
  id_number: string;
  password: string;
  password_confirmation: string;
  image: string;
}

// ── Shape of the broadcast event ──
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

export const useAuth = create<AuthState>((set, get) => ({
  user: undefined,

  getUser: async () => {
    try {
      const token = await getToken();
      if (!token) {
        set({ user: null });
        return;
      }
      const { data } = await axios.get("/user");
      set({ user: data });
    } catch (error) {
      console.log("GET USER ERROR:", error);
      set({ user: null });
    }
  },

  login: async (data) => {
    try {
      const response = await axios.post("/login", data);
      await setToken(response.data.token);

      // Fetch the authenticated user
      await get().getUser();

      const user = get().user;
      if (user) {
        // Initialise Laravel Echo and subscribe to the private channel
        const echo = await initEcho();
        if (echo) {
          const channel = echo.private(`private-customer.${user.id}`);
          channel.listen('.order.status.updated', (event: OrderStatusEvent) => {
            // Add notification to the store – this will trigger the toast
            useNotificationStore.getState().addNotification(event);
          });
          console.log(`✅ Subscribed to private-customer.${user.id}`);
        }
      }
    } catch (error) {
      throw error;
    }
  },

  register: async (data) => {
    try {
      await axios.post("/register", data, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
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
    } catch (error) {
      console.log("LOGOUT ERROR:", error);
    }
  },
}));