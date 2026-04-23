import { setToken } from "@/services/auth-storage";
import { create } from "zustand";
import axios from "../app/api/axios";

interface User {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  birth_date: string;
  address: string
  verification_type: string;
  verification_status: string;
  id_number: string;
  expires_at: string;
  is_active: boolean;
  is_walk_in_customer: boolean;
  role: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface RegisterData {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  password_confirmation: string
  phone: string;
  birth_date: string;
  address: string;
  verification_type: string;
  verification_status: string;
  id_number: string;
  expires_at: string;
  role: string;
}

interface AuthState {
  user: User | null;
  getUser: () => Promise<void>;
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,

  getUser: async () => {
    try {
      const { data } = await axios.get("/user");
      set({ user: data });
    } catch (error) {
      console.log(error);
    }
  },

  login: async (data) => {
    try {
      const response = await axios.post("/login", data);
      await setToken(response.data.token);
      get().getUser();
    } catch (error) {
      console.log(error);
    }
  },

  register: async (data) => {
    try {
      const response = await axios.post("/register", data);
      await setToken(response.data.token);
      get().getUser();
    } catch (error) {
      console.log(error);
    }
  },

  logout: async () => {
    try {
      await axios.post("/logout");
      await setToken(null);
      set({ user: null });
    } catch (error) {
      console.log(error);
    }
  },
}));