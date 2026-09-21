// mobile/stores/customCakeStore.ts
import { create } from 'zustand';

export interface CustomCakeDraft {
  designId: number;
  quantity: number;
  sizeName: string;
  flavorName: string | null;
  frostingFlavor: string;
  specialInstructions: string;
  totalPrice: number;
}

interface CustomCakeState {
  draft: CustomCakeDraft | null;
  setDraft: (draft: CustomCakeDraft) => void;
  clearDraft: () => void;
}

export const useCustomCakeStore = create<CustomCakeState>((set) => ({
  draft: null,
  setDraft: (draft) => set({ draft }),
  clearDraft: () => set({ draft: null }),
}));