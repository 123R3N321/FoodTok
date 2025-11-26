/**
 * Real Reservation API Client
 * 
 * Implements actual HTTP requests to backend reservation endpoints
 * 
 * Backend Endpoints:
 * - POST   /api/reservations/availability - Check available time slots
 * - POST   /api/reservations/hold        - Create 10-min hold on table
 * - GET    /api/reservations/hold/active - Get user's active hold
 * - POST   /api/reservations/confirm     - Pay deposit and confirm
 * - GET    /api/reservations/user/:id    - Get user's reservations
 * - GET    /api/reservations/:id         - Get reservation details
 * - PATCH  /api/reservations/:id         - Modify reservation
 * - DELETE /api/reservations/:id         - Cancel reservation
 */

import { apiRequest } from './index';
import {
  AvailabilityResponse,
  HoldResponse,
  ReservationResponse,
  CheckAvailabilityRequest,
  CreateHoldRequest,
  ConfirmReservationRequest,
  ModifyReservationRequest,
  ReservationListItem,
  Hold,
  Reservation,
} from '@/types/reservation';

/**
 * Check available time slots for a restaurant
 * POST /api/reservations/availability
 */
export async function checkAvailability(
  request: CheckAvailabilityRequest
): Promise<AvailabilityResponse> {
  try {
    const response = await apiRequest('/reservations/availability', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    
    // Backend returns 'availableSlots', frontend expects 'slots'
    // Also add missing deposit info
    return {
      restaurantId: response.restaurantId,
      date: response.date,
      partySize: request.partySize,
      slots: response.availableSlots || response.slots || [],
      depositPerPerson: response.depositPerPerson || 25,
      totalDeposit: response.totalDeposit || (25 * request.partySize),
    };
  } catch (error) {
    console.error('Error checking availability:', error);
    throw error;
  }
}

/**
 * Create a 10-minute hold on a table
 * POST /api/reservations/hold
 */
export async function createHold(
  request: CreateHoldRequest
): Promise<HoldResponse> {
  try {
    return await apiRequest('/reservations/hold', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  } catch (error) {
    console.error('Error creating hold:', error);
    throw error;
  }
}

/**
 * Get user's active hold (if any)
 * GET /api/reservations/hold/active?userId=X
 */
export async function getUserActiveHold(
  userId: string
): Promise<Hold | null> {
  try {
    const result = await apiRequest(`/reservations/hold/active?userId=${userId}`);
    return result || null;
  } catch (error) {
    console.error('Error fetching active hold:', error);
    // Return null if no active hold found (404 is expected or empty response)
    const errorMsg = (error as any)?.message || '';
    if (errorMsg.includes('404') || errorMsg.includes('Unexpected') || errorMsg.includes('JSON')) {
      return null;
    }
    return null; // Default to null for any error
  }
}

/**
 * Pay deposit and confirm reservation
 * POST /api/reservations/confirm
 */
export async function confirmReservation(
  request: ConfirmReservationRequest
): Promise<ReservationResponse> {
  try {
    return await apiRequest('/reservations/confirm', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  } catch (error) {
    console.error('Error confirming reservation:', error);
    throw error;
  }
}

/**
 * Get user's reservations (upcoming or past)
 * GET /api/reservations/user/:userId?filter=upcoming|past
 */
export async function getUserReservations(
  userId: string,
  filter: 'upcoming' | 'past' = 'upcoming'
): Promise<ReservationListItem[]> {
  try {
    return await apiRequest(`/reservations/user/${userId}?filter=${filter}`);
  } catch (error) {
    console.error('Error fetching user reservations:', error);
    throw error;
  }
}

/**
 * Get specific reservation details
 * GET /api/reservations/:id
 */
export async function getReservationById(
  reservationId: string,
  userId: string
): Promise<Reservation> {
  try {
    return await apiRequest(`/reservations/${reservationId}?userId=${userId}`);
  } catch (error) {
    console.error('Error fetching reservation:', error);
    throw error;
  }
}

/**
 * Modify existing reservation
 * PATCH /api/reservations/:id
 */
export async function modifyReservation(
  reservationId: string,
  userId: string,
  changes: ModifyReservationRequest
): Promise<Reservation> {
  try {
    return await apiRequest(`/reservations/${reservationId}`, {
      method: 'PATCH',
      body: JSON.stringify({ userId, ...changes }),
    });
  } catch (error) {
    console.error('Error modifying reservation:', error);
    throw error;
  }
}

/**
 * Cancel reservation with refund calculation
 * DELETE /api/reservations/:id
 */
export async function cancelReservation(
  reservationId: string,
  userId: string
): Promise<{
  success: boolean;
  message: string;
  refundAmount: number;
  refundPercentage: number;
}> {
  try {
    return await apiRequest(`/reservations/${reservationId}`, {
      method: 'DELETE',
      body: JSON.stringify({ userId }),
    });
  } catch (error) {
    console.error('Error canceling reservation:', error);
    throw error;
  }
}
