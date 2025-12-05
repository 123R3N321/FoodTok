'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Calendar, Clock, Users, MapPin, Star, MessageSquare, Receipt } from 'lucide-react';
import { getOrderHistory } from '@/lib/api';
import { useAuthStore } from '@/lib/stores';
import type { OrderHistoryItem } from '@/types/reservation';

export default function HistoryPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'cancelled'>('all');

  useEffect(() => {
    loadHistory();
  }, [user, filter]);

  const loadHistory = async () => {
    if (!user?.id) {
      router.push('/login');
      return;
    }

    setLoading(true);
    try {
      const data = await getOrderHistory(user.id, filter);
      setOrders(data);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      completed: 'bg-green-500/20 text-green-500',
      cancelled: 'bg-red-500/20 text-red-500',
      'no-show': 'bg-orange-500/20 text-orange-500',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-500/20 text-gray-500';
  };

  const filteredOrders = filter === 'all' 
    ? orders 
    : orders.filter(order => order.status === filter);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dining History</h1>
          <p className="text-muted-foreground">Your past restaurant experiences</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-6 py-3 rounded-xl font-semibold transition-colors whitespace-nowrap ${
              filter === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-6 py-3 rounded-xl font-semibold transition-colors whitespace-nowrap ${
              filter === 'completed'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            Completed
          </button>
          <button
            onClick={() => setFilter('cancelled')}
            className={`px-6 py-3 rounded-xl font-semibold transition-colors whitespace-nowrap ${
              filter === 'cancelled'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            Cancelled
          </button>
        </div>

        {/* Stats Summary */}
        {!loading && orders.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-card p-4 rounded-xl border">
              <div className="text-2xl font-bold text-primary">
                {orders.filter(o => o.status === 'completed').length}
              </div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
            <div className="bg-card p-4 rounded-xl border">
              <div className="text-2xl font-bold text-primary">
                ${orders.filter(o => o.status === 'completed')
                  .reduce((sum, o) => sum + (o.totalPaid || 0), 0)
                  .toFixed(0)}
              </div>
              <div className="text-xs text-muted-foreground">Total Spent</div>
            </div>
            <div className="bg-card p-4 rounded-xl border">
              <div className="text-2xl font-bold text-primary">
                {orders.reduce((sum, o) => sum + o.partySize, 0)}
              </div>
              <div className="text-xs text-muted-foreground">Total Guests</div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-4 bg-secondary rounded-full flex items-center justify-center">
              <Receipt size={32} className="text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No dining history</h3>
            <p className="text-muted-foreground mb-6">
              {filter === 'all'
                ? "You haven't completed any reservations yet"
                : `No ${filter} reservations found`}
            </p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90"
            >
              Discover Restaurants
            </button>
          </div>
        )}

        {/* History List */}
        {!loading && filteredOrders.length > 0 && (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <motion.div
                key={order.reservationId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-2xl shadow-lg overflow-hidden border hover:shadow-xl transition-shadow"
              >
                <div className="flex flex-col md:flex-row">
                  {/* Restaurant Image */}
                  <div className="md:w-48 h-48 md:h-auto flex-shrink-0 relative">
                    <img
                      src={order.restaurantImage}
                      alt={order.restaurantName}
                      className="w-full h-full object-cover"
                    />
                    {/* Status Badge Overlay */}
                    <div className="absolute top-3 right-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm ${getStatusBadge(
                          order.status
                        )}`}
                      >
                        {order.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex-1 p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-xl font-bold mb-1">
                          {order.restaurantName}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {order.restaurantCuisine.join(', ')}
                        </p>
                      </div>
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar size={16} className="text-primary" />
                        <span>
                          {new Date(order.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock size={16} className="text-primary" />
                        <span>{order.time}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Users size={16} className="text-primary" />
                        <span>{order.partySize} guests</span>
                      </div>
                      {order.status === 'completed' && order.totalPaid && (
                        <div className="flex items-center gap-2 text-sm">
                          <Receipt size={16} className="text-primary" />
                          <span className="font-semibold">
                            ${order.totalPaid.toFixed(2)} paid
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Confirmation Code */}
                    {order.confirmationCode && (
                      <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                        <div className="text-xs text-muted-foreground mb-1">
                          Confirmation Code
                        </div>
                        <div className="text-sm font-mono font-semibold">
                          {order.confirmationCode}
                        </div>
                      </div>
                    )}

                    {/* Special Requests (if any) */}
                    {order.specialRequests && (
                      <div className="mb-4">
                        <div className="text-xs text-muted-foreground mb-1">
                          Special Requests
                        </div>
                        <div className="text-sm italic">
                          "{order.specialRequests}"
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    {order.status === 'completed' && (
                      <div className="flex gap-3 pt-4 border-t">
                        <button
                          onClick={() => router.push(`/restaurant/${order.restaurantId}`)}
                          className="flex-1 py-2 px-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90"
                        >
                          Book Again
                        </button>
                        <button
                          className="flex-1 py-2 px-4 bg-secondary text-secondary-foreground rounded-xl font-semibold hover:bg-secondary/80 flex items-center justify-center gap-2"
                        >
                          <Star size={16} />
                          Leave Review
                        </button>
                      </div>
                    )}

                    {/* Cancelled Info */}
                    {order.status === 'cancelled' && (
                      <div className="pt-4 border-t">
                        <button
                          onClick={() => router.push(`/restaurant/${order.restaurantId}`)}
                          className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90"
                        >
                          Book Again
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
