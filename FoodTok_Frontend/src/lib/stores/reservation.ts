/**
 * Reservation Store
 * Global state for active hold data to pass between pages
 */

import { create } from 'zustand';
import type { Hold } from '@/types/reservation';

interface ReservationState {
  activeHold: Hold | null;
  setActiveHold: (hold: Hold | null) => void;
  clearHold: () => void;
}

export const useReservationStore = create<ReservationState>((set) => ({
  activeHold: null,
  setActiveHold: (hold) => {
    console.log('🏪 Store: Setting active hold:', hold);
    set({ activeHold: hold });
  },
  clearHold: () => {
    console.log('🏪 Store: Clearing active hold');
    set({ activeHold: null });
  },
}));
