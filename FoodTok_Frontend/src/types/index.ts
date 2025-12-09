/**
 * Core type definitions for the FoodTok application
 * This file contains all the TypeScript interfaces and types used throughout the app
 */

// User related types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImage?: string;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  cuisineTypes: Cuisine[]; // Changed from 'cuisines' to match backend
  dietaryRestrictions: DietaryRestriction[];
  priceRange: PriceRange;
  maxDistance: number; // in miles
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  favoriteRestaurants: string[]; // restaurant IDs
}

export type Cuisine = 
  | 'italian'
  | 'chinese'
  | 'japanese'
  | 'mexican'
  | 'indian'
  | 'thai'
  | 'french'
  | 'mediterranean'
  | 'american'
  | 'korean'
  | 'vietnamese'
  | 'greek'
  | 'middle-eastern'
  | 'spanish'
  | 'other';

export type DietaryRestriction = 
  | 'vegetarian'
  | 'vegan'
  | 'gluten-free'
  | 'dairy-free'
  | 'nut-free'
  | 'keto'
  | 'paleo'
  | 'halal'
  | 'kosher';

export type PriceRange = '$' | '$$' | '$$$' | '$$$$';

// Restaurant related types
export interface Restaurant {
  id: string;
  name: string;
  description: string;
  cuisine: Cuisine[];
  priceRange: PriceRange;
  rating: number;
  reviewCount: number;
  images: string[];
  location: Location;
  hours: OperatingHours;
  menu: MenuItem[];
  features: RestaurantFeature[];
  url?: string; // Yelp URL
  createdAt: Date;
  updatedAt: Date;
}

export interface Location {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
}

export interface OperatingHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

export interface DayHours {
  isOpen: boolean;
  openTime?: string; // HH:MM format
  closeTime?: string; // HH:MM format
}

export type RestaurantFeature = 
  | 'outdoor-seating'
  | 'delivery'
  | 'takeout'
  | 'reservations'
  | 'parking'
  | 'wifi'
  | 'pet-friendly'
  | 'wheelchair-accessible'
  | 'live-music'
  | 'full-bar'
  | 'happy-hour';

// Menu related types
export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: MenuCategory;
  image?: string;
  dietaryInfo: DietaryRestriction[];
  ingredients: string[];
  allergens: string[];
  isAvailable: boolean;
  preparationTime: number; // in minutes
}

export type MenuCategory = 
  | 'appetizers'
  | 'salads'
  | 'soups'
  | 'mains'
  | 'pasta'
  | 'pizza'
  | 'sandwiches'
  | 'burgers'
  | 'seafood'
  | 'desserts'
  | 'beverages'
  | 'alcohol'
  | 'specials';

// Review related types
export interface Review {
  id: string;
  userId: string;
  restaurantId: string;
  rating: number; // 1-5
  title: string;
  comment: string;
  images?: string[];
  visitDate: Date;
  createdAt: Date;
  helpful: number; // number of helpful votes
  reported: boolean;
}

// Cart and Order related types
export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  specialInstructions?: string;
  customizations?: Customization[];
}

export interface Customization {
  name: string;
  price: number;
  selected: boolean;
}

export interface Cart {
  restaurantId: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  deliveryFee: number;
  total: number;
  estimatedDeliveryTime: number; // in minutes
}

export interface Order {
  id: string;
  userId: string;
  restaurantId: string;
  items: CartItem[];
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  deliveryAddress: Location;
  subtotal: number;
  tax: number;
  deliveryFee: number;
  tip: number;
  total: number;
  estimatedDeliveryTime: number;
  actualDeliveryTime?: number;
  specialInstructions?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type OrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'out-for-delivery'
  | 'delivered'
  | 'cancelled';

export interface PaymentMethod {
  type: 'credit-card' | 'debit-card' | 'paypal' | 'apple-pay' | 'google-pay';
  last4?: string; // for card payments
  expiryMonth?: number;
  expiryYear?: number;
}

// Discovery Queue related types
export interface DiscoveryCard {
  restaurant: Restaurant;
  reason?: string; // AI-generated reason for recommendation
  matchScore: number; // 0-100 compatibility score
}

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

export interface SwipeAction {
  direction: SwipeDirection;
  restaurantId: string;
  timestamp: Date;
}

// App State types
export interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  cart: Cart | null;
  discoveryQueue: DiscoveryCard[];
  currentRestaurant: Restaurant | null;
  isLoading: boolean;
  error: string | null;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  totalPages: number;
  totalCount: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Form types for authentication and onboarding
export interface LoginForm {
  email: string;
  password: string;
}

export interface SignupForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface OnboardingForm {
  cuisineTypes: Cuisine[];
  dietaryRestrictions: DietaryRestriction[];
  priceRange: PriceRange;
  maxDistance: number;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
}

// Utility types
export type RequireField<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;