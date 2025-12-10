/**
 * Restaurant Card Component
 * The swipeable card that displays restaurant information in the discovery queue
 */

'use client';

import { useState } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, X, Star, MapPin, Clock } from 'lucide-react';
import { DiscoveryCard } from '@/types';
import { capitalizeWords } from '@/lib/utils';
import Image from 'next/image';

interface RestaurantCardProps {
  card: DiscoveryCard;
  onSwipe: (direction: 'left' | 'right') => void;
  onCardClick: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  isTopCard?: boolean;
  style?: React.CSSProperties;
  swipeDirection?: 'left' | 'right';
}

export default function RestaurantCard({ 
  card, 
  onSwipe, 
  onCardClick, 
  onDragStart,
  onDragEnd,
  isTopCard = false,
  style,
  swipeDirection = 'left'
}: RestaurantCardProps) {
  const { restaurant, reason, matchScore } = card;
  const [isDragging, setIsDragging] = useState(false);
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);
  
  // Transform for swipe indicators
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const passOpacity = useTransform(x, [-100, 0], [1, 0]);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    onDragEnd?.();
    
    const threshold = 100;
    const velocity = info.velocity.x;
    
    if (Math.abs(velocity) > 500 || Math.abs(info.offset.x) > threshold) {
      const direction = info.offset.x > 0 ? 'right' : 'left';
      onSwipe(direction);
    } else {
      // Snap back to center
      x.set(0);
      y.set(0);
    }
  };

  const handleDragStart = () => {
    setIsDragging(true);
    onDragStart?.();
  };

  const handleActionButton = (direction: 'left' | 'right') => {
    onSwipe(direction);
  };

  return (
    <motion.div
      className="absolute inset-0"
      style={{
        x,
        y,
        rotate,
        opacity,
        zIndex: isTopCard ? 2 : 1,
        ...style
      }}
      drag={isTopCard}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.1}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: isTopCard ? 1 : 0.95, opacity: 1 }}
      exit={{ 
        x: swipeDirection === 'right' ? 300 : -300,
        opacity: 0,
        transition: { duration: 0.3 }
      }}
    >
      <Card 
        className="h-full overflow-hidden bg-card shadow-2xl relative border-0"
      >
        {/* Swipe indicators - must be BEFORE clickable overlay and non-interactive */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          style={{ 
            opacity: likeOpacity, 
            pointerEvents: 'none',
            zIndex: 5 
          }}
        >
          <div className="bg-green-500/20 absolute inset-0" />
          <div className="bg-green-500 text-white p-4 rounded-full relative z-10">
            <Heart className="h-8 w-8 fill-current" />
          </div>
        </motion.div>
        
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          style={{ 
            opacity: passOpacity, 
            pointerEvents: 'none',
            zIndex: 5 
          }}
        >
          <div className="bg-red-500/20 absolute inset-0" />
          <div className="bg-red-500 text-white p-4 rounded-full relative z-10">
            <X className="h-8 w-8" />
          </div>
        </motion.div>
        
        {/* Clickable overlay for card tap - only covers image area */}
        <div 
          className="absolute top-0 left-0 right-0" 
          onClick={!isDragging ? onCardClick : undefined}
          style={{ 
            pointerEvents: isDragging ? 'none' : 'auto',
            height: '256px', // Same as image height (h-64 = 16rem = 256px)
            cursor: isDragging ? 'grabbing' : 'pointer',
            zIndex: 10
          }}
        />

        {/* Match score badge */}
        <div className="absolute top-4 right-4 z-20 bg-primary text-white px-2 py-1 rounded-full text-sm font-medium">
          {matchScore}% match
        </div>

        {/* Restaurant image */}
        <div className="relative h-64 overflow-hidden">
          <Image
            src={restaurant.images[0] || '/placeholder-restaurant.jpg'}
            alt={restaurant.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority={isTopCard}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          
          {/* Restaurant name overlay */}
          <div className="absolute bottom-4 left-4 text-white">
            <h2 className="text-2xl font-bold mb-1 text-white">{restaurant.name}</h2>
            <div className="flex items-center gap-2 text-sm text-white">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="text-white">{restaurant.rating}</span>
                <span className="text-white">({restaurant.reviewCount})</span>
              </div>
              <span className="text-white">•</span>
              <span className="font-medium text-white">{restaurant.priceRange}</span>
            </div>
          </div>
        </div>

        <CardContent className="p-4 space-y-3 bg-gradient-to-b from-card to-background relative z-20">
          {/* Restaurant description */}
          <p className="text-gray-300 text-sm line-clamp-2 leading-relaxed font-medium">
            {restaurant.description}
          </p>

          {/* Cuisine tags */}
          <div className="flex flex-wrap gap-1.5">
            {restaurant.cuisine.slice(0, 3).map((cuisine) => (
              <span
                key={cuisine}
                className="px-2 py-1 bg-gray-800 text-gray-200 text-xs rounded-full font-medium border border-gray-700"
              >
                {capitalizeWords(cuisine)}
              </span>
            ))}
          </div>

          {/* Restaurant details */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{restaurant.location.address}, {restaurant.location.city}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Clock className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Open until 10:00 PM</span>
            </div>
          </div>

          {/* AI recommendation reason */}
          {reason && (
            <div className="bg-blue-900/30 border border-blue-800/50 p-3 rounded-lg mb-4">
              <p className="text-sm text-blue-300 leading-relaxed">
                <span className="font-medium">Why we picked this:</span> {reason}
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-4 pt-4" style={{ position: 'relative', zIndex: 30 }}>
            <Button
              variant="outline"
              size="lg"
              className="flex-1 border-red-200 dark:border-red-800 hover:bg-red-500 hover:text-white dark:hover:bg-red-600"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleActionButton('left');
              }}
            >
              <X className="h-5 w-5 mr-2" />
              Pass
            </Button>
            
            <Button
              size="lg"
              className="flex-1 bg-green-500 hover:bg-green-600 text-white"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleActionButton('right');
              }}
            >
              <Heart className="h-5 w-5 mr-2" />
              Like
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}