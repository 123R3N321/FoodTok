/**
 * Real Restaurant API Client with Yelp Integration
 * 
 * This file now uses Yelp Fusion API to fetch real restaurant data
 * Combined with user preferences for personalized recommendations
 */

import { 
  getYelpDiscoveryQueue, 
  getYelpRestaurantDetail,
  searchYelpRestaurants
} from './yelp';
import { RestaurantWithReservation, DiscoveryCard } from '@/types/reservation';
import { Restaurant, Cuisine, PriceRange } from '@/types';

/**
 * Helper function to add reservation info to a restaurant
 */
function addReservationInfo(restaurant: Restaurant): RestaurantWithReservation {
  return {
    ...restaurant,
    rating: restaurant.rating,
    reservationInfo: {
      acceptsReservations: true,
      depositPerPerson: 25,
      minimumPartySize: 2,
      maximumPartySize: 12,
      advanceBookingDays: 60,
      cancellationPolicy: 'Free cancellation up to 24 hours before reservation',
      averageDuration: 120,
    },
  };
}

/**
 * Get personalized discovery feed using Yelp API
 * Combines Yelp data with user preferences for personalization
 */
export async function getDiscoveryRestaurants(
  userId: string,
  limit: number = 20,
  userPreferences?: any
): Promise<DiscoveryCard[]> {
  try {
    // Use user preferences if provided, otherwise use defaults
    const cuisines: Cuisine[] = userPreferences?.cuisineTypes || ['italian', 'japanese', 'mexican', 'american'];
    const priceRange: PriceRange = userPreferences?.priceRange || '$$';
    const location = userPreferences?.location?.address || 'New York, NY';
    const latitude = userPreferences?.location?.latitude || 40.7128;
    const longitude = userPreferences?.location?.longitude || -74.0060;
    
    // Fetch from Yelp with user preferences
    const discoveryCards = await getYelpDiscoveryQueue({
      userId,
      cuisines,
      priceRange,
      location,
      latitude,
      longitude,
      limit,
    });

    // Transform to match DiscoveryCard type with reservation info
    return discoveryCards.map(card => ({
      restaurant: addReservationInfo(card.restaurant),
      matchScore: card.matchScore,
      matchReason: card.reason || 'Recommended for you',
    }));
  } catch (error) {
    console.error('Error fetching Yelp discovery:', error);
    throw error;
  }
}

/**
 * Get detailed restaurant information from Yelp
 */
export async function getRestaurantById(
  restaurantId: string
): Promise<RestaurantWithReservation> {
  try {
    const restaurant = await getYelpRestaurantDetail(restaurantId);
    return addReservationInfo(restaurant);
  } catch (error) {
    console.error('Error fetching Yelp restaurant detail:', error);
    throw error;
  }
}

/**
 * Search restaurants with filters using Yelp API
 */
export async function searchRestaurants(filters: {
  cuisine?: string[];
  priceRange?: string;
  rating?: number;
  distance?: number;
  query?: string;
}): Promise<RestaurantWithReservation[]> {
  try {
    // Map app cuisines to Yelp categories
    const categoryMap: Record<string, string> = {
      italian: 'italian',
      chinese: 'chinese',
      japanese: 'japanese',
      mexican: 'mexican',
      indian: 'indpak',
      thai: 'thai',
      french: 'french',
      mediterranean: 'mediterranean',
      american: 'newamerican',
      korean: 'korean',
      vietnamese: 'vietnamese',
      greek: 'greek',
      'middle-eastern': 'mideastern',
      spanish: 'spanish',
    };

    // Convert cuisines to Yelp categories
    let categories = '';
    if (filters.cuisine && filters.cuisine.length > 0) {
      categories = filters.cuisine
        .map(c => categoryMap[c] || 'restaurants')
        .join(',');
    }

    // Convert price range to Yelp format
    let price = '';
    if (filters.priceRange) {
      const priceMap: Record<string, string> = {
        '$': '1',
        '$$': '1,2',
        '$$$': '2,3',
        '$$$$': '3,4',
      };
      price = priceMap[filters.priceRange] || '1,2';
    }

    // Calculate radius from distance (convert miles to meters)
    const radius = filters.distance ? Math.min(filters.distance * 1609, 40000) : undefined;

    const { restaurants } = await searchYelpRestaurants({
      location: 'New York, NY',
      term: filters.query,
      categories,
      price,
      radius,
      limit: 50,
      sort_by: 'best_match',
    });

    // Filter by rating if specified
    let filtered = restaurants;
    if (filters.rating) {
      filtered = filtered.filter(r => r.rating >= filters.rating!);
    }

    // Add reservation info to each restaurant
    return filtered.map(addReservationInfo);
  } catch (error) {
    console.error('Error searching Yelp restaurants:', error);
    throw error;
  }
}
