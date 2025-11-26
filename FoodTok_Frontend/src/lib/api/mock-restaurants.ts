/**
 * Mock Restaurant APIs
 * For development until backend is ready
 */

import { RestaurantWithReservation, DiscoveryCard } from '@/types/reservation';

// Simulated network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock Restaurant Data
const MOCK_RESTAURANTS: RestaurantWithReservation[] = [
  {
    id: 'rest_001',
    name: 'Bella Notte',
    description: 'Authentic Italian cuisine with a modern twist. Family-owned since 1987, specializing in handmade pasta and wood-fired pizzas.',
    cuisine: ['Italian', 'Mediterranean'],
    priceRange: '$$',
    rating: 4.7,
    reviewCount: 342,
    images: [
      'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=800',
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
      'https://images.unsplash.com/photo-1544148103-0773bf10d330?w=800',
    ],
    location: {
      address: '234 Greenwich Ave',
      city: 'New York',
      state: 'NY',
      zipCode: '10011',
      latitude: 40.7359,
      longitude: -74.0014,
      distance: 0.8,
    },
    reservationInfo: {
      acceptsReservations: true,
      depositPerPerson: 25,
      minimumPartySize: 2,
      maximumPartySize: 12,
      advanceBookingDays: 60,
      cancellationPolicy: 'Free cancellation up to 24 hours before reservation. 50% refund within 24 hours.',
      averageDuration: 120,
    },
    hours: {
      monday: { isOpen: true, openTime: '17:00', closeTime: '22:00' },
      tuesday: { isOpen: true, openTime: '17:00', closeTime: '22:00' },
      wednesday: { isOpen: true, openTime: '17:00', closeTime: '22:00' },
      thursday: { isOpen: true, openTime: '17:00', closeTime: '23:00' },
      friday: { isOpen: true, openTime: '17:00', closeTime: '23:30' },
      saturday: { isOpen: true, openTime: '12:00', closeTime: '23:30' },
      sunday: { isOpen: true, openTime: '12:00', closeTime: '22:00' },
    },
    features: ['Outdoor Seating', 'Wine Bar', 'Romantic', 'Date Night', 'Private Dining'],
  },
  {
    id: 'rest_002',
    name: 'Sakura Omakase',
    description: 'Premium Japanese omakase experience. Chef Takeshi brings 20 years of Tokyo training to NYC.',
    cuisine: ['Japanese', 'Sushi'],
    priceRange: '$$$$',
    rating: 4.9,
    reviewCount: 187,
    images: [
      'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800',
      'https://images.unsplash.com/photo-1553621042-f6e147245754?w=800',
      'https://images.unsplash.com/photo-1559058922-4ebc3647da1b?w=800',
    ],
    location: {
      address: '89 E 42nd St',
      city: 'New York',
      state: 'NY',
      zipCode: '10017',
      latitude: 40.7527,
      longitude: -73.9772,
      distance: 2.3,
    },
    reservationInfo: {
      acceptsReservations: true,
      depositPerPerson: 50,
      minimumPartySize: 1,
      maximumPartySize: 8,
      advanceBookingDays: 90,
      cancellationPolicy: 'Full refund 48 hours before. 50% refund 24-48 hours. No refund within 24 hours.',
      averageDuration: 150,
    },
    hours: {
      monday: { isOpen: false },
      tuesday: { isOpen: true, openTime: '18:00', closeTime: '22:00' },
      wednesday: { isOpen: true, openTime: '18:00', closeTime: '22:00' },
      thursday: { isOpen: true, openTime: '18:00', closeTime: '22:00' },
      friday: { isOpen: true, openTime: '18:00', closeTime: '22:30' },
      saturday: { isOpen: true, openTime: '17:30', closeTime: '22:30' },
      sunday: { isOpen: true, openTime: '17:30', closeTime: '21:00' },
    },
    features: ['Omakase', 'Sake Selection', 'Chef\'s Counter', 'Intimate', 'Special Occasion'],
  },
  {
    id: 'rest_003',
    name: 'The Rooftop Garden',
    description: 'Farm-to-table dining with stunning skyline views. Our rooftop garden supplies fresh herbs and vegetables daily.',
    cuisine: ['American', 'Contemporary'],
    priceRange: '$$$',
    rating: 4.6,
    reviewCount: 521,
    images: [
      'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800',
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800',
      'https://images.unsplash.com/photo-1428515613728-6b4607e44363?w=800',
    ],
    location: {
      address: '567 W 23rd St',
      city: 'New York',
      state: 'NY',
      zipCode: '10011',
      latitude: 40.7471,
      longitude: -74.0063,
      distance: 1.5,
    },
    reservationInfo: {
      acceptsReservations: true,
      depositPerPerson: 30,
      minimumPartySize: 2,
      maximumPartySize: 20,
      advanceBookingDays: 60,
      cancellationPolicy: 'Free cancellation up to 12 hours before reservation.',
      averageDuration: 120,
    },
    hours: {
      monday: { isOpen: true, openTime: '11:30', closeTime: '22:00' },
      tuesday: { isOpen: true, openTime: '11:30', closeTime: '22:00' },
      wednesday: { isOpen: true, openTime: '11:30', closeTime: '22:00' },
      thursday: { isOpen: true, openTime: '11:30', closeTime: '23:00' },
      friday: { isOpen: true, openTime: '11:30', closeTime: '00:00' },
      saturday: { isOpen: true, openTime: '10:00', closeTime: '00:00' },
      sunday: { isOpen: true, openTime: '10:00', closeTime: '22:00' },
    },
    features: ['Rooftop Dining', 'City Views', 'Brunch', 'Cocktails', 'Pet Friendly'],
  },
  {
    id: 'rest_004',
    name: 'Spice Route',
    description: 'Modern Indian cuisine exploring flavors from Mumbai to Delhi. Award-winning chef Priya Sharma creates innovative dishes.',
    cuisine: ['Indian', 'Asian Fusion'],
    priceRange: '$$',
    rating: 4.8,
    reviewCount: 298,
    images: [
      'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800',
      'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800',
      'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=800',
    ],
    location: {
      address: '123 Lexington Ave',
      city: 'New York',
      state: 'NY',
      zipCode: '10016',
      latitude: 40.7433,
      longitude: -73.9815,
      distance: 1.2,
    },
    reservationInfo: {
      acceptsReservations: true,
      depositPerPerson: 20,
      minimumPartySize: 2,
      maximumPartySize: 15,
      advanceBookingDays: 45,
      cancellationPolicy: 'Free cancellation up to 6 hours before reservation.',
      averageDuration: 90,
    },
    hours: {
      monday: { isOpen: true, openTime: '11:30', closeTime: '22:00' },
      tuesday: { isOpen: true, openTime: '11:30', closeTime: '22:00' },
      wednesday: { isOpen: true, openTime: '11:30', closeTime: '22:00' },
      thursday: { isOpen: true, openTime: '11:30', closeTime: '22:30' },
      friday: { isOpen: true, openTime: '11:30', closeTime: '23:00' },
      saturday: { isOpen: true, openTime: '11:30', closeTime: '23:00' },
      sunday: { isOpen: true, openTime: '11:30', closeTime: '22:00' },
    },
    features: ['Vegetarian Options', 'Vegan Options', 'Spicy', 'Wine Pairing', 'Group Dining'],
  },
  {
    id: 'rest_005',
    name: 'Le Petit Bistro',
    description: 'Classic French bistro with Parisian charm. Cozy atmosphere, traditional dishes, and an extensive wine cellar.',
    cuisine: ['French', 'European'],
    priceRange: '$$$',
    rating: 4.5,
    reviewCount: 412,
    images: [
      'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=800',
      'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800',
      'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=800',
    ],
    location: {
      address: '456 Bleecker St',
      city: 'New York',
      state: 'NY',
      zipCode: '10014',
      latitude: 40.7357,
      longitude: -74.0023,
      distance: 0.5,
    },
    reservationInfo: {
      acceptsReservations: true,
      depositPerPerson: 35,
      minimumPartySize: 2,
      maximumPartySize: 10,
      advanceBookingDays: 60,
      cancellationPolicy: 'Free cancellation up to 24 hours before reservation.',
      averageDuration: 150,
    },
    hours: {
      monday: { isOpen: false },
      tuesday: { isOpen: true, openTime: '17:30', closeTime: '22:30' },
      wednesday: { isOpen: true, openTime: '17:30', closeTime: '22:30' },
      thursday: { isOpen: true, openTime: '17:30', closeTime: '22:30' },
      friday: { isOpen: true, openTime: '17:30', closeTime: '23:00' },
      saturday: { isOpen: true, openTime: '12:00', closeTime: '23:00' },
      sunday: { isOpen: true, openTime: '12:00', closeTime: '22:00' },
    },
    features: ['French Cuisine', 'Wine Cellar', 'Romantic', 'Cozy', 'Classic'],
  },
];

/**
 * Get restaurant discovery feed
 * Returns restaurants with match scores for swipe UI
 */
export async function getDiscoveryRestaurants(
  userId: string,
  limit: number = 20
): Promise<DiscoveryCard[]> {
  await delay(800); // Simulate network delay

  // Shuffle and slice to simulate personalized feed
  const shuffled = [...MOCK_RESTAURANTS].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(limit, MOCK_RESTAURANTS.length));

  return selected.map(restaurant => ({
    restaurant,
    matchScore: Math.floor(Math.random() * 15) + 85, // 85-100 match score
    matchReason: getMatchReason(restaurant.cuisine[0]),
  }));
}

/**
 * Get restaurant details by ID
 */
export async function getRestaurantById(
  restaurantId: string
): Promise<RestaurantWithReservation> {
  await delay(400);

  const restaurant = MOCK_RESTAURANTS.find(r => r.id === restaurantId);
  
  if (!restaurant) {
    throw new Error(`Restaurant with ID ${restaurantId} not found`);
  }

  return restaurant;
}

// Helper: Generate match reason based on cuisine
function getMatchReason(cuisine: string): string {
  const reasons = {
    Italian: "Based on your love for Italian cuisine",
    Japanese: "Perfect match for sushi lovers",
    American: "Trending in your area",
    Indian: "New restaurants you'll love",
    French: "Romantic spots near you",
  };
  return reasons[cuisine as keyof typeof reasons] || "Recommended for you";
}

/**
 * Search restaurants by various filters
 */
export async function searchRestaurants(params: {
  query?: string;
  cuisine?: string[];
  priceRange?: string[];
  features?: string[];
  minRating?: number;
}): Promise<RestaurantWithReservation[]> {
  await delay(600);

  let results = [...MOCK_RESTAURANTS];

  // Filter by search query
  if (params.query) {
    const q = params.query.toLowerCase();
    results = results.filter(r => 
      r.name.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.cuisine.some(c => c.toLowerCase().includes(q))
    );
  }

  // Filter by cuisine
  if (params.cuisine && params.cuisine.length > 0) {
    results = results.filter(r =>
      r.cuisine.some(c => params.cuisine!.includes(c))
    );
  }

  // Filter by price range
  if (params.priceRange && params.priceRange.length > 0) {
    results = results.filter(r => params.priceRange!.includes(r.priceRange));
  }

  // Filter by features
  if (params.features && params.features.length > 0) {
    results = results.filter(r =>
      params.features!.some(f => r.features.includes(f))
    );
  }

  // Filter by minimum rating
  if (params.minRating) {
    results = results.filter(r => r.rating >= params.minRating!);
  }

  return results;
}
