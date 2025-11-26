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
 * GET /api/stats/:userId
 */
export async function getUserStats(userId: string): Promise<UserStats> {
  return apiRequest(`/stats/${userId}`);
}
