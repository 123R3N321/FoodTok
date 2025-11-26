/**
 * Mock Authentication API
 * Used for development when backend is not available
 */

import { User, UserPreferences } from '@/types';

// Simulated delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Mock login - accepts any email with password "password123"
 */
export async function loginUser(
  email: string,
  password: string
): Promise<{ success: boolean; data?: User; error?: string }> {
  await delay(500);
  
  if (password === 'password123') {
    return {
      success: true,
      data: {
        id: 'user_001',
        email,
        firstName: 'Demo',
        lastName: 'User',
        preferences: {
          cuisineTypes: ['italian', 'japanese', 'mexican'],
          dietaryRestrictions: [],
          priceRange: '$$',
          maxDistance: 10,
          location: {
            latitude: 40.7128,
            longitude: -74.0060,
            address: 'New York, NY'
          },
          favoriteRestaurants: [],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      } as User,
    };
  }
  
  return {
    success: false,
    error: 'Invalid credentials. Try password: password123',
  };
}

/**
 * Mock signup - always succeeds
 */
export async function signupUser(userData: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}): Promise<{ success: boolean; data?: User; error?: string }> {
  await delay(500);
  
  return {
    success: true,
    data: {
      id: 'user_' + Date.now(),
      ...userData,
      preferences: {
        cuisineTypes: [],
        dietaryRestrictions: [],
        priceRange: '$$',
        maxDistance: 10,
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          address: 'New York, NY'
        },
        favoriteRestaurants: [],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as User,
  };
}

/**
 * Mock update preferences - merges with stored user
 */
export async function updateUserPreferences(
  userId: string,
  preferences: Partial<UserPreferences> & { cuisines?: any } // Temporary compatibility
): Promise<{ success: boolean; data?: User; error?: string }> {
  await delay(300);
  
  // Get stored user from localStorage
  const storedAuth = localStorage.getItem('foodtok-auth');
  if (storedAuth) {
    try {
      const authState = JSON.parse(storedAuth);
      const currentUser = authState.state?.user;
      
      if (currentUser && currentUser.id === userId) {
        const updatedUser: User = {
          ...currentUser,
          preferences: {
            ...currentUser.preferences,
            ...preferences,
          },
          updatedAt: new Date(),
        };
        
        return {
          success: true,
          data: updatedUser,
        };
      }
    } catch (error) {
      console.error('Error parsing stored auth:', error);
    }
  }
  
  // Fallback
  return {
    success: true,
    data: {
      id: userId,
      email: 'demo@example.com',
      firstName: 'Demo',
      lastName: 'User',
      preferences: {
        cuisineTypes: preferences.cuisineTypes || preferences.cuisines || [],
        dietaryRestrictions: preferences.dietaryRestrictions || [],
        priceRange: preferences.priceRange || '$$',
        maxDistance: preferences.maxDistance || 10,
        location: preferences.location || {
          latitude: 40.7128,
          longitude: -74.0060,
          address: 'New York, NY'
        },
        favoriteRestaurants: [],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as User,
  };
}

/**
 * Mock get user profile
 */
export async function getUserProfile(
  userId: string
): Promise<{ success: boolean; data?: User; error?: string }> {
  await delay(300);
  
  // Try to get from localStorage
  const storedAuth = localStorage.getItem('foodtok-auth');
  if (storedAuth) {
    try {
      const authState = JSON.parse(storedAuth);
      const currentUser = authState.state?.user;
      
      if (currentUser && currentUser.id === userId) {
        return {
          success: true,
          data: currentUser,
        };
      }
    } catch (error) {
      console.error('Error parsing stored auth:', error);
    }
  }
  
  // Fallback
  return {
    success: true,
    data: {
      id: userId,
      email: 'demo@example.com',
      firstName: 'Demo',
      lastName: 'User',
      preferences: {
        cuisineTypes: [],
        dietaryRestrictions: [],
        priceRange: '$$' as const,
        maxDistance: 10,
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          address: 'New York, NY'
        },
        favoriteRestaurants: [],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as User,
  };
}
