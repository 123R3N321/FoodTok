/**
 * Favorites Page
 * Display user's liked restaurants from DynamoDB backend
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthStore } from '@/lib/stores';
import { getUserFavorites, removeFavorite } from '@/lib/api';
import type { Favorite } from '@/lib/api/favorites';
import { Star, Heart, ArrowRight } from 'lucide-react';

export default function FavoritesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchFavorites = async () => {
      console.log('🔍 Favorites page: Checking user state...', user);
      
      if (!user) {
        console.warn('⚠️ No user found in auth store');
        setIsLoading(false);
        return;
      }

      console.log('👤 User found:', user.email, 'ID:', user.id);
      setIsLoading(true);
      try {
        console.log('📡 Fetching favorites for user:', user.id);
        const userFavorites = await getUserFavorites(user.id);
        console.log('📋 Loaded', userFavorites.length, 'favorites from backend');
        setFavorites(userFavorites);
      } catch (error) {
        console.error('❌ Failed to fetch favorites:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFavorites();
  }, [user]);

  const handleRemoveFavorite = async (restaurantId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user || removingId) return;

    setRemovingId(restaurantId);
    try {
      await removeFavorite(user.id, restaurantId);
      console.log('✅ Removed favorite:', restaurantId);
      
      // Update local state
      setFavorites(prev => prev.filter(f => f.restaurantId !== restaurantId));
    } catch (error) {
      console.error('Failed to remove favorite:', error);
    } finally {
      setRemovingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-md mx-auto">
          <div className="text-6xl">❤️</div>
          <div>
            <h2 className="text-2xl font-bold mb-2">No favorites yet</h2>
            <p className="text-muted-foreground">
              Start discovering restaurants and like the ones you want to remember!
            </p>
          </div>
          <Button onClick={() => router.push('/')} size="lg">
            Discover Restaurants
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Your Favorites</h1>
            <p className="text-muted-foreground">
              {favorites.length} restaurant{favorites.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Heart className="h-6 w-6 text-destructive fill-current" />
        </div>

        <div className="grid gap-4">
          {favorites.map((favorite, index) => (
            <motion.div
              key={`fav-${favorite.restaurantId}-${index}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card className="overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-0">
                  <div 
                    className="flex cursor-pointer"
                    onClick={() => router.push(`/restaurant/${favorite.restaurantId}`)}
                  >
                    {/* Restaurant Image */}
                    <div className="w-24 h-24 flex-shrink-0 bg-muted overflow-hidden rounded-l-lg">
                      {favorite.restaurantImage ? (
                        <img
                          src={favorite.restaurantImage}
                          alt={favorite.restaurantName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-2xl">
                          🍽️
                        </div>
                      )}
                    </div>
                    
                    {/* Restaurant Info */}
                    <div className="flex-1 p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-lg truncate">
                          {favorite.restaurantName}
                        </h3>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0 relative z-10"
                          onClick={(e) => handleRemoveFavorite(favorite.restaurantId, e)}
                          disabled={removingId === favorite.restaurantId}
                          title="Remove from favorites"
                        >
                          {removingId === favorite.restaurantId ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-destructive" />
                          ) : (
                            <Heart className="h-4 w-4 fill-current" />
                          )}
                        </Button>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">{favorite.matchScore}%</span>
                          <span className="text-sm text-muted-foreground">match</span>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground">
                        Liked {new Date(favorite.likedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
