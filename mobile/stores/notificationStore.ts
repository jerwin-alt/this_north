import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Notification {
  id: string;
  order_id: number;
  order_number: string;
  message: string;
  type: string;
  status?: string;
  extra?: any;
  created_at: string;
  read: boolean;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  lastClearedAt: string | null; // 👈 new field
  addNotification: (event: any) => void;
  markAsRead: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      lastClearedAt: null, // initial state

      addNotification: (event) => {
        const newNotif: Notification = {
          id: `${event.order_id}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          order_id: event.order_id,
          order_number: event.order_number,
          message: event.message,
          type: event.type,
          status: event.status,
          extra: event.extra,
          created_at: event.updated_at || new Date().toISOString(),
          read: false,
        };

        const state = get();

        // 1. Skip duplicates (same order + same message)
        const exists = state.notifications.some(
          (n) => n.order_id === event.order_id && n.message === event.message
        );
        if (exists) return;

        // 2. Skip if notification is older than last cleared timestamp
        if (
          state.lastClearedAt &&
          new Date(newNotif.created_at) <= new Date(state.lastClearedAt)
        ) {
          return; // ignore old notifications after clear
        }

        set((state) => ({
          notifications: [newNotif, ...state.notifications],
          unreadCount: state.unreadCount + 1,
        }));
      },

      markAsRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
          unreadCount: state.notifications.filter((n) => !n.read).length - 1,
        }));
      },

      clearAll: () => {
        set({
          notifications: [],
          unreadCount: 0,
          lastClearedAt: new Date().toISOString(), // record clear time
        });
      },
    }),
    {
      name: 'notifications-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);