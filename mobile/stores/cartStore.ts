// mobile/stores/cartStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Helper to generate a unique ID (works in React Native)
const generateUniqueId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback: timestamp + random string
  return Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 6);
};

export interface CartItem {
  id: string; // guaranteed unique
  product: {
    id: number;
    name: string;
    description?: string;
    base_price: number;
    has_size_options: boolean;
    image_url?: string;
    drinkSizes?: { id: number; size_name: string; price_modifier: number }[];
    track_stock?: boolean;
    stock_quantity?: number;
  };
  quantity: number;
  sizeId?: number;
  sizeName?: string;
  sizePrice?: number;
  cakeSizeId?: number;
  cakeSizeName?: string;
  cakeSizePrice?: number;
  flavorId?: number;
  flavorName?: string;
  unitPrice: number;
}

interface CartState {
  carts: Record<string, CartItem[]>;   // userId -> items
  currentUserId: string | null;
  items: CartItem[];                  // items for current user (with unique ids)
  setUserId: (userId: string | null) => void;
  addItem: (userId: string, item: CartItem) => void;
  removeItem: (userId: string, index: number) => void;
  updateQuantity: (userId: string, index: number, quantity: number) => void;
  clearCart: (userId: string) => void;
  setItems: (userId: string, items: CartItem[]) => void;
}

// Helper to ensure all items have unique ids
const ensureUniqueIds = (items: CartItem[]): CartItem[] => {
  const idSet = new Set<string>();
  return items.map((item) => {
    // If missing id or duplicate, generate a new one
    if (!item.id || idSet.has(item.id)) {
      return { ...item, id: generateUniqueId() };
    }
    idSet.add(item.id);
    return item;
  });
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      carts: {},
      currentUserId: null,
      items: [],

      setUserId: (userId) => {
        if (userId) {
          let userCart = get().carts[userId] || [];
          // Migration: ensure each item has a unique id
          userCart = ensureUniqueIds(userCart);
          set({ currentUserId: userId, items: userCart });
          // If we changed the cart, update the persisted carts
          if (userCart.length !== (get().carts[userId] || []).length) {
            set((state) => ({
              carts: { ...state.carts, [userId]: userCart },
            }));
          }
        } else {
          set({ currentUserId: null, items: [] });
        }
      },

      addItem: (userId, item) => {
        if (userId !== get().currentUserId) return;
        // Ensure the item has a unique id before adding
        const itemWithId = { ...item, id: item.id || generateUniqueId() };
        set((state) => {
          const userCart = state.carts[userId] || [];
          const newCart = [...userCart, itemWithId];
          return {
            carts: { ...state.carts, [userId]: newCart },
            items: newCart,
          };
        });
      },

      removeItem: (userId, index) => {
        if (userId !== get().currentUserId) return;
        set((state) => {
          const userCart = state.carts[userId] || [];
          const newCart = userCart.filter((_, i) => i !== index);
          return {
            carts: { ...state.carts, [userId]: newCart },
            items: newCart,
          };
        });
      },

      updateQuantity: (userId, index, quantity) => {
        if (userId !== get().currentUserId) return;
        set((state) => {
          const userCart = state.carts[userId] || [];
          if (index < 0 || index >= userCart.length) return state;
          const updated = [...userCart];
          updated[index] = { ...updated[index], quantity };
          return {
            carts: { ...state.carts, [userId]: updated },
            items: updated,
          };
        });
      },

      clearCart: (userId) => {
        if (userId !== get().currentUserId) return;
        set((state) => {
          const newCarts = { ...state.carts };
          delete newCarts[userId];
          return { carts: newCarts, items: [] };
        });
      },

      setItems: (userId, items) => {
        if (userId !== get().currentUserId) return;
        // Ensure items have unique ids
        const uniqueItems = ensureUniqueIds(items);
        set((state) => ({
          carts: { ...state.carts, [userId]: uniqueItems },
          items: uniqueItems,
        }));
      },
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);