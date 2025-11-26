/**
 * Authentication API Client
 * 
 * Real implementation with backend authentication endpoints
 * Note: Backend uses AWS Cognito for authentication
 * 
 * Endpoints:
 * - POST /api/auth/login      - User login
 * - POST /api/auth/signup     - User registration  
 * - PATCH /api/auth/preferences - Update user preferences
 * - GET /api/auth/profile/:id - Get user profile
 */

import { User, UserPreferences } from '@/types';
import { apiRequest } from './index';

/**
 * Login user with email and password
 * POST /api/auth/login
 */
export async function loginUser(
  email: string, 
  password: string
): Promise<{ success: boolean; data?: User; error?: string }> {
  try {
    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    return {
      success: true,
      data: response.user,
    };
  } catch (error: any) {
    console.error('Login error:', error);
    return {
      success: false,
      error: error?.message || 'Login failed. Please try again.',
    };
  }
}

/**
 * Register new user
 * POST /api/auth/signup
 */
export async function signupUser(
  userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }
): Promise<{ success: boolean; data?: User; error?: string }> {
  try {
    const response = await apiRequest('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    
    return {
      success: true,
      data: response.user,
    };
  } catch (error: any) {
    console.error('Signup error:', error);
    return {
      success: false,
      error: error?.message || 'Signup failed. Please try again.',
    };
  }
}

/**
 * Update user preferences
 * PATCH /api/auth/preferences
 */
export async function updateUserPreferences(
  userId: string,
  preferences: Partial<UserPreferences>
): Promise<{ success: boolean; data?: User; error?: string }> {
  try {
    const response = await apiRequest(`/auth/preferences`, {
      method: 'PATCH',
      body: JSON.stringify({ userId, preferences }),
    });
    
    return {
      success: true,
      data: response.user,
    };
  } catch (error: any) {
    console.error('Update preferences error:', error);
    return {
      success: false,
      error: error?.message || 'Failed to update preferences.',
    };
  }
}

/**
 * Get user profile
 * GET /api/auth/profile/:userId
 */
export async function getUserProfile(
  userId: string
): Promise<{ success: boolean; data?: User; error?: string }> {
  try {
    const response = await apiRequest(`/auth/profile/${userId}`);
    
    return {
      success: true,
      data: response.user,
    };
  } catch (error: any) {
    console.error('Get profile error:', error);
    return {
      success: false,
      error: error?.message || 'Failed to fetch profile.',
    };
  }
}
