// mobile/stores/appStore.ts
import { create } from 'zustand';

interface AppState {
  refreshOrders: boolean;
  setRefreshOrders: (val: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  refreshOrders: false,
  setRefreshOrders: (val) => set({ refreshOrders: val }),
}));