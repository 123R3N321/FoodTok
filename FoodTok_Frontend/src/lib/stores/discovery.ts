/**
 * Discovery Store
 * Manages the discovery queue and swipe interactions
 */

import { create } from 'zustand';
import { DiscoveryCard, SwipeAction, Restaurant } from '@/types';
import { getDiscoveryRestaurants } from '@/lib/api';

interface DiscoveryState {
  queue: DiscoveryCard[];
  currentIndex: number;
  isLoading: boolean;
  error: string | null;
  swipeHistory: SwipeAction[];
  likedRestaurants: string[];
  passedRestaurants: string[];
}

interface DiscoveryActions {
  loadQueue: (userId?: string, preferences?: any) => Promise<void>;
  swipeCard: (direction: 'left' | 'right', restaurantId: string) => void;
  resetQueue: () => void;
  undoSwipe: () => void;
  getCurrentCard: () => DiscoveryCard | null;
  hasMoreCards: () => boolean;
  refillQueue: () => Promise<void>;
}

type DiscoveryStore = DiscoveryState & DiscoveryActions;

export const useDiscoveryStore = create<DiscoveryStore>((set, get) => ({
  // Initial state
  queue: [],
  currentIndex: 0,
  isLoading: false,
  error: null,
  swipeHistory: [],
  likedRestaurants: [],
  passedRestaurants: [],

  // Actions
  loadQueue: async (userId?: string, preferences?: any) => {
    set({ isLoading: true, error: null });
    
    try {
      console.log('🔄 Loading discovery queue with preferences:', preferences);
      console.log('📍 User location:', preferences?.location);
      console.log('🍽️ User cuisines:', preferences?.cuisineTypes);
      console.log('💰 User price range:', preferences?.priceRange);
      
      const response = await getDiscoveryRestaurants(
        userId || 'default',
        20, // Increased from 10 to 20 for more variety
        preferences
      );
      
      console.log('✅ Received', response.length, 'restaurants from Yelp');
      console.log('🎯 First restaurant:', response[0]?.restaurant?.name);
      console.log('📊 Match scores:', response.slice(0, 5).map(c => ({ name: c.restaurant.name, score: c.matchScore })));
      
      set({
        queue: response as any,
        currentIndex: 0,
        isLoading: false,
        error: null
      });
    } catch (error) {
      console.error('❌ Error loading queue:', error);
      set({
        error: 'Network error. Please try again.',
        isLoading: false
      });
    }
  },

  swipeCard: (direction: 'left' | 'right', restaurantId: string) => {
    const { currentIndex, queue, swipeHistory, likedRestaurants, passedRestaurants } = get();
    
    // Record the swipe action
    const swipeAction: SwipeAction = {
      direction,
      restaurantId,
      timestamp: new Date()
    };
    
    // Update lists based on swipe direction
    const newLikedRestaurants = direction === 'right' 
      ? [...likedRestaurants, restaurantId]
      : likedRestaurants;
    
    const newPassedRestaurants = direction === 'left'
      ? [...passedRestaurants, restaurantId]
      : passedRestaurants;
    
    set({
      currentIndex: currentIndex + 1,
      swipeHistory: [...swipeHistory, swipeAction],
      likedRestaurants: newLikedRestaurants,
      passedRestaurants: newPassedRestaurants
    });
    
    // Persist favorites to backend (fire and forget)
    if (direction === 'right') {
      import('../api').then(({ addFavorite }) => {
        const authStore = localStorage.getItem('foodtok-auth');
        if (authStore) {
          try {
            const { state } = JSON.parse(authStore);
            const userId = state?.user?.id;
            if (userId) {
              const card = queue[currentIndex];
              if (card) {
                addFavorite(
                  userId,
                  restaurantId,
                  card.restaurant.name,
                  card.matchScore,
                  card.restaurant.images?.[0] || ''
                ).catch((err: Error) => console.error('Failed to persist favorite:', err));
              }
            }
          } catch (e) {
            console.error('Error parsing auth store:', e);
          }
        }
      });
    }
    
    // If we're running low on cards, try to refill
    if (currentIndex + 2 >= queue.length) {
      get().refillQueue();
    }
  },

  resetQueue: () => {
    set({
      queue: [],
      currentIndex: 0,
      swipeHistory: [],
      likedRestaurants: [],
      passedRestaurants: [],
      error: null
    });
  },

  undoSwipe: () => {
    const { currentIndex, swipeHistory } = get();
    
    if (currentIndex > 0 && swipeHistory.length > 0) {
      const lastSwipe = swipeHistory[swipeHistory.length - 1];
      const newSwipeHistory = swipeHistory.slice(0, -1);
      
      // Remove from respective lists
      set(state => ({
        currentIndex: currentIndex - 1,
        swipeHistory: newSwipeHistory,
        likedRestaurants: state.likedRestaurants.filter(id => id !== lastSwipe.restaurantId),
        passedRestaurants: state.passedRestaurants.filter(id => id !== lastSwipe.restaurantId)
      }));
    }
  },

  getCurrentCard: () => {
    const { queue, currentIndex } = get();
    return queue[currentIndex] || null;
  },

  hasMoreCards: () => {
    const { queue, currentIndex } = get();
    return currentIndex < queue.length;
  },

  refillQueue: async () => {
    const { queue } = get();
    
    try {
      console.log('🔄 Refilling queue with more restaurants');
      
      // Get user from auth store
      const authStore = localStorage.getItem('foodtok-auth');
      let preferences = null;
      let userId = 'default';
      
      if (authStore) {
        try {
          const { state } = JSON.parse(authStore);
          userId = state?.user?.id || 'default';
          preferences = state?.user?.preferences;
          console.log('👤 Refilling for user:', userId);
          console.log('🎯 User preferences:', preferences);
        } catch (e) {
          console.error('Error parsing auth store:', e);
        }
      }
      
      const response = await getDiscoveryRestaurants(userId, 10, preferences);
      console.log('✅ Added', response.length, 'more restaurants');
      
      set({
        queue: [...queue, ...response] as any
      });
    } catch (error) {
      console.error('Failed to refill queue:', error);
    }
  }
}));