/**
 * Discovery Queue Page
 * The main FoodTok experience - swipe through restaurant recommendations
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useDiscoveryStore, useAuthStore } from '@/lib/stores';
import RestaurantCard from '@/components/features/RestaurantCard';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DiscoveryPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    queue,
    currentIndex,
    isLoading,
    error,
    loadQueue,
    swipeCard,
    getCurrentCard,
    hasMoreCards,
    undoSwipe
  } = useDiscoveryStore();
  
  const [cardKey, setCardKey] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [lastSwipeDirection, setLastSwipeDirection] = useState<'left' | 'right'>('left');
  
  useEffect(() => {
    // Load initial queue when component mounts
    if (user && queue.length === 0) {
      loadQueue(user.id, user.preferences);
    }
  }, [user, queue.length, loadQueue]);

  const handleSwipe = (direction: 'left' | 'right') => {
    const currentCard = getCurrentCard();
    if (!currentCard) return;
    
    // Set direction first, then trigger the card change
    setLastSwipeDirection(direction);
    
    // Small delay to ensure state is updated before card key changes
    requestAnimationFrame(() => {
      swipeCard(direction, currentCard.restaurant.id);
      setCardKey(prev => prev + 1);
    });
  };

  const handleCardClick = () => {
    // Only navigate if not currently swiping/dragging
    const currentCard = getCurrentCard();
    if (currentCard && !isDragging) {
      router.push(`/restaurant/${currentCard.restaurant.id}`);
    }
  };

  const handleRefresh = () => {
    if (user) {
      loadQueue(user.id, user.preferences);
      setCardKey(prev => prev + 1);
    }
  };

  if (isLoading && queue.length === 0) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading personalized recommendations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-6xl">😕</div>
          <h2 className="text-xl font-semibold">Oops! Something went wrong</h2>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!hasMoreCards() && !isLoading) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="text-6xl">🎉</div>
          <h2 className="text-2xl font-bold">You&apos;ve seen all recommendations!</h2>
          <p className="text-muted-foreground">
            Great job exploring! We&apos;re preparing more personalized recommendations for you.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Load More
            </Button>
            <Button onClick={() => router.push('/favorites')}>
              View Liked Restaurants
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const currentCard = getCurrentCard();

  return (
    <div className="min-h-[calc(100vh-8rem)] p-4">
      <div className="max-w-md mx-auto h-[calc(100vh-12rem)] relative">
        {/* Header with controls */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Discover</h1>
            <p className="text-muted-foreground text-sm">
              {queue.length - currentIndex} restaurants in your queue
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={undoSwipe}
              disabled={currentIndex === 0}
              className="h-10 w-10"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={isLoading}
              className="h-10 w-10"
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Card stack */}
        <div className="relative h-full">
          <AnimatePresence mode="wait">
            {/* Only show current card to prevent transparency issues */}
            {currentCard && (
              <RestaurantCard
                key={`card-${currentIndex}-${cardKey}`}
                card={currentCard}
                onSwipe={handleSwipe}
                onCardClick={handleCardClick}
                onDragStart={() => setIsDragging(true)}
                onDragEnd={() => setIsDragging(false)}
                isTopCard={true}
                swipeDirection={lastSwipeDirection}
              />
            )}
          </AnimatePresence>

          {/* Loading indicator for more cards */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-background/80 backdrop-blur-sm rounded-lg p-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            </div>
          )}
        </div>

        {/* Swipe instructions for new users */}
        {currentIndex === 0 && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: 1 }}
            className="absolute bottom-4 left-4 right-4 bg-primary/90 text-primary-foreground p-3 rounded-lg text-center text-sm"
          >
            <p>💡 Swipe right to like, left to pass, or tap to view details</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}