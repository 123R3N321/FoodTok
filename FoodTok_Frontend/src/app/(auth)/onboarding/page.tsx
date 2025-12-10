/**
 * Onboarding Page
 * Captures user preferences for personalized recommendations
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore, useAppStore } from '@/lib/stores';
import { ChevronRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cuisine, DietaryRestriction, PriceRange } from '@/types';

const cuisineOptions: { value: Cuisine; label: string; emoji: string }[] = [
  { value: 'italian', label: 'Italian', emoji: '🍝' },
  { value: 'japanese', label: 'Japanese', emoji: '🍣' },
  { value: 'chinese', label: 'Chinese', emoji: '🥟' },
  { value: 'mexican', label: 'Mexican', emoji: '🌮' },
  { value: 'indian', label: 'Indian', emoji: '🍛' },
  { value: 'thai', label: 'Thai', emoji: '🍜' },
  { value: 'french', label: 'French', emoji: '🥐' },
  { value: 'mediterranean', label: 'Mediterranean', emoji: '🥗' },
  { value: 'american', label: 'American', emoji: '🍔' },
  { value: 'korean', label: 'Korean', emoji: '🍲' },
  { value: 'vietnamese', label: 'Vietnamese', emoji: '🍜' },
  { value: 'greek', label: 'Greek', emoji: '🥙' },
];

const dietaryOptions: { value: DietaryRestriction; label: string }[] = [
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'gluten-free', label: 'Gluten-free' },
  { value: 'dairy-free', label: 'Dairy-free' },
  { value: 'nut-free', label: 'Nut-free' },
  { value: 'keto', label: 'Keto' },
  { value: 'paleo', label: 'Paleo' },
  { value: 'halal', label: 'Halal' },
  { value: 'kosher', label: 'Kosher' },
];

const priceOptions: { value: PriceRange; label: string; description: string }[] = [
  { value: '$', label: 'Budget-friendly', description: 'Under $15 per person' },
  { value: '$$', label: 'Moderate', description: '$15-30 per person' },
  { value: '$$$', label: 'Upscale', description: '$30-60 per person' },
  { value: '$$$$', label: 'Fine dining', description: '$60+ per person' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, updatePreferences, isLoading } = useAuthStore();
  const { addNotification } = useAppStore();
  
  const [step, setStep] = useState(1);
  const [preferences, setPreferences] = useState({
    cuisineTypes: [] as Cuisine[],
    dietaryRestrictions: [] as DietaryRestriction[],
    priceRange: '$$' as PriceRange,
    maxDistance: 10,
    location: {
      latitude: 40.693957,
      longitude: -73.986525,
      address: '6 Metrotech Center, Brooklyn, NY, 11201'
    }
  });
  const [locationGranted, setLocationGranted] = useState(false);

  const totalSteps = 5;

  const handleCuisineToggle = (cuisine: Cuisine) => {
    setPreferences(prev => ({
      ...prev,
      cuisineTypes: prev.cuisineTypes.includes(cuisine)
        ? prev.cuisineTypes.filter(c => c !== cuisine)
        : [...prev.cuisineTypes, cuisine]
    }));
  };

  const requestLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          // Reverse geocode to get address
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
            );
            const data = await response.json();
            const address = data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            
            setPreferences(prev => ({
              ...prev,
              location: { latitude, longitude, address }
            }));
            setLocationGranted(true);
          } catch (err) {
            // Fallback to coordinates only
            setPreferences(prev => ({
              ...prev,
              location: {
                latitude,
                longitude,
                address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
              }
            }));
            setLocationGranted(true);
          }
        },
        (error) => {
          console.error('Location error:', error.code, error.message);
          addNotification({
            type: 'error',
            title: 'Location Access Denied',
            message: 'Using default location (New York, NY)'
          });
          // Use NYC as fallback
          setPreferences(prev => ({
            ...prev,
            location: {
              latitude: 40.7128,
              longitude: -74.0060,
              address: 'New York, NY'
            }
          }));
          setLocationGranted(true);
        }
      );
    } else {
      addNotification({
        type: 'error',
        title: 'Location Not Supported',
        message: 'Using default location (New York, NY)'
      });
      setPreferences(prev => ({
        ...prev,
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          address: 'New York, NY'
        }
      }));
      setLocationGranted(true);
    }
  };

  const handleDietaryToggle = (dietary: DietaryRestriction) => {
    setPreferences(prev => ({
      ...prev,
      dietaryRestrictions: prev.dietaryRestrictions.includes(dietary)
        ? prev.dietaryRestrictions.filter(d => d !== dietary)
        : [...prev.dietaryRestrictions, dietary]
    }));
  };

  const handleComplete = async () => {
    if (!user) return;
    
    const success = await updatePreferences(preferences);
    
    if (success) {
      addNotification({
        type: 'success',
        title: 'Welcome to FoodTok!',
        message: 'Your preferences have been saved. Let\'s start discovering restaurants!'
      });
      router.push('/');
    } else {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to save preferences. Please try again.'
      });
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return preferences.cuisineTypes.length > 0;
      case 2:
        return true; // Dietary restrictions are optional
      case 3:
        return true; // Price range has a default
      case 4:
        return locationGranted; // Must grant location
      case 5:
        return true; // Distance has a default
      default:
        return false;
    }
  };

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 p-4">
      <div className="mx-auto max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold gradient-text">              Let&apos;s personalize your FoodTok experience! Tell us about your food preferences so we can show you restaurants you&apos;ll love.</h1>
          <p className="mt-2 text-muted-foreground">
            Help us understand your food preferences to recommend the best restaurants for you
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Step {step} of {totalSteps}</span>
            <span>{Math.round((step / totalSteps) * 100)}% complete</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <motion.div
              className="bg-primary h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(step / totalSteps) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                {step === 1 && (
                  <>
                    <CardTitle>What cuisines do you enjoy?</CardTitle>
                    <CardDescription>
                      Select all the cuisines you love. We'll use this to find restaurants you'll enjoy.
                    </CardDescription>
                  </>
                )}
                {step === 2 && (
                  <>
                    <CardTitle>Any dietary restrictions?</CardTitle>
                    <CardDescription>
                      This helps us filter restaurants and menu items that work for you. (Optional)
                    </CardDescription>
                  </>
                )}
                {step === 3 && (
                  <>
                    <CardTitle>What's your typical budget?</CardTitle>
                    <CardDescription>
                      We'll prioritize restaurants in your preferred price range.
                    </CardDescription>
                  </>
                )}
                {step === 4 && (
                  <>
                    <CardTitle>Where are you located?</CardTitle>
                    <CardDescription>
                      Enable location access to get personalized restaurant recommendations near you.
                    </CardDescription>
                  </>
                )}
                {step === 5 && (
                  <>
                    <CardTitle>How far are you willing to travel?</CardTitle>
                    <CardDescription>
                      Set your maximum distance for restaurant recommendations from your location.
                    </CardDescription>
                  </>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {step === 1 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {cuisineOptions.map((option) => (
                      <Button
                        key={option.value}
                        variant={preferences.cuisineTypes.includes(option.value) ? "default" : "outline"}
                        className="h-auto p-4 flex flex-col gap-2"
                        onClick={() => handleCuisineToggle(option.value)}
                      >
                        <span className="text-2xl">{option.emoji}</span>
                        <span className="text-sm">{option.label}</span>
                      </Button>
                    ))}
                  </div>
                )}

                {step === 2 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {dietaryOptions.map((option) => (
                      <Button
                        key={option.value}
                        variant={preferences.dietaryRestrictions.includes(option.value) ? "default" : "outline"}
                        className="justify-start"
                        onClick={() => handleDietaryToggle(option.value)}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-3">
                    {priceOptions.map((option) => (
                      <Button
                        key={option.value}
                        variant={preferences.priceRange === option.value ? "default" : "outline"}
                        className="w-full h-auto p-4 flex justify-between items-center"
                        onClick={() => setPreferences(prev => ({ ...prev, priceRange: option.value }))}
                      >
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{option.value}</span>
                            <span>{option.label}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">{option.description}</div>
                        </div>
                      </Button>
                    ))}
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-6 text-center">
                    <div className="text-6xl mb-4">📍</div>
                    {!locationGranted ? (
                      <>
                        <p className="text-muted-foreground mb-4">
                          We need your location to show nearby restaurants and calculate accurate distances.
                        </p>
                        <Button
                          onClick={requestLocation}
                          size="lg"
                          className="w-full"
                        >
                          Enable Location
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          Your location is only used to find restaurants near you. We don&apos;t store or share it.
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="text-success font-semibold">✓ Location Enabled</div>
                        <p className="text-sm text-muted-foreground">
                          {preferences.location.address}
                        </p>
                      </>
                    )}
                  </div>
                )}

                {step === 5 && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-primary">{preferences.maxDistance} miles</div>
                      <p className="text-muted-foreground">Maximum distance from {preferences.location.address.split(',')[0]}</p>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="25"
                      value={preferences.maxDistance}
                      onChange={(e) => setPreferences(prev => ({ ...prev, maxDistance: parseInt(e.target.value) }))}
                      className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>1 mile</span>
                      <span>25 miles</span>
                    </div>
                  </div>
                )}

                <div className="flex justify-between pt-4">
                  {step > 1 ? (
                    <Button
                      variant="outline"
                      onClick={() => setStep(step - 1)}
                      disabled={isLoading}
                    >
                      Back
                    </Button>
                  ) : (
                    <div />
                  )}

                  {step < totalSteps ? (
                    <Button
                      onClick={() => setStep(step + 1)}
                      disabled={!canProceed() || isLoading}
                    >
                      Next
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleComplete}
                      disabled={!canProceed() || isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Complete Setup'
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}