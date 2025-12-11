/**
 * Reservation System Types
 * For table booking with deposit payment (like Dineout India)
 */

// Hold Status - Temporary reservation for 10 minutes
export interface Hold {
  holdId: string;
  userId: string;
  restaurantId: string;
  restaurantName: string;
  restaurantImage: string;
  date: string;              // "2025-11-15"
  time: string;              // "19:00"
  partySize: number;
  status: 'held';
  depositAmount: number;     // Amount to pay (e.g., $20 per person)
  createdAt: number;         // Unix timestamp
  expiresAt: number;         // Unix timestamp (createdAt + 600 seconds)
}

// Confirmed Reservation
export interface Reservation {
  reservationId: string;
  userId: string;
  restaurantId: string;
  restaurantName: string;
  restaurantImage: string;
  restaurantCuisine: string[];
  restaurantAddress: string;
  date: string;
  time: string;
  partySize: number;
  status: ReservationStatus;
  confirmationCode: string;     // e.g., "FT-ABC123"
  depositAmount: number;        // Amount paid
  depositPaid: boolean;
  paymentMethod?: PaymentMethod;
  specialRequests?: string;
  createdAt: number;
  modifiedAt?: number;
  cancelledAt?: number;
}

export type ReservationStatus = 
  | 'confirmed'      // Deposit paid, reservation confirmed
  | 'pending'        // Hold created but not paid yet
  | 'modified'       // Reservation changed after confirmation
  | 'cancelled'      // User cancelled
  | 'completed'      // User showed up and dined
  | 'no-show';       // User didn't show up

// Time Slot Availability
export interface TimeSlot {
  time: string;              // "18:00", "18:30", "19:00"
  available: boolean;
  remainingCapacity: number;
  depositPerPerson: number;  // How much to pay per guest
}

// Payment Method for Deposit
export interface PaymentMethod {
  type: 'credit-card' | 'debit-card' | 'upi' | 'google-pay' | 'apple-pay';
  last4?: string;           // Last 4 digits of card
  cardBrand?: string;       // "Visa", "Mastercard", etc.
  upiId?: string;           // For UPI payments
  cardholderName?: string;  // Name on card
  expiryMonth?: string;     // Expiry month
  expiryYear?: string;      // Expiry year
}

// Restaurant with Reservation Capability
export interface RestaurantWithReservation {
  id: string;
  name: string;
  description: string;
  cuisine: string[];
  priceRange: string;
  rating: number;
  reviewCount: number;
  images: string[];
  location: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    latitude: number;
    longitude: number;
    distance?: number;      // Miles from user
  };
  reservationInfo: {
    acceptsReservations: boolean;
    depositPerPerson: number;     // e.g., $20 per person
    minimumPartySize: number;     // e.g., 2
    maximumPartySize: number;     // e.g., 20
    advanceBookingDays: number;   // How far in advance (e.g., 90 days)
    cancellationPolicy: string;   // "Free cancellation up to 24 hours before"
    averageDuration: number;      // Minutes (e.g., 120)
  };
  hours: {
    monday: DayHours;
    tuesday: DayHours;
    wednesday: DayHours;
    thursday: DayHours;
    friday: DayHours;
    saturday: DayHours;
    sunday: DayHours;
  };
  features: string[];
}

export interface DayHours {
  isOpen: boolean;
  openTime?: string;
  closeTime?: string;
}

// Discovery Card with Match Score
export interface DiscoveryCard {
  restaurant: RestaurantWithReservation;
  matchScore: number;        // 0-100
  matchReason: string;       // "Based on your love for Italian cuisine"
}

// API Request Types
export interface CreateHoldRequest {
  userId: string;
  restaurantId: string;
  date: string;
  time: string;
  partySize: number;
}

export interface ConfirmReservationRequest {
  holdId: string;
  userId: string;
  paymentMethod: PaymentMethod;
  specialRequests?: string;
}

export interface ModifyReservationRequest {
  date?: string;
  time?: string;
  partySize?: number;
  specialRequests?: string;
}

export interface CheckAvailabilityRequest {
  restaurantId: string;
  date: string;
  partySize: number;
}

// API Response Types
export interface AvailabilityResponse {
  restaurantId: string;
  date: string;
  partySize: number;
  slots: TimeSlot[];
  depositPerPerson: number;
  totalDeposit: number;      // depositPerPerson * partySize
}

export interface HoldResponse {
  hold: Hold;
  totalDeposit: number;
}

export interface ReservationResponse {
  reservation: Reservation;
  message: string;
}

// For reservation list display
export interface ReservationListItem {
  reservationId: string;
  restaurantId: string;
  restaurantName: string;
  restaurantImage: string;
  restaurantCuisine: string[];
  date: string;
  time: string;
  partySize: number;
  status: ReservationStatus;
  confirmationCode: string;
  depositAmount: number;
}

// For order/dining history display
export interface OrderHistoryItem {
  reservationId: string;
  restaurantId: string;
  restaurantName: string;
  restaurantImage: string;
  restaurantCuisine: string[];
  restaurantAddress?: string;
  date: string;
  time: string;
  partySize: number;
  status: 'completed' | 'cancelled' | 'no-show';
  confirmationCode: string;
  depositAmount: number;
  totalPaid?: number;          // Total amount paid (for completed)
  specialRequests?: string;
  completedAt?: number;        // Unix timestamp when completed
  cancelledAt?: number;        // Unix timestamp when cancelled
}
