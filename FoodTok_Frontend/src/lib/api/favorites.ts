/**
 * Favorites API
 * Real implementation using Django backend
 */

import { apiRequest } from './index';

export interface Favorite {
  userId: string;
  restaurantId: string;
  restaurantName: string;
  restaurantImage?: string;
  matchScore: number;
  likedAt: string;
}

/**
 * Add a restaurant to favorites
 */
export async function addFavorite(
  userId: string,
  restaurantId: string,
  restaurantName: string,
  matchScore: number,
  restaurantImage?: string
): Promise<{ success: boolean; favorite: Favorite }> {
  console.log('💖 Adding favorite:', { userId, restaurantId, restaurantName });
  
  const response = await apiRequest<{ success: boolean; favorite: Favorite }>('/favorites', {
    method: 'POST',
    body: JSON.stringify({
      userId,
      restaurantId,
      restaurantName,
      restaurantImage: restaurantImage || '',
      matchScore
    })
  });
  
  console.log('✅ Favorite added:', response);
  return response;
}

/**
 * Get all favorites for a user
 */
export async function getUserFavorites(userId: string, limit: number = 50): Promise<Favorite[]> {
  console.log('📋 Fetching favorites for user:', userId);
  
  const favorites = await apiRequest<Favorite[]>(`/favorites/${userId}?limit=${limit}`, {
    method: 'GET'
  });
  
  console.log('✅ Fetched', favorites.length, 'favorites');
  return favorites;
}

/**
 * Remove a restaurant from favorites
 */
export async function removeFavorite(
  userId: string,
  restaurantId: string
): Promise<{ success: boolean; message: string }> {
  console.log('💔 Removing favorite:', { userId, restaurantId });
  
  const response = await apiRequest<{ success: boolean; message: string }>(
    `/favorites?userId=${userId}&restaurantId=${restaurantId}`,
    {
      method: 'DELETE'
    }
  );
  
  console.log('✅ Favorite removed:', response);
  return response;
}

/**
 * Check if a restaurant is favorited
 */
export async function checkFavorite(
  userId: string,
  restaurantId: string
): Promise<boolean> {
  try {
    const response = await apiRequest<{ isFavorite: boolean }>(
      `/favorites/check?userId=${userId}&restaurantId=${restaurantId}`,
      {
        method: 'GET'
      }
    );
    
    return response.isFavorite;
  } catch (error) {
    console.error('Error checking favorite:', error);
    return false;
  }
}
