/**
 * FoodTok API Client
 * 
 * Central API entry point - Switch between mock, Yelp, and backend APIs
 * 
 * DATA SOURCES:
 * - MOCK: Simulated data for development
 * - YELP: Real restaurant data from Yelp Fusion API
 * - BACKEND: Custom Django backend (when ready)
 * 
 * Set NEXT_PUBLIC_RESTAURANT_SOURCE in .env.local:
 * - 'mock' - Use mock data
 * - 'yelp' - Use Yelp API (default)
 * - 'backend' - Use Django backend
 */

// ============================================================================
// API IMPLEMENTATION IMPORTS
// ============================================================================
import * as MockReservations from './mock-reservations';
import * as MockRestaurants from './mock-restaurants';
import * as MockAuth from './mock-auth';

// Real API implementations
import * as RealReservations from './reservations';
import * as RealRestaurants from './restaurants';
import * as RealAuth from './auth';

// ============================================================================
// DATA SOURCE CONFIGURATION
// ============================================================================
const restaurantSource = process.env.NEXT_PUBLIC_RESTAURANT_SOURCE || 'yelp';
const useMocks = process.env.NEXT_PUBLIC_USE_MOCKS !== 'false';

// Determine which API implementations to use
const useYelpRestaurants = restaurantSource === 'yelp';
const useMockRestaurants = restaurantSource === 'mock';
const useBackendRestaurants = restaurantSource === 'backend';

// Auth and reservations use mock by default, real when USE_MOCKS=false
const useMocksForAuth = useMocks;
const useMocksForReservations = useMocks;

// ============================================================================
// EXPORTED API FUNCTIONS
// ============================================================================

// Auth (mock or real backend with Cognito)
export const loginUser = useMocksForAuth ? MockAuth.loginUser : RealAuth.loginUser;
export const signupUser = useMocksForAuth ? MockAuth.signupUser : RealAuth.signupUser;
export const updateUserPreferences = useMocksForAuth ? MockAuth.updateUserPreferences : RealAuth.updateUserPreferences;
export const getUserProfile = useMocksForAuth ? MockAuth.getUserProfile : RealAuth.getUserProfile;

// Reservations (mock or real backend)
export const checkAvailability = useMocksForReservations ? MockReservations.checkAvailability : RealReservations.checkAvailability;
export const createHold = useMocksForReservations ? MockReservations.createHold : RealReservations.createHold;
export const getUserActiveHold = useMocksForReservations ? MockReservations.getUserActiveHold : RealReservations.getUserActiveHold;
export const confirmReservation = useMocksForReservations ? MockReservations.confirmReservation : RealReservations.confirmReservation;
export const getUserReservations = useMocksForReservations ? MockReservations.getUserReservations : RealReservations.getUserReservations;
export const getReservationById = useMocksForReservations ? MockReservations.getReservationById : RealReservations.getReservationById;
export const modifyReservation = useMocksForReservations ? MockReservations.modifyReservation : RealReservations.modifyReservation;
export const cancelReservation = useMocksForReservations ? MockReservations.cancelReservation : RealReservations.cancelReservation;

// Restaurants (mock, Yelp, or backend)
export const getDiscoveryRestaurants = useMockRestaurants 
  ? MockRestaurants.getDiscoveryRestaurants 
  : RealRestaurants.getDiscoveryRestaurants;

export const getRestaurantById = useMockRestaurants 
  ? MockRestaurants.getRestaurantById 
  : RealRestaurants.getRestaurantById;

export const searchRestaurants = useMockRestaurants 
  ? MockRestaurants.searchRestaurants 
  : RealRestaurants.searchRestaurants;

// Favorites (always use real backend)
export { addFavorite, getUserFavorites, removeFavorite, checkFavorite } from './favorites';

// Stats (always use real backend)
export { getUserStats } from './stats';
export type { UserStats } from './stats';

// ============================================================================
// API Configuration
// ============================================================================
export const API_CONFIG = {
  // Set in .env.local: NEXT_PUBLIC_API_URL=http://localhost:8080/api
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api',
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
};

/**
 * Helper function for API calls (when you build real APIs)
 * 
 * Usage:
 * const data = await apiRequest('/reservations/hold', {
 *   method: 'POST',
 *   body: { userId, restaurantId, date, time }
 * });
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_CONFIG.baseURL}${endpoint}`;
  
  const config: RequestInit = {
    ...options,
    headers: {
      ...API_CONFIG.headers,
      ...options.headers,
    },
  };

  // Add auth token if available
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }

  console.log('🚀 API Request:', {
    url,
    method: config.method,
    headers: config.headers,
    body: options.body
  });

  const response = await fetch(url, config);

  console.log('📥 API Response:', {
    status: response.status,
    statusText: response.statusText,
    url: response.url
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ API Error Response:', errorText);
    
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { message: errorText || 'API request failed' };
    }
    
    throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
  }

  // Handle empty responses (like 204 No Content or empty 200)
  const responseText = await response.text();
  if (!responseText || responseText.trim() === '') {
    console.log('✅ API Success: Empty response');
    return {} as T;
  }
  
  try {
    const data = JSON.parse(responseText);
    console.log('✅ API Success:', data);
    return data;
  } catch (error) {
    console.error('❌ Failed to parse JSON:', responseText);
    throw new Error('Invalid JSON response from server');
  }
}
