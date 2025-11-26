/**
 * App Store
 * General application state management
 */

import { create } from 'zustand';

interface AppState {
  isLoading: boolean;
  error: string | null;
  isOnboarding: boolean;
  theme: 'light' | 'dark' | 'system';
  notifications: Notification[];
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
}

interface AppActions {
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  setOnboarding: (isOnboarding: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

type AppStore = AppState & AppActions;

export const useAppStore = create<AppStore>((set, get) => ({
  // Initial state
  isLoading: false,
  error: null,
  isOnboarding: false,
  theme: 'system',
  notifications: [],

  // Actions
  setLoading: (isLoading: boolean) => {
    set({ isLoading });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  clearError: () => {
    set({ error: null });
  },

  setOnboarding: (isOnboarding: boolean) => {
    set({ isOnboarding });
  },

  setTheme: (theme: 'light' | 'dark' | 'system') => {
    set({ theme });
    
    // Apply theme to document
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      // System theme
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      if (mediaQuery.matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  },

  addNotification: (notificationData) => {
    const notification: Notification = {
      ...notificationData,
      id: Math.random().toString(36).substring(2),
      timestamp: new Date()
    };
    
    set(state => ({
      notifications: [...state.notifications, notification]
    }));

    // Auto-remove notification after 5 seconds
    setTimeout(() => {
      get().removeNotification(notification.id);
    }, 5000);
  },

  removeNotification: (id: string) => {
    set(state => ({
      notifications: state.notifications.filter(n => n.id !== id)
    }));
  },

  clearNotifications: () => {
    set({ notifications: [] });
  }
}));