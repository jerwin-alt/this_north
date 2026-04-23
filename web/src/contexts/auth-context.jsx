import axios from "/api/axios";
import { setToken } from "/services/auth-storage";
import { create } from "zustand";

export const useAuth = create((set, get) => ({
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