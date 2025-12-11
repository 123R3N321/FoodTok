/**
 * Profile Page
 * User profile with settings and order history
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore, useAppStore } from '@/lib/stores';
import { getUserStats, getOrderHistory } from '@/lib/api';
import type { OrderHistoryItem } from '@/types/reservation';
import { 
  User, 
  Settings, 
  Heart, 
  Clock, 
  LogOut,
  Edit3,
  MapPin,
  DollarSign,
  Utensils,
  Calendar,
  ChevronRight
} from 'lucide-react';
import { capitalizeWords } from '@/lib/utils';
import Image from 'next/image';

// Intelligent color mapping for cuisines
const getCuisineColor = (cuisine: string) => {
  const colors: Record<string, string> = {
    indian: 'bg-orange-500/15 text-orange-500 border-orange-500/30',
    chinese: 'bg-red-500/15 text-red-500 border-red-500/30',
    japanese: 'bg-pink-500/15 text-pink-500 border-pink-500/30',
    italian: 'bg-green-500/15 text-green-500 border-green-500/30',
    mexican: 'bg-lime-500/15 text-lime-500 border-lime-500/30',
    thai: 'bg-purple-500/15 text-purple-500 border-purple-500/30',
    korean: 'bg-rose-500/15 text-rose-500 border-rose-500/30',
    american: 'bg-blue-500/15 text-blue-500 border-blue-500/30',
    french: 'bg-indigo-500/15 text-indigo-500 border-indigo-500/30',
    mediterranean: 'bg-cyan-500/15 text-cyan-500 border-cyan-500/30',
    vietnamese: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
    greek: 'bg-sky-500/15 text-sky-500 border-sky-500/30',
    middle_eastern: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
    seafood: 'bg-teal-500/15 text-teal-500 border-teal-500/30',
    bbq: 'bg-orange-600/15 text-orange-600 border-orange-600/30',
    vegetarian: 'bg-green-500/15 text-green-500 border-green-500/30',
    vegan: 'bg-emerald-600/15 text-emerald-600 border-emerald-600/30',
  };
  return colors[cuisine.toLowerCase().replace(/\s+/g, '_')] || 'bg-orange-500/15 text-orange-500 border-orange-500/30';
};

// Intelligent color mapping for dietary restrictions
const getDietaryColor = (restriction: string) => {
  const colors: Record<string, string> = {
    vegetarian: 'bg-green-500/15 text-green-500 border-green-500/30',
    vegan: 'bg-emerald-600/15 text-emerald-600 border-emerald-600/30',
    'gluten-free': 'bg-amber-500/15 text-amber-500 border-amber-500/30',
    'gluten free': 'bg-amber-500/15 text-amber-500 border-amber-500/30',
    halal: 'bg-blue-500/15 text-blue-500 border-blue-500/30',
    kosher: 'bg-indigo-500/15 text-indigo-500 border-indigo-500/30',
    'dairy-free': 'bg-cyan-500/15 text-cyan-500 border-cyan-500/30',
    'dairy free': 'bg-cyan-500/15 text-cyan-500 border-cyan-500/30',
    'nut-free': 'bg-rose-500/15 text-rose-500 border-rose-500/30',
    'nut free': 'bg-rose-500/15 text-rose-500 border-rose-500/30',
    pescatarian: 'bg-teal-500/15 text-teal-500 border-teal-500/30',
  };
  return colors[restriction.toLowerCase()] || 'bg-purple-500/15 text-purple-500 border-purple-500/30';
};

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { addNotification } = useAppStore();
  
  const [stats, setStats] = useState({
    totalLikes: 0,
    totalReservations: 0,
    accountAge: 0,
    loading: true
  });

  const [recentOrders, setRecentOrders] = useState<OrderHistoryItem[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  // Fetch real stats from API
  useEffect(() => {
    if (user?.id) {
      getUserStats(user.id)
        .then(data => {
          setStats({
            totalLikes: data.totalLikes,
            totalReservations: data.totalReservations,
            accountAge: data.accountAge,
            loading: false
          });
        })
        .catch(err => {
          console.error('Failed to load stats:', err);
          // Use fallback stats if API fails
          setStats({
            totalLikes: 0,
            totalReservations: 0,
            accountAge: Math.floor((Date.now() - new Date(user.createdAt || Date.now()).getTime()) / (1000 * 60 * 60 * 24)),
            loading: false
          });
        });

      // Load recent orders (last 3)
      getOrderHistory(user.id, 'completed')
        .then(data => {
          setRecentOrders(data.slice(0, 3));
          setOrdersLoading(false);
        })
        .catch(err => {
          console.error('Failed to load recent orders:', err);
          setOrdersLoading(false);
        });
    }
  }, [user?.id]);
  //   if (user?.id) {
  //     fetch(`/api/stats/${user.id}`)
  //       .then(res => res.json())
  //       .then(data => setStats({ ...data, loading: false }))
  //       .catch(err => {
  //         console.error('Failed to load stats:', err);
  //         setStats(prev => ({ ...prev, loading: false }));
  //       });
  //   }
  // }, [user?.id]);

  const statsDisplay = [
    { label: 'Restaurants Liked', value: stats.totalLikes.toString(), icon: Heart },
    { label: 'Total Reservations', value: stats.totalReservations.toString(), icon: Utensils },
    { label: 'Days Active', value: stats.accountAge.toString(), icon: Clock },
  ];

  const handleLogout = () => {
    logout();
    addNotification({
      type: 'success',
      title: 'Logged out successfully',
      message: 'See you next time!'
    });
    router.push('/login');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="p-6 space-y-6">
        {/* Profile Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                {user.profileImage ? (
                  <Image
                    src={user.profileImage}
                    alt={user.firstName}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                ) : (
                  <User className="h-10 w-10 text-primary" />
                )}
              </div>
              
              <div className="flex-1">
                <h1 className="text-2xl font-bold">
                  {user.firstName} {user.lastName}
                </h1>
                <p className="text-muted-foreground">{user.email}</p>
                <Button variant="outline" size="sm" className="mt-2 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white">
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {statsDisplay.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card>
                <CardContent className="p-4 text-center">
                  <stat.icon className="h-6 w-6 mx-auto mb-2 text-orange-500" />
                  <div className="text-2xl font-bold">
                    {stats.loading ? '...' : stat.value}
                  </div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Food Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Utensils className="h-5 w-5" />
              Your Food Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <h4 className="font-medium mb-3">Favorite Cuisines</h4>
              <div className="flex flex-wrap gap-2 justify-center">
                {user.preferences?.cuisineTypes && user.preferences.cuisineTypes.length > 0 ? (
                  user.preferences.cuisineTypes.map((cuisine) => (
                    <span
                      key={cuisine}
                      className={`px-3 py-1.5 text-sm font-medium rounded-full border ${getCuisineColor(cuisine)}`}
                    >
                      {capitalizeWords(cuisine)}
                    </span>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">No cuisines selected</p>
                )}
              </div>
            </div>

            {user.preferences?.dietaryRestrictions && user.preferences.dietaryRestrictions.length > 0 && (
              <div className="text-center">
                <h4 className="font-medium mb-3">Dietary Restrictions</h4>
                <div className="flex flex-wrap gap-2 justify-center">
                  {user.preferences.dietaryRestrictions.map((restriction) => (
                    <span
                      key={restriction}
                      className={`px-3 py-1.5 text-sm font-medium rounded-full border ${getDietaryColor(restriction)}`}
                    >
                      {capitalizeWords(restriction)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mt-6">
              <div className="text-center p-3 bg-green-500/10 rounded-xl border border-green-500/30">
                <h4 className="font-medium mb-1 flex items-center gap-2 justify-center text-green-500">
                  <DollarSign className="h-4 w-4" />
                  Budget
                </h4>
                <p className="text-foreground font-semibold">{user.preferences?.priceRange || '$$'}</p>
              </div>
              
              <div className="text-center p-3 bg-blue-500/10 rounded-xl border border-blue-500/30">
                <h4 className="font-medium mb-1 flex items-center gap-2 justify-center text-blue-500">
                  <MapPin className="h-4 w-4" />
                  Max Distance
                </h4>
                <p className="text-foreground font-semibold">{user.preferences?.maxDistance || 10} miles</p>
              </div>
            </div>

            <Button variant="outline" className="w-full border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white" onClick={() => router.push('/settings')}>
              <Settings className="h-4 w-4 mr-2" />
              Update Preferences
            </Button>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start border-orange-500/50 hover:bg-orange-500/10 hover:border-orange-500"
              onClick={() => router.push('/history')}
            >
              <Clock className="h-4 w-4 mr-3 text-orange-500" />
              Reservation History
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start border-orange-500/50 hover:bg-orange-500/10 hover:border-orange-500"
              onClick={() => router.push('/favorites')}
            >
              <Heart className="h-4 w-4 mr-3 text-orange-500" />
              Favorite Restaurants
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start border-orange-500/50 hover:bg-orange-500/10 hover:border-orange-500"
              onClick={() => router.push('/settings')}
            >
              <Settings className="h-4 w-4 mr-3 text-orange-500" />
              Settings
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recently Completed Reservations</CardTitle>
            {recentOrders.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => router.push('/history')}
                className="text-orange-500 hover:text-orange-600 hover:bg-orange-500/10"
              >
                View All
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 mx-auto border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground mb-4">
                  No completed orders yet
                </p>
                <Button 
                  size="sm"
                  onClick={() => router.push('/')}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  Start Exploring
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <motion.div
                    key={order.reservationId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/restaurant/${order.restaurantId}`)}
                  >
                    <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden">
                      <img
                        src={order.restaurantImage}
                        alt={order.restaurantName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm truncate">
                        {order.restaurantName}
                      </h4>
                      <p className="text-xs text-muted-foreground truncate">
                        {order.restaurantCuisine?.join(', ') || 'Restaurant'}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(order.date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </span>
                        {order.totalPaid && (
                          <span className="font-semibold text-orange-500">
                            ${order.totalPaid.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Logout */}
        <Card className="border-destructive/20">
          <CardContent className="p-4">
            <Button
              variant="outline"
              className="w-full text-destructive border-destructive/20 hover:bg-destructive hover:text-destructive-foreground"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}