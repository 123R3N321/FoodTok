/**
 * Yelp Fusion API Client
 * Handles communication with Yelp API for restaurant data
 */

import { Restaurant, Location, Cuisine, PriceRange, DiscoveryCard } from '@/types';

// API Configuration - Use Next.js API routes as proxy
const API_BASE = '/api/yelp';

// Default search location (New York City)
const DEFAULT_LOCATION = 'New York, NY';
const DEFAULT_LATITUDE = 40.7128;
const DEFAULT_LONGITUDE = -74.0060;

/**
 * Yelp API Response Types
 */
interface YelpBusiness {
  id: string;
  alias: string;
  name: string;
  image_url: string;
  is_closed: boolean;
  url: string;
  review_count: number;
  categories: Array<{ alias: string; title: string }>;
  rating: number;
  coordinates: { latitude: number; longitude: number };
  transactions: string[];
  price?: string;
  location: {
    address1: string;
    address2: string | null;
    address3: string | null;
    city: string;
    zip_code: string;
    country: string;
    state: string;
    display_address: string[];
  };
  phone: string;
  display_phone: string;
  distance: number;
}

interface YelpSearchResponse {
  businesses: YelpBusiness[];
  total: number;
  region: {
    center: { longitude: number; latitude: number };
  };
}

interface YelpBusinessDetail extends YelpBusiness {
  photos: string[];
  hours?: Array<{
    open: Array<{
      is_overnight: boolean;
      start: string;
      end: string;
      day: number;
    }>;
    hours_type: string;
    is_open_now: boolean;
  }>;
  special_hours?: any[];
}

/**
 * Map Yelp price string to app PriceRange
 */
function mapYelpPriceToRange(yelpPrice?: string): PriceRange {
  if (!yelpPrice) return '$$';
  switch (yelpPrice) {
    case '$':
      return '$';
    case '$$':
      return '$$';
    case '$$$':
      return '$$$';
    case '$$$$':
      return '$$$$';
    default:
      return '$$';
  }
}

/**
 * Map Yelp categories to app Cuisine types
 */
function mapYelpCategoriesToCuisines(categories: Array<{ alias: string; title: string }>): Cuisine[] {
  const cuisineMap: Record<string, Cuisine> = {
    italian: 'italian',
    chinese: 'chinese',
    japanese: 'japanese',
    sushi: 'japanese',
    mexican: 'mexican',
    indian: 'indian',
    thai: 'thai',
    french: 'french',
    mediterranean: 'mediterranean',
    american: 'american',
    newamerican: 'american',
    tradamerican: 'american',
    korean: 'korean',
    vietnamese: 'vietnamese',
    greek: 'greek',
    mideastern: 'middle-eastern',
    spanish: 'spanish',
  };

  const cuisines: Cuisine[] = [];
  categories.forEach(cat => {
    const cuisine = cuisineMap[cat.alias];
    if (cuisine && !cuisines.includes(cuisine)) {
      cuisines.push(cuisine);
    }
  });

  return cuisines.length > 0 ? cuisines : ['other'];
}

/**
 * Transform Yelp business to Restaurant type
 */
function transformYelpBusinessToRestaurant(business: YelpBusiness | YelpBusinessDetail): Restaurant {
  const location: Location = {
    address: business.location.address1 || '',
    city: business.location.city,
    state: business.location.state,
    zipCode: business.location.zip_code,
    latitude: business.coordinates.latitude,
    longitude: business.coordinates.longitude,
  };

  // Check if it's a detailed business with photos
  const hasPhotosArray = 'photos' in business && Array.isArray(business.photos) && business.photos.length > 0;
  const photos = hasPhotosArray ? business.photos : [business.image_url];
  const images = photos.filter(Boolean);
  
  console.log('🖼️ Yelp Images for', business.name, ':', {
    hasPhotosArray,
    rawPhotos: 'photos' in business ? business.photos : 'NO PHOTOS PROPERTY',
    image_url: business.image_url,
    photoCount: images.length,
    firstImage: images[0] || 'NONE',
    allImages: images
  });

  // Basic hours structure (simplified - Yelp hours need complex parsing)
  const hours = {
    monday: { isOpen: true, openTime: '11:00', closeTime: '22:00' },
    tuesday: { isOpen: true, openTime: '11:00', closeTime: '22:00' },
    wednesday: { isOpen: true, openTime: '11:00', closeTime: '22:00' },
    thursday: { isOpen: true, openTime: '11:00', closeTime: '22:00' },
    friday: { isOpen: true, openTime: '11:00', closeTime: '23:00' },
    saturday: { isOpen: true, openTime: '11:00', closeTime: '23:00' },
    sunday: { isOpen: true, openTime: '11:00', closeTime: '21:00' },
  };

  const restaurant: Restaurant = {
    id: business.id,
    name: business.name,
    description: `${business.categories.map(c => c.title).join(', ')} restaurant located in ${business.location.city}`,
    cuisine: mapYelpCategoriesToCuisines(business.categories),
    priceRange: mapYelpPriceToRange(business.price),
    rating: business.rating,
    reviewCount: business.review_count,
    images,
    location,
    hours,
    menu: [], // Yelp doesn't provide menu data - would need separate integration
    features: [], // Would need to parse from Yelp transactions/attributes
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return restaurant;
}

/**
 * Search for restaurants using Yelp Fusion API
 */
export async function searchYelpRestaurants(params: {
  location?: string;
  latitude?: number;
  longitude?: number;
  term?: string;
  categories?: string;
  price?: string; // '1,2,3,4' format
  limit?: number;
  offset?: number;
  radius?: number; // in meters (max 40000)
  sort_by?: 'best_match' | 'rating' | 'review_count' | 'distance';
}): Promise<{ restaurants: Restaurant[]; total: number }> {
  try {
    const searchParams = new URLSearchParams();

    // Location parameters
    if (params.latitude && params.longitude) {
      searchParams.append('latitude', params.latitude.toString());
      searchParams.append('longitude', params.longitude.toString());
    } else {
      searchParams.append('location', params.location || DEFAULT_LOCATION);
    }

    // Search parameters
    if (params.term) searchParams.append('term', params.term);
    if (params.categories) searchParams.append('categories', params.categories);
    if (params.price) searchParams.append('price', params.price);
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.offset) searchParams.append('offset', params.offset.toString());
    if (params.radius) searchParams.append('radius', params.radius.toString());
    if (params.sort_by) searchParams.append('sort_by', params.sort_by);

    const response = await fetch(
      `${API_BASE}/search?${searchParams.toString()}`
    );

    if (!response.ok) {
      throw new Error(`Yelp API error: ${response.status} ${response.statusText}`);
    }

    const data: YelpSearchResponse = await response.json();

    const restaurants = data.businesses.map(transformYelpBusinessToRestaurant);

    return {
      restaurants,
      total: data.total,
    };
  } catch (error) {
    console.error('Error fetching Yelp restaurants:', error);
    throw error;
  }
}

/**
 * Get detailed restaurant information from Yelp
 */
export async function getYelpRestaurantDetail(yelpId: string): Promise<Restaurant> {
  try {
    const response = await fetch(`${API_BASE}/business/${yelpId}`);

    if (!response.ok) {
      throw new Error(`Yelp API error: ${response.status} ${response.statusText}`);
    }

    const business: YelpBusinessDetail = await response.json();
    return transformYelpBusinessToRestaurant(business);
  } catch (error) {
    console.error('Error fetching Yelp restaurant detail:', error);
    throw error;
  }
}

/**
 * Get personalized discovery queue from Yelp
 * This combines Yelp search with user preferences for personalization
 */
export async function getYelpDiscoveryQueue(params: {
  userId?: string;
  cuisines?: Cuisine[];
  priceRange?: PriceRange;
  location?: string;
  latitude?: number;
  longitude?: number;
  limit?: number;
}): Promise<DiscoveryCard[]> {
  try {
    console.log('🎯 getYelpDiscoveryQueue called with params:', {
      userId: params.userId,
      cuisines: params.cuisines,
      priceRange: params.priceRange,
      location: params.location,
      latitude: params.latitude,
      longitude: params.longitude,
      limit: params.limit
    });
    
    // Map app cuisines to Yelp categories
    const categoryMap: Record<Cuisine, string> = {
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
      other: 'restaurants',
    };

    // Convert cuisines to Yelp categories
    let categories = '';
    if (params.cuisines && params.cuisines.length > 0) {
      categories = params.cuisines
        .map(c => categoryMap[c] || 'restaurants')
        .join(',');
    } else {
      // If no cuisines specified, use general 'restaurants' category
      categories = 'restaurants';
    }

    // Convert price range to Yelp format (1,2,3,4)
    let price = '';
    if (params.priceRange) {
      const priceMap: Record<PriceRange, string> = {
        '$': '1',
        '$$': '1,2',
        '$$$': '2,3',
        '$$$$': '3,4',
      };
      price = priceMap[params.priceRange] || '1,2';
    }

    // Add randomization - use different offset on each call
    const randomOffset = Math.floor(Math.random() * 50); // Random offset 0-49
    
    console.log('🔍 Searching Yelp with:', {
      location: params.location,
      categories,
      price,
      offset: randomOffset,
      limit: params.limit || 20
    });

    const { restaurants } = await searchYelpRestaurants({
      location: params.location,
      latitude: params.latitude,
      longitude: params.longitude,
      categories,
      price,
      limit: (params.limit || 20) + 10, // Fetch extra for variety
      offset: randomOffset, // Add randomization
      sort_by: 'best_match',
    });

    console.log('✅ Yelp returned', restaurants.length, 'restaurants');

    // Transform to DiscoveryCard format with match scores
    const discoveryCards: DiscoveryCard[] = restaurants.map(restaurant => {
      // Calculate match score based on preferences
      let matchScore = 50; // Base score

      // Boost for cuisine match
      if (params.cuisines && params.cuisines.length > 0) {
        const hasMatchingCuisine = restaurant.cuisine.some(c => 
          params.cuisines!.includes(c)
        );
        if (hasMatchingCuisine) {
          matchScore += 25; // Increased from 20
        }
      }

      // Boost for price range match
      if (params.priceRange && restaurant.priceRange === params.priceRange) {
        matchScore += 15;
      }

      // Boost for high rating
      if (restaurant.rating >= 4.5) matchScore += 10;
      else if (restaurant.rating >= 4.0) matchScore += 5;
      
      // Bonus for review count (more popular)
      if (restaurant.reviewCount > 500) matchScore += 5;
      else if (restaurant.reviewCount > 200) matchScore += 3;

      // Cap at 100
      matchScore = Math.min(matchScore, 100);

      // Generate match reason
      const reasons: string[] = [];
      if (params.cuisines?.some(c => restaurant.cuisine.includes(c))) {
        reasons.push(`Matches your ${restaurant.cuisine[0]} preference`);
      }
      if (restaurant.rating >= 4.5) {
        reasons.push(`Highly rated (${restaurant.rating}★)`);
      }
      if (restaurant.priceRange === params.priceRange) {
        reasons.push(`${restaurant.priceRange} pricing matches your preference`);
      }
      if (restaurant.reviewCount > 500) {
        reasons.push(`Very popular (${restaurant.reviewCount} reviews)`);
      }

      const reason = reasons.join(' • ') || 'Popular in your area';

      return {
        restaurant,
        matchScore,
        reason,
      };
    });

    // Sort by match score descending
    discoveryCards.sort((a, b) => b.matchScore - a.matchScore);

    // Add some randomness within similar match scores
    // Shuffle restaurants with similar scores (within 5 points)
    const shuffledCards: DiscoveryCard[] = [];
    let i = 0;
    while (i < discoveryCards.length) {
      const currentScore = discoveryCards[i].matchScore;
      const similarScoreCards: DiscoveryCard[] = [];
      
      // Collect all cards with similar scores
      while (i < discoveryCards.length && 
             Math.abs(discoveryCards[i].matchScore - currentScore) <= 5) {
        similarScoreCards.push(discoveryCards[i]);
        i++;
      }
      
      // Shuffle this group
      for (let j = similarScoreCards.length - 1; j > 0; j--) {
        const k = Math.floor(Math.random() * (j + 1));
        [similarScoreCards[j], similarScoreCards[k]] = [similarScoreCards[k], similarScoreCards[j]];
      }
      
      shuffledCards.push(...similarScoreCards);
    }

    // Return requested limit
    const finalCards = shuffledCards.slice(0, params.limit || 20);
    
    console.log('🎉 Returning', finalCards.length, 'restaurants');
    console.log('📊 Score distribution:', {
      highest: finalCards[0]?.matchScore,
      lowest: finalCards[finalCards.length - 1]?.matchScore,
      average: Math.round(finalCards.reduce((sum, c) => sum + c.matchScore, 0) / finalCards.length)
    });
    
    return finalCards;
  } catch (error) {
    console.error('Error fetching Yelp discovery queue:', error);
    throw error;
  }
}

/**
 * Search restaurants near a specific location
 */
export async function searchNearby(
  latitude: number,
  longitude: number,
  radius: number = 5000, // 5km default
  limit: number = 20
): Promise<Restaurant[]> {
  const { restaurants } = await searchYelpRestaurants({
    latitude,
    longitude,
    radius,
    limit,
    sort_by: 'distance',
  });
  return restaurants;
}

/**
 * Get top-rated restaurants in an area
 */
export async function getTopRatedRestaurants(
  location: string = DEFAULT_LOCATION,
  limit: number = 20
): Promise<Restaurant[]> {
  const { restaurants } = await searchYelpRestaurants({
    location,
    limit,
    sort_by: 'rating',
  });
  return restaurants;
}
