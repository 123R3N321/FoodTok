/**
 * Restaurant Details Page
 * Comprehensive view of restaurant with menu, reviews, and ordering functionality
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ArrowLeft, 
  Star, 
  MapPin, 
  Clock, 
  Phone, 
  Heart,
  Plus,
  Minus,
  ShoppingCart,
  Calendar
} from 'lucide-react';
import { Restaurant, MenuItem } from '@/types';
import { getRestaurantById, getDiscoveryRestaurants } from '@/lib/api';
import { useCartStore, useAuthStore, useReservationStore } from '@/lib/stores';
import { formatCurrency, capitalizeWords, cn } from '@/lib/utils';
import ReservationModal from '@/components/reservation/ReservationModal';
import type { Hold } from '@/types/reservation';

export default function RestaurantDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const { cart, addItem, setCartOpen } = useCartStore();
  
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
  const [reservationModalOpen, setReservationModalOpen] = useState(false);

  async function fetchDiscoverySample() {
    try {
      // Example: fetch 3 discovery cards for quick dev testing
      const data = await getDiscoveryRestaurants('user_001', 3);
      console.log('Discovery sample:', data);
    } catch (err) {
      console.error('Failed to fetch discovery sample:', err);
    }
  }

  useEffect(() => {
    const fetchRestaurant = async () => {
      if (!params.id) return;
      
      setIsLoading(true);
      try {
        const response = await getRestaurantById(params.id as string);
        setRestaurant(response as any);
      } catch (err) {
        setError('Failed to load restaurant details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRestaurant();
  }, [params.id]);

  const handleAddToCart = (menuItem: MenuItem) => {
    if (!restaurant) return;
    
    const quantity = itemQuantities[menuItem.id] || 1;
    addItem(restaurant, menuItem, quantity);
    
    // Reset quantity
    setItemQuantities(prev => ({ ...prev, [menuItem.id]: 1 }));
    
    // Show cart briefly
    setCartOpen(true);
    setTimeout(() => setCartOpen(false), 2000);
  };

  const updateQuantity = (menuItemId: string, delta: number) => {
    setItemQuantities(prev => ({
      ...prev,
      [menuItemId]: Math.max(1, (prev[menuItemId] || 1) + delta)
    }));
  };

  const handleHoldCreated = (holdData: any) => {
    console.log('✅ Hold created - converting and storing in zustand');
    console.log('🔍 Backend hold data:', holdData);
    
    // Backend expiresAt is broken - it gives a future date instead of NOW + 10min
    // Calculate correct expiry: NOW + 10 minutes
    const correctExpiresAt = Date.now() + (10 * 60 * 1000);
    
    // Convert backend format to frontend Hold type immediately
    const hold: Hold = {
      holdId: holdData.hold.holdId,
      userId: holdData.hold.userId,
      restaurantId: holdData.hold.restaurantId,
      restaurantName: holdData.restaurantName || restaurant?.name || 'Restaurant',
      restaurantImage: holdData.restaurantImage || (restaurant?.images?.[0]) || '',
      date: holdData.hold.date,
      time: holdData.hold.time,
      partySize: holdData.hold.partySize,
      status: 'held',
      depositAmount: holdData.totalDeposit || 50,
      createdAt: Date.now(),
      expiresAt: correctExpiresAt
    };
    
    console.log('✅ Converted hold with CORRECT expiresAt:', hold);
    console.log('✅ Timer will expire at:', new Date(hold.expiresAt).toISOString());
    console.log('✅ Minutes from now:', Math.floor((hold.expiresAt - Date.now()) / 60000));
    
    // Store in zustand global state
    useReservationStore.getState().setActiveHold(hold);
    
    // Navigate to checkout
    router.push('/checkout');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold">Restaurant not found</h2>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  const categories = ['all', ...(restaurant.menu ? new Set(restaurant.menu.map(item => item.category)) : [])];
  const filteredMenu = selectedCategory === 'all' 
    ? (restaurant.menu || [])
    : (restaurant.menu || []).filter(item => item.category === selectedCategory);

  return (
    <div className="min-h-screen pb-20">
      {/* Header Image */}
      <div className="relative h-64 overflow-hidden bg-muted">
        {restaurant.images && restaurant.images.length > 0 && restaurant.images[0] ? (
          <img
            src={restaurant.images[0]}
            alt={restaurant.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              console.error('❌ Image failed to load:', restaurant.images[0]);
              e.currentTarget.style.display = 'none';
            }}
            onLoad={() => console.log('✅ Image loaded:', restaurant.images[0])}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-6xl">
            🍽️
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        
        {/* Back Button */}
        <Button
          variant="secondary"
          size="icon"
          className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        {/* Favorite Button */}
          <Button
            variant="secondary"
            size="icon"
            className="absolute top-4 right-4 bg-background/80 backdrop-blur-sm"
            onClick={() => fetchDiscoverySample()}
          >
            <Heart className="h-4 w-4" />
          </Button>

        {/* Restaurant Name Overlay */}
        <div className="absolute bottom-4 left-4 text-white">
          <h1 className="text-3xl font-bold mb-2">{restaurant.name}</h1>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span>{restaurant.rating}</span>
              <span>({restaurant.reviewCount} reviews)</span>
            </div>
            <span>•</span>
            <span className="font-medium">{restaurant.priceRange}</span>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Restaurant Info */}
        <div className="space-y-4">
          <p className="text-muted-foreground">{restaurant.description}</p>
          
          {/* Cuisine Tags */}
          <div className="flex flex-wrap gap-2">
            {restaurant.cuisine.map((cuisine) => (
              <span
                key={cuisine}
                className="px-3 py-1 bg-secondary text-secondary-foreground text-sm rounded-full"
              >
                {capitalizeWords(cuisine)}
              </span>
            ))}
          </div>

          {/* Reserve Table Button */}
          <Button
            size="lg"
            className="w-full"
            onClick={() => setReservationModalOpen(true)}
          >
            <Calendar className="h-5 w-5 mr-2" />
            Reserve a Table
          </Button>

          {/* Restaurant Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">Address</div>
                <div className="text-muted-foreground">
                  {restaurant.location.address}, {restaurant.location.city}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">Hours</div>
                <div className="text-muted-foreground">
                  Open until 10:00 PM
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Menu Categories */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Menu</h2>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(category)}
                className="whitespace-nowrap"
              >
                {capitalizeWords(category)}
              </Button>
            ))}
          </div>
        </div>

        {/* Menu Items */}
        <div className="space-y-4">
          {filteredMenu.length === 0 && selectedCategory === 'all' && (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground mb-4">
                  Menu information is not available from Yelp.
                </p>
                <p className="text-sm text-muted-foreground">
                  Please visit the restaurant or call them for menu details.
                </p>
              </CardContent>
            </Card>
          )}
          {filteredMenu.map((item) => {
            const quantity = itemQuantities[item.id] || 1;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {/* Item Image */}
                      {item.image && (
                        <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      
                      {/* Item Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold truncate">{item.name}</h3>
                          <span className="font-bold text-primary flex-shrink-0 ml-2">
                            {formatCurrency(item.price)}
                          </span>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {item.description}
                        </p>

                        {/* Dietary Info */}
                        {item.dietaryInfo.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {item.dietaryInfo.map((info) => (
                              <span
                                key={info}
                                className="px-2 py-0.5 bg-success/10 text-success text-xs rounded"
                              >
                                {capitalizeWords(info)}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Add to Cart Controls */}
                        <div className="flex items-center gap-3">
                          <div className="flex items-center border rounded-lg">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateQuantity(item.id, -1)}
                              disabled={quantity <= 1}
                              className="h-8 w-8 p-0"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="px-3 text-sm font-medium w-8 text-center">
                              {quantity}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateQuantity(item.id, 1)}
                              className="h-8 w-8 p-0"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          
                          <Button
                            size="sm"
                            onClick={() => handleAddToCart(item)}
                            className="flex-1"
                          >
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            Add to Cart
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {filteredMenu.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No items found in this category.</p>
          </div>
        )}
      </div>

      {/* Floating Cart Button */}
      {cart && cart.items.length > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-24 left-4 right-4 z-40"
        >
          <Button
            size="lg"
            className="w-full shadow-lg"
            onClick={() => router.push('/cart')}
          >
            <ShoppingCart className="h-5 w-5 mr-2" />
            View Cart ({cart.items.length} items) • {formatCurrency(cart.total)}
          </Button>
        </motion.div>
      )}

      {/* Reservation Modal */}
      <ReservationModal
        isOpen={reservationModalOpen}
        onClose={() => setReservationModalOpen(false)}
        restaurantId={restaurant.id}
        restaurantName={restaurant.name}
        restaurantImage={restaurant.images && restaurant.images.length > 0 ? restaurant.images[0] : ''}
        onHoldCreated={handleHoldCreated}
      />
    </div>
  );
}