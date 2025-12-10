/**
 * Mock Reservation APIs - PRODUCTION-READY
 * For development until backend is ready
 * 
 * Handles:
 * - Race conditions (multiple users booking same table)
 * - Idempotency (prevent duplicate bookings)
 * - Inventory management (track table capacity)
 * - Automatic hold expiry (10-minute timer with DynamoDB TTL simulation)
 */

import {
  Hold,
  Reservation,
  TimeSlot,
  AvailabilityResponse,
  HoldResponse,
  ReservationResponse,
  CheckAvailabilityRequest,
  CreateHoldRequest,
  ConfirmReservationRequest,
  ModifyReservationRequest,
  ReservationListItem,
  OrderHistoryItem,
  PaymentMethod,
} from '@/types/reservation';

// Simulated network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// In-memory storage (simulates DynamoDB)
const MOCK_HOLDS = new Map<string, Hold>();
const MOCK_RESERVATIONS = new Map<string, Reservation>();

// ============================================================================
// CRITICAL: INVENTORY MANAGEMENT & RACE CONDITION PREVENTION
// ============================================================================

/**
 * Restaurant capacity tracking
 * In real backend: This would be DynamoDB with conditional writes
 */
interface RestaurantCapacity {
  restaurantId: string;
  date: string;
  timeSlots: Map<string, SlotCapacity>; // e.g., "19:00" -> capacity
}

interface SlotCapacity {
  totalTables: number;
  availableTables: number;
  holds: Set<string>;           // Active hold IDs
  reservations: Set<string>;    // Confirmed reservation IDs
  lastUpdated: number;
}

// Simulates DynamoDB table for inventory
const CAPACITY_TRACKER = new Map<string, RestaurantCapacity>();

/**
 * Lock mechanism to prevent race conditions
 * In real backend: Use DynamoDB conditional writes or Redis distributed locks
 */
const SLOT_LOCKS = new Map<string, boolean>();

async function acquireLock(lockKey: string, timeoutMs: number = 5000): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    if (!SLOT_LOCKS.get(lockKey)) {
      SLOT_LOCKS.set(lockKey, true);
      return true;
    }
    await delay(50); // Wait 50ms and retry
  }
  
  return false; // Timeout
}

function releaseLock(lockKey: string): void {
  SLOT_LOCKS.delete(lockKey);
}

/**
 * Initialize capacity for a restaurant on a specific date
 */
function initializeCapacity(restaurantId: string, date: string): void {
  const key = `${restaurantId}:${date}`;
  
  if (CAPACITY_TRACKER.has(key)) return;
  
  const capacity: RestaurantCapacity = {
    restaurantId,
    date,
    timeSlots: new Map(),
  };
  
  // Initialize slots from 11:00 AM to 10:00 PM
  for (let hour = 11; hour < 22; hour++) {
    for (let minute of [0, 30]) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      
      // Each slot has 10 tables (adjust per restaurant)
      capacity.timeSlots.set(time, {
        totalTables: 10,
        availableTables: 10,
        holds: new Set(),
        reservations: new Set(),
        lastUpdated: Date.now(),
      });
    }
  }
  
  CAPACITY_TRACKER.set(key, capacity);
}

/**
 * Get available capacity for a specific slot
 * CRITICAL: This must be accurate to prevent overbooking
 */
function getSlotCapacity(restaurantId: string, date: string, time: string): SlotCapacity | null {
  const key = `${restaurantId}:${date}`;
  const capacity = CAPACITY_TRACKER.get(key);
  
  if (!capacity) {
    initializeCapacity(restaurantId, date);
    return getSlotCapacity(restaurantId, date, time);
  }
  
  return capacity.timeSlots.get(time) || null;
}

/**
 * Reserve a table slot (creates hold or reservation)
 * Returns true if successful, false if fully booked
 */
function reserveSlot(
  restaurantId: string,
  date: string,
  time: string,
  holdOrReservationId: string,
  isHold: boolean
): boolean {
  const capacity = getSlotCapacity(restaurantId, date, time);
  
  if (!capacity) return false;
  
  // Check if already reserved by this ID (idempotency)
  if (capacity.holds.has(holdOrReservationId) || capacity.reservations.has(holdOrReservationId)) {
    return true; // Already reserved
  }
  
  // Check availability
  if (capacity.availableTables <= 0) {
    return false; // Fully booked
  }
  
  // Reserve the slot
  capacity.availableTables--;
  
  if (isHold) {
    capacity.holds.add(holdOrReservationId);
  } else {
    capacity.reservations.add(holdOrReservationId);
  }
  
  capacity.lastUpdated = Date.now();
  
  return true;
}

/**
 * Release a table slot (when hold expires or reservation is cancelled)
 */
function releaseSlot(
  restaurantId: string,
  date: string,
  time: string,
  holdOrReservationId: string
): void {
  const capacity = getSlotCapacity(restaurantId, date, time);
  
  if (!capacity) return;
  
  // Remove from holds or reservations
  const wasHold = capacity.holds.delete(holdOrReservationId);
  const wasReservation = capacity.reservations.delete(holdOrReservationId);
  
  if (wasHold || wasReservation) {
    capacity.availableTables++;
    capacity.lastUpdated = Date.now();
  }
}

/**
 * Convert hold to reservation (when payment completes)
 */
function convertHoldToReservation(
  restaurantId: string,
  date: string,
  time: string,
  holdId: string,
  reservationId: string
): boolean {
  const capacity = getSlotCapacity(restaurantId, date, time);
  
  if (!capacity) return false;
  
  // Check if hold exists
  if (!capacity.holds.has(holdId)) {
    return false; // Hold not found or expired
  }
  
  // Convert: remove from holds, add to reservations
  capacity.holds.delete(holdId);
  capacity.reservations.add(reservationId);
  capacity.lastUpdated = Date.now();
  
  return true;
}

// Generate random ID
const generateId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Generate confirmation code
const generateConfirmationCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'FT-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// ============================================================================
// PUBLIC API FUNCTIONS
// ============================================================================

/**
 * Check availability for a specific date and party size
 * Returns REAL-TIME available time slots with accurate capacity
 */
export async function checkAvailability(
  request: CheckAvailabilityRequest
): Promise<AvailabilityResponse> {
  await delay(600);

  const { restaurantId, date, partySize } = request;

  // Initialize capacity tracking for this restaurant/date
  initializeCapacity(restaurantId, date);

  // Get real-time availability
  const slots: TimeSlot[] = generateTimeSlots(restaurantId, date, partySize);

  // NYC pricing: $25 per person deposit
  const depositPerPerson = 25;
  const totalDeposit = depositPerPerson * partySize;

  return {
    restaurantId,
    date,
    partySize,
    slots,
    depositPerPerson,
    totalDeposit,
  };
}

/**
 * Create a hold (10-minute temporary reservation)
 * CRITICAL: Handles race conditions with distributed locking
 * No payment required at this stage
 */
export async function createHold(
  request: CreateHoldRequest
): Promise<HoldResponse> {
  await delay(500);

  const { userId, restaurantId, date, time, partySize } = request;

  // IDEMPOTENCY CHECK: User can only have ONE active hold at a time
  const existingHold = Array.from(MOCK_HOLDS.values()).find(
    h => h.userId === userId && h.status === 'held' && h.expiresAt > Date.now()
  );

  if (existingHold) {
    throw new Error('You already have an active reservation in progress. Please complete or cancel it first.');
  }

  // DISTRIBUTED LOCK: Prevent race conditions
  const lockKey = `${restaurantId}:${date}:${time}`;
  const lockAcquired = await acquireLock(lockKey);
  
  if (!lockAcquired) {
    throw new Error('This time slot is currently being reserved by another user. Please try again or select a different time.');
  }

  try {
    // Check real-time availability
    const capacity = getSlotCapacity(restaurantId, date, time);
    
    if (!capacity || capacity.availableTables <= 0) {
      throw new Error('Sorry, this time slot just got fully booked. Please select another time.');
    }

    // Create hold ID
    const holdId = generateId('hold');

    // ATOMIC OPERATION: Reserve the slot
    const reserved = reserveSlot(restaurantId, date, time, holdId, true);
    
    if (!reserved) {
      throw new Error('Sorry, this time slot is no longer available. Please select another time.');
    }

    // Get restaurant details
    const restaurantName = getRestaurantName(restaurantId);
    const restaurantImage = getRestaurantImage(restaurantId);
    const depositPerPerson = 25;

    const now = Date.now();
    const hold: Hold = {
      holdId,
      userId,
      restaurantId,
      restaurantName,
      restaurantImage,
      date,
      time,
      partySize,
      status: 'held',
      depositAmount: depositPerPerson * partySize,
      createdAt: now,
      expiresAt: now + (10 * 60 * 1000), // 10 minutes from now
    };

    MOCK_HOLDS.set(hold.holdId, hold);

    // AUTO-EXPIRY: Simulate DynamoDB TTL
    // After 10 minutes: delete hold AND release table capacity
    setTimeout(() => {
      const expiredHold = MOCK_HOLDS.get(holdId);
      if (expiredHold && expiredHold.status === 'held') {
        // Release the table back to inventory
        releaseSlot(restaurantId, date, time, holdId);
        MOCK_HOLDS.delete(holdId);
        console.log(`[HOLD EXPIRED] ${holdId} - Table released back to inventory`);
      }
    }, 10 * 60 * 1000);

    return {
      hold,
      totalDeposit: hold.depositAmount,
    };
    
  } finally {
    // ALWAYS release the lock
    releaseLock(lockKey);
  }
}

/**
 * Confirm reservation by paying deposit
 * CRITICAL: Converts hold to confirmed reservation atomically
 * Handles payment failures and race conditions
 */
export async function confirmReservation(
  request: ConfirmReservationRequest
): Promise<ReservationResponse> {
  await delay(1200); // Simulate payment processing

  const { holdId, userId, paymentMethod, specialRequests } = request;

  // DISTRIBUTED LOCK: Prevent double confirmation
  const lockKey = `confirm:${holdId}`;
  const lockAcquired = await acquireLock(lockKey);
  
  if (!lockAcquired) {
    throw new Error('This reservation is currently being processed. Please wait...');
  }

  try {
    // Get hold
    const hold = MOCK_HOLDS.get(holdId);
    if (!hold) {
      throw new Error('Hold not found or has expired. Please create a new reservation.');
    }

    // IDEMPOTENCY: Check if already confirmed
    const existingReservation = Array.from(MOCK_RESERVATIONS.values()).find(
      r => r.userId === userId && 
           r.restaurantId === hold.restaurantId && 
           r.date === hold.date && 
           r.time === hold.time &&
           ['confirmed', 'modified'].includes(r.status)
    );

    if (existingReservation) {
      // Already confirmed - return existing reservation (idempotent)
      return {
        reservation: existingReservation,
        message: `Reservation already confirmed! Your table is reserved. Confirmation code: ${existingReservation.confirmationCode}`,
      };
    }

    // Verify hold belongs to user
    if (hold.userId !== userId) {
      throw new Error('This hold does not belong to you.');
    }

    // Check if hold has expired
    if (hold.expiresAt < Date.now()) {
      // Release the table back to inventory
      releaseSlot(hold.restaurantId, hold.date, hold.time, holdId);
      MOCK_HOLDS.delete(holdId);
      throw new Error('Your hold has expired. The table has been released. Please create a new reservation.');
    }

    // PAYMENT PROCESSING: Simulate Stripe/payment gateway
    const paymentSuccess = await simulatePayment(hold.depositAmount, paymentMethod);
    if (!paymentSuccess) {
      throw new Error('Payment failed. Please check your payment method and try again.');
    }

    // Create confirmed reservation
    const reservationId = generateId('res');
    const reservation: Reservation = {
      reservationId,
      userId: hold.userId,
      restaurantId: hold.restaurantId,
      restaurantName: hold.restaurantName,
      restaurantImage: hold.restaurantImage,
      restaurantCuisine: getRestaurantCuisine(hold.restaurantId),
      restaurantAddress: getRestaurantAddress(hold.restaurantId),
      date: hold.date,
      time: hold.time,
      partySize: hold.partySize,
      status: 'confirmed',
      confirmationCode: generateConfirmationCode(),
      depositAmount: hold.depositAmount,
      depositPaid: true,
      paymentMethod,
      specialRequests,
      createdAt: Date.now(),
    };

    // ATOMIC OPERATION: Convert hold to reservation in inventory
    const converted = convertHoldToReservation(
      hold.restaurantId,
      hold.date,
      hold.time,
      holdId,
      reservationId
    );

    if (!converted) {
      // This should never happen if we have proper locking, but handle it
      throw new Error('Failed to confirm reservation. The hold may have expired. Please try again.');
    }

    // Save reservation
    MOCK_RESERVATIONS.set(reservation.reservationId, reservation);

    // Delete the hold
    MOCK_HOLDS.delete(holdId);

    return {
      reservation,
      message: `Reservation confirmed! Your table for ${hold.partySize} guests is reserved on ${formatDate(hold.date)} at ${hold.time}. Show confirmation code ${reservation.confirmationCode} at ${hold.restaurantName}.`,
    };
    
  } finally {
    // ALWAYS release the lock
    releaseLock(lockKey);
  }
}

/**
 * Get user's active hold (if any)
 */
export async function getUserActiveHold(userId: string): Promise<Hold | null> {
  await delay(300);

  const hold = Array.from(MOCK_HOLDS.values()).find(
    h => h.userId === userId && h.status === 'held' && h.expiresAt > Date.now()
  );

  return hold || null;
}

/**
 * Cancel a hold manually (before it expires)
 * Releases table back to inventory immediately
 */
export async function cancelHold(holdId: string, userId: string): Promise<void> {
  await delay(300);

  const hold = MOCK_HOLDS.get(holdId);
  if (!hold) {
    throw new Error('Hold not found.');
  }

  if (hold.userId !== userId) {
    throw new Error('This hold does not belong to you.');
  }

  // Release the table back to inventory
  releaseSlot(hold.restaurantId, hold.date, hold.time, holdId);
  
  // Delete hold
  MOCK_HOLDS.delete(holdId);
  
  console.log(`[HOLD CANCELLED] ${holdId} - Table released back to inventory`);
}

/**
 * Get user's reservations
 */
export async function getUserReservations(
  userId: string,
  filter?: 'upcoming' | 'past' | 'all'
): Promise<ReservationListItem[]> {
  await delay(500);

  let reservations = Array.from(MOCK_RESERVATIONS.values()).filter(
    r => r.userId === userId
  );

  // Filter by date
  const today = new Date().toISOString().split('T')[0];
  
  if (filter === 'upcoming') {
    reservations = reservations.filter(r => 
      r.date >= today && ['confirmed', 'modified'].includes(r.status)
    );
  } else if (filter === 'past') {
    reservations = reservations.filter(r =>
      r.date < today || ['completed', 'no-show', 'cancelled'].includes(r.status)
    );
  }

  // Sort by date (newest first for past, soonest first for upcoming)
  reservations.sort((a, b) => {
    const dateA = new Date(`${a.date} ${a.time}`).getTime();
    const dateB = new Date(`${b.date} ${b.time}`).getTime();
    return filter === 'past' ? dateB - dateA : dateA - dateB;
  });

  return reservations.map(r => ({
    reservationId: r.reservationId,
    restaurantName: r.restaurantName,
    restaurantImage: r.restaurantImage,
    restaurantCuisine: r.restaurantCuisine,
    date: r.date,
    time: r.time,
    partySize: r.partySize,
    status: r.status,
    confirmationCode: r.confirmationCode,
    depositAmount: r.depositAmount,
  }));
}

/**
 * Get reservation details by ID
 */
export async function getReservationById(
  reservationId: string,
  userId: string
): Promise<Reservation> {
  await delay(300);

  const reservation = MOCK_RESERVATIONS.get(reservationId);
  if (!reservation) {
    throw new Error('Reservation not found.');
  }

  if (reservation.userId !== userId) {
    throw new Error('This reservation does not belong to you.');
  }

  return reservation;
}

/**
 * Modify an existing reservation
 */
export async function modifyReservation(
  reservationId: string,
  userId: string,
  changes: ModifyReservationRequest
): Promise<ReservationResponse> {
  await delay(800);

  const reservation = MOCK_RESERVATIONS.get(reservationId);
  if (!reservation) {
    throw new Error('Reservation not found.');
  }

  if (reservation.userId !== userId) {
    throw new Error('This reservation does not belong to you.');
  }

  if (!['confirmed', 'modified'].includes(reservation.status)) {
    throw new Error('Only confirmed reservations can be modified.');
  }

  // Check if modification is allowed (e.g., not too close to reservation time)
  const reservationDateTime = new Date(`${reservation.date} ${reservation.time}`);
  const hoursUntilReservation = (reservationDateTime.getTime() - Date.now()) / (1000 * 60 * 60);
  
  if (hoursUntilReservation < 4) {
    throw new Error('Cannot modify reservation less than 4 hours before reservation time. Please contact the restaurant directly.');
  }

  // Apply changes
  const updatedReservation: Reservation = {
    ...reservation,
    date: changes.date || reservation.date,
    time: changes.time || reservation.time,
    partySize: changes.partySize || reservation.partySize,
    specialRequests: changes.specialRequests || reservation.specialRequests,
    status: 'modified',
    modifiedAt: Date.now(),
  };

  MOCK_RESERVATIONS.set(reservationId, updatedReservation);

  return {
    reservation: updatedReservation,
    message: 'Reservation updated successfully!',
  };
}

/**
 * Cancel a reservation with refund calculation
 * Releases table back to inventory
 */
export async function cancelReservation(
  reservationId: string,
  userId: string
): Promise<{ refundAmount: number; message: string }> {
  await delay(600);

  const reservation = MOCK_RESERVATIONS.get(reservationId);
  if (!reservation) {
    throw new Error('Reservation not found.');
  }

  if (reservation.userId !== userId) {
    throw new Error('This reservation does not belong to you.');
  }

  if (!['confirmed', 'modified'].includes(reservation.status)) {
    throw new Error('This reservation cannot be cancelled.');
  }

  // Calculate refund based on cancellation policy
  const reservationDateTime = new Date(`${reservation.date} ${reservation.time}`);
  const hoursUntilReservation = (reservationDateTime.getTime() - Date.now()) / (1000 * 60 * 60);
  
  let refundAmount = 0;
  let refundMessage = '';

  if (hoursUntilReservation >= 24) {
    // Full refund
    refundAmount = reservation.depositAmount;
    refundMessage = 'Full refund of $' + refundAmount + ' will be processed within 5-7 business days.';
  } else if (hoursUntilReservation >= 4) {
    // 50% refund
    refundAmount = reservation.depositAmount * 0.5;
    refundMessage = '50% refund of $' + refundAmount + ' will be processed within 5-7 business days.';
  } else {
    // No refund
    refundAmount = 0;
    refundMessage = 'No refund available for cancellations within 4 hours of reservation.';
  }

  // Update reservation status
  const cancelledReservation: Reservation = {
    ...reservation,
    status: 'cancelled',
    cancelledAt: Date.now(),
  };

  MOCK_RESERVATIONS.set(reservationId, cancelledReservation);

  // Release the table back to inventory
  releaseSlot(reservation.restaurantId, reservation.date, reservation.time, reservationId);
  
  console.log(`[RESERVATION CANCELLED] ${reservationId} - Table released, refund: $${refundAmount}`);

  return {
    refundAmount,
    message: `Reservation cancelled. ${refundMessage}`,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate available time slots for a date with REAL-TIME capacity
 * CRITICAL: Shows actual availability based on inventory
 */
function generateTimeSlots(restaurantId: string, date: string, partySize: number): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const requestedDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // If date is in the past, return empty slots
  if (requestedDate < today) {
    return slots;
  }

  // Get capacity for this restaurant/date
  const capacityKey = `${restaurantId}:${date}`;
  const capacity = CAPACITY_TRACKER.get(capacityKey);

  if (!capacity) {
    initializeCapacity(restaurantId, date);
    return generateTimeSlots(restaurantId, date, partySize);
  }

  // Generate slots from 11:00 AM to 10:00 PM (30-minute intervals)
  const startHour = 11;
  const endHour = 22;

  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute of [0, 30]) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      
      // Get real-time capacity for this slot
      const slotCapacity = capacity.timeSlots.get(time);
      
      if (slotCapacity) {
        const available = slotCapacity.availableTables > 0;
        
        slots.push({
          time,
          available,
          remainingCapacity: slotCapacity.availableTables,
          depositPerPerson: 25,
        });
      }
    }
  }

  return slots;
}

/**
 * Simulate payment processing
 */
async function simulatePayment(amount: number, paymentMethod: PaymentMethod): Promise<boolean> {
  await delay(1000); // Simulate payment gateway delay

  // 95% success rate
  return Math.random() > 0.05;
}

/**
 * Get restaurant name by ID (mock data)
 */
function getRestaurantName(restaurantId: string): string {
  const names: Record<string, string> = {
    rest_001: 'Bella Notte',
    rest_002: 'Sakura Omakase',
    rest_003: 'The Rooftop Garden',
    rest_004: 'Spice Route',
    rest_005: 'Le Petit Bistro',
  };
  return names[restaurantId] || 'Unknown Restaurant';
}

/**
 * Get restaurant image by ID (mock data)
 */
function getRestaurantImage(restaurantId: string): string {
  const images: Record<string, string> = {
    rest_001: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=800',
    rest_002: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800',
    rest_003: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800',
    rest_004: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800',
    rest_005: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=800',
  };
  return images[restaurantId] || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800';
}

/**
 * Get restaurant cuisine by ID (mock data)
 */
function getRestaurantCuisine(restaurantId: string): string[] {
  const cuisines: Record<string, string[]> = {
    rest_001: ['Italian', 'Mediterranean'],
    rest_002: ['Japanese', 'Sushi'],
    rest_003: ['American', 'Contemporary'],
    rest_004: ['Indian', 'Asian Fusion'],
    rest_005: ['French', 'European'],
  };
  return cuisines[restaurantId] || ['Restaurant'];
}

/**
 * Get restaurant address by ID (mock data)
 */
function getRestaurantAddress(restaurantId: string): string {
  const addresses: Record<string, string> = {
    rest_001: '234 Greenwich Ave, New York, NY 10011',
    rest_002: '89 E 42nd St, New York, NY 10017',
    rest_003: '567 W 23rd St, New York, NY 10011',
    rest_004: '123 Lexington Ave, New York, NY 10016',
    rest_005: '456 Bleecker St, New York, NY 10014',
  };
  return addresses[restaurantId] || 'New York, NY';
}

/**
 * Format date for display
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

// ============================================================================
// Seed Some Mock Data for Testing
// ============================================================================

// Add a few mock reservations for testing
const seedMockReservations = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().split('T')[0];

  const mockReservation1: Reservation = {
    reservationId: 'res_mock_001',
    userId: 'user_001',
    restaurantId: 'rest_001',
    restaurantName: 'Bella Notte',
    restaurantImage: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=800',
    restaurantCuisine: ['Italian', 'Mediterranean'],
    restaurantAddress: '234 Greenwich Ave, New York, NY 10011',
    date: tomorrowStr,
    time: '19:00',
    partySize: 2,
    status: 'confirmed',
    confirmationCode: 'FT-ABC123',
    depositAmount: 50,
    depositPaid: true,
    paymentMethod: {
      type: 'credit-card',
      last4: '4242',
      cardBrand: 'Visa',
    },
    specialRequests: 'Window seat please',
    createdAt: Date.now() - 86400000,
  };

  const mockReservation2: Reservation = {
    reservationId: 'res_mock_002',
    userId: 'user_001',
    restaurantId: 'rest_002',
    restaurantName: 'Sakura Omakase',
    restaurantImage: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800',
    restaurantCuisine: ['Japanese', 'Sushi'],
    restaurantAddress: '89 E 42nd St, New York, NY 10017',
    date: nextWeekStr,
    time: '20:00',
    partySize: 4,
    status: 'confirmed',
    confirmationCode: 'FT-XYZ789',
    depositAmount: 200,
    depositPaid: true,
    paymentMethod: {
      type: 'credit-card',
      last4: '8888',
      cardBrand: 'Mastercard',
    },
    createdAt: Date.now() - 172800000,
  };

  MOCK_RESERVATIONS.set(mockReservation1.reservationId, mockReservation1);
  MOCK_RESERVATIONS.set(mockReservation2.reservationId, mockReservation2);
};

/**
 * Get order/dining history (mock implementation)
 * Returns completed and cancelled reservations
 */
export async function getOrderHistory(
  userId: string,
  filter: 'all' | 'completed' | 'cancelled' = 'all'
): Promise<OrderHistoryItem[]> {
  await delay(300);

  // Create mock history data
  const mockHistory: OrderHistoryItem[] = [
    {
      reservationId: 'res_history_001',
      restaurantId: 'rest_003',
      restaurantName: 'Le Bernardin',
      restaurantImage: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800',
      restaurantCuisine: ['French', 'Seafood', 'Fine Dining'],
      restaurantAddress: '155 W 51st St, New York, NY 10019',
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      time: '19:30',
      partySize: 2,
      status: 'completed',
      confirmationCode: 'FT-LB001',
      depositAmount: 100,
      totalPaid: 285.50,
      specialRequests: 'Anniversary celebration',
      completedAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
    },
    {
      reservationId: 'res_history_002',
      restaurantId: 'rest_004',
      restaurantName: 'Peter Luger Steak House',
      restaurantImage: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800',
      restaurantCuisine: ['Steakhouse', 'American'],
      restaurantAddress: '178 Broadway, Brooklyn, NY 11211',
      date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      time: '20:00',
      partySize: 4,
      status: 'completed',
      confirmationCode: 'FT-PL002',
      depositAmount: 200,
      totalPaid: 542.75,
      completedAt: Date.now() - 14 * 24 * 60 * 60 * 1000,
    },
    {
      reservationId: 'res_history_003',
      restaurantId: 'rest_005',
      restaurantName: 'Carbone',
      restaurantImage: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800',
      restaurantCuisine: ['Italian', 'American'],
      restaurantAddress: '181 Thompson St, New York, NY 10012',
      date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      time: '18:30',
      partySize: 3,
      status: 'cancelled',
      confirmationCode: 'FT-CB003',
      depositAmount: 150,
      specialRequests: 'Business dinner',
      cancelledAt: Date.now() - 22 * 24 * 60 * 60 * 1000,
    },
    {
      reservationId: 'res_history_004',
      restaurantId: 'rest_006',
      restaurantName: 'Sushi Nakazawa',
      restaurantImage: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800',
      restaurantCuisine: ['Japanese', 'Sushi', 'Omakase'],
      restaurantAddress: '23 Commerce St, New York, NY 10014',
      date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      time: '19:00',
      partySize: 2,
      status: 'completed',
      confirmationCode: 'FT-SN004',
      depositAmount: 120,
      totalPaid: 420.00,
      completedAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
    },
    {
      reservationId: 'res_history_005',
      restaurantId: 'rest_007',
      restaurantName: 'Momofuku Ko',
      restaurantImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
      restaurantCuisine: ['Contemporary', 'Asian Fusion'],
      restaurantAddress: '8 Extra Pl, New York, NY 10003',
      date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      time: '20:30',
      partySize: 2,
      status: 'completed',
      confirmationCode: 'FT-MK005',
      depositAmount: 100,
      totalPaid: 350.25,
      specialRequests: 'Chef\'s tasting menu',
      completedAt: Date.now() - 45 * 24 * 60 * 60 * 1000,
    },
  ];

  // Filter by status
  if (filter === 'completed') {
    return mockHistory.filter(item => item.status === 'completed');
  } else if (filter === 'cancelled') {
    return mockHistory.filter(item => item.status === 'cancelled' || item.status === 'no-show');
  }

  return mockHistory;
}

// Run seed on import
seedMockReservations();
