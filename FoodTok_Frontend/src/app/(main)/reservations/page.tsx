'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Calendar, Clock, Users, MapPin, ChevronRight, X, Edit } from 'lucide-react';
import { getUserReservations, cancelReservation } from '@/lib/api';
import { useAuthStore } from '@/lib/stores';
import type { ReservationListItem } from '@/types/reservation';

export default function ReservationsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');
  const [reservations, setReservations] = useState<ReservationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      router.push('/login');
      return;
    }
    loadReservations();
  }, [filter, user?.id]);

  const loadReservations = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const data = await getUserReservations(user.id, filter);
      setReservations(data);
    } catch (err) {
      console.error('Failed to load reservations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (reservationId: string) => {
    if (!user?.id) return;
    
    const confirmed = confirm('Are you sure you want to cancel this reservation? Refund depends on cancellation policy.');
    if (!confirmed) return;

    setCancellingId(reservationId);
    try {
      const result = await cancelReservation(reservationId, user.id);
      alert(result.message);
      loadReservations();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      confirmed: 'bg-green-500/20 text-green-500',
      modified: 'bg-blue-500/20 text-blue-500',
      cancelled: 'bg-red-500/20 text-red-500',
      completed: 'bg-gray-500/20 text-gray-500',
      'no-show': 'bg-orange-500/20 text-orange-500',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-500/20 text-gray-500';
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Reservations</h1>
          <p className="text-muted-foreground">Manage your table bookings</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              filter === 'upcoming'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setFilter('past')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              filter === 'past'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            Past
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Empty State */}
        {!loading && reservations.length === 0 && (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-4 bg-secondary rounded-full flex items-center justify-center">
              <Calendar size={32} className="text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No {filter} reservations</h3>
            <p className="text-muted-foreground mb-6">
              {filter === 'upcoming'
                ? "You don't have any upcoming reservations"
                : "You don't have any past reservations"}
            </p>
            {filter === 'upcoming' && (
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Explore Restaurants
              </button>
            )}
          </div>
        )}

        {/* Reservations List */}
        {!loading && reservations.length > 0 && (
          <div className="space-y-4">
            {reservations.map((reservation) => (
              <motion.div
                key={reservation.reservationId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-card rounded-2xl shadow-lg overflow-hidden border transition-all ${
                  filter === 'past' ? 'opacity-70 scale-95' : ''
                }`}
              >
                <div className="flex flex-col md:flex-row">
                  {/* Restaurant Image */}
                  <div className="md:w-48 h-48 md:h-auto flex-shrink-0 bg-muted">
                    <img
                      src={reservation.restaurantImage || '/placeholder-restaurant.jpg'}
                      alt={reservation.restaurantName || 'Restaurant'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400';
                      }}
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold mb-1">
                          {reservation.restaurantName || 'Restaurant'}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {reservation.restaurantCuisine?.join(', ') || 'Cuisine not specified'}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(
                          reservation.status
                        )}`}
                      >
                        {reservation.status.toUpperCase()}
                      </span>
                    </div>

                    {/* Confirmation Code (for upcoming) */}
                    {filter === 'upcoming' && ['confirmed', 'modified'].includes(reservation.status) && (
                      <div className="mb-4 p-3 bg-orange-500/10 rounded-xl border border-orange-500/20">
                        <div className="text-xs text-orange-500 font-semibold mb-1">
                          CONFIRMATION CODE
                        </div>
                        <div className="text-2xl font-bold text-orange-500 font-mono">
                          {reservation.confirmationCode}
                        </div>
                      </div>
                    )}

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar size={16} className="text-orange-500" />
                        <span>
                          {new Date(reservation.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock size={16} className="text-orange-500" />
                        <span>{reservation.time}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Users size={16} className="text-orange-500" />
                        <span>{reservation.partySize} guests</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-semibold">
                          ${reservation.depositAmount} deposit
                        </span>
                      </div>
                    </div>

                    {/* Actions (for upcoming only) */}
                    {filter === 'upcoming' && ['confirmed', 'modified'].includes(reservation.status) && (
                      <div className="flex gap-3 pt-4 border-t">
                        <button
                          onClick={() => handleCancel(reservation.reservationId)}
                          disabled={cancellingId === reservation.reservationId}
                          className="flex-1 py-2 px-4 bg-destructive/10 text-destructive rounded-xl font-semibold hover:bg-destructive/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {cancellingId === reservation.reservationId ? (
                            <span className="flex items-center justify-center gap-2">
                              <div className="w-4 h-4 border-2 border-destructive/30 border-t-destructive rounded-full animate-spin" />
                              Cancelling...
                            </span>
                          ) : (
                            'Cancel'
                          )}
                        </button>
                        <button 
                          onClick={() => router.push(`/restaurant/${reservation.restaurantId}`)}
                          className="flex-1 py-2 px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                          View Details
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
