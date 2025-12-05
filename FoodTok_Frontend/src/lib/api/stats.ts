/**
 * User Stats API Client
 */

import { apiRequest } from './index';

export interface UserStats {
  totalLikes: number;
  totalReservations: number;
  accountAge: number;
  topCuisines: string[];
  lastActive: string | null;
}

/**
 * Get user statistics
 * GET /api/stats/:userId or fallback to /api/auth/profile/:userId
 */
export async function getUserStats(userId: string): Promise<UserStats> {
  try {
    // Try the stats endpoint first
    return await apiRequest(`/stats/${userId}`);
  } catch (error) {
    console.warn('Stats endpoint not available, using fallback...');
    
    // Fallback: try to get from profile or use mock data
    try {
      const profile = await apiRequest(`/auth/profile/${userId}`);
      
      return {
        totalLikes: 0, // TODO: Backend should provide this
        totalReservations: 0, // TODO: Backend should provide this  
        accountAge: Math.floor((Date.now() - new Date(profile.createdAt || Date.now()).getTime()) / (1000 * 60 * 60 * 24)),
        topCuisines: profile.preferences?.cuisineTypes || [],
        lastActive: new Date().toISOString(),
      };
    } catch (profileError) {
      // Return mock data if both fail
      console.warn('Profile endpoint also failed, using mock stats');
      return {
        totalLikes: 0,
        totalReservations: 0,
        accountAge: 1,
        topCuisines: [],
        lastActive: new Date().toISOString(),
      };
    }
  }
}
