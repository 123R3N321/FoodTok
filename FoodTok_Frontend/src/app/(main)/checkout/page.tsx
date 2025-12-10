'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, Calendar, Clock, Users, CreditCard, Check, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import HoldTimer from '@/components/reservation/HoldTimer';
import { confirmReservation, getUserActiveHold } from '@/lib/api';
import { useReservationStore, useAuthStore } from '@/lib/stores';
import type { Hold, Reservation } from '@/types/reservation';

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const clearHold = useReservationStore((state) => state.clearHold);
  
  const [hold, setHold] = useState<Hold | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [reservation, setReservation] = useState<Reservation | null>(null);
  
  // Payment form state
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [name, setName] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');

  useEffect(() => {
    loadActiveHold();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadActiveHold = async () => {
    if (!user?.id) {
      router.push('/login');
      return;
    }
    
    try {
      console.log('🔍 Checking for hold in zustand store...');
      const currentHold = useReservationStore.getState().activeHold;
      
      if (currentHold) {
        console.log('✅ Found hold in store:', currentHold);
        console.log('✅ expiresAt:', currentHold.expiresAt, new Date(currentHold.expiresAt).toISOString());
        setHold(currentHold);
        setLoading(false);
        return;
      }
      
      console.log('⚠️ No hold in store, trying backend...');
      // Fallback to backend (shouldn't happen normally)
      const backendHold = await getUserActiveHold(user.id);
      if (!backendHold) {
        console.error('❌ No active hold found anywhere');
        router.push('/');
        return;
      }
      
      setHold(backendHold);
    } catch (err: any) {
      console.error('❌ Error loading hold:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExpired = () => {
    console.log('⏰ Hold expired, clearing and redirecting');
    clearHold();
    router.push('/');
  };

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '');
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    return formatted.substring(0, 19);
  };

  const formatExpiry = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4);
    }
    return cleaned;
  };

  const validateCardNumber = (num: string): boolean => {
    // Luhn algorithm for card validation
    const cleaned = num.replace(/\s/g, '');
    if (!/^\d{16}$/.test(cleaned)) return false;
    
    let sum = 0;
    let isEven = false;
    
    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned[i]);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  };

  const validateExpiry = (exp: string): boolean => {
    if (exp.length !== 5) return false;
    
    const [month, year] = exp.split('/').map(Number);
    if (!month || !year) return false;
    if (month < 1 || month > 12) return false;
    
    // Check if card is expired
    const now = new Date();
    const currentYear = now.getFullYear() % 100; // Last 2 digits
    const currentMonth = now.getMonth() + 1;
    
    if (year < currentYear) return false;
    if (year === currentYear && month < currentMonth) return false;
    
    return true;
  };

  const validatePayment = (): boolean => {
    // Validate card number with Luhn algorithm
    if (!validateCardNumber(cardNumber)) {
      setError('Invalid card number. Please check and try again.');
      return false;
    }
    
    // Validate expiry date
    if (!validateExpiry(expiry)) {
      setError('Card has expired or expiry date is invalid.');
      return false;
    }
    
    // Validate CVV
    if (!/^\d{3,4}$/.test(cvv)) {
      setError('Invalid CVV. Must be 3 or 4 digits.');
      return false;
    }
    
    // Validate name
    if (!name.trim() || name.trim().length < 3) {
      setError('Please enter the cardholder name.');
      return false;
    }
    
    return true;
  };

  const handleConfirmReservation = async () => {
    if (!hold || !user?.id) return;
    
    setError('');
    
    if (!validatePayment()) {
      return;
    }

    setProcessing(true);

    try {
      console.log('💳 Processing payment for reservation...');
      console.log('💰 Deposit amount:', hold.depositAmount);
      console.log('👤 User ID:', user.id);
      
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const result = await confirmReservation({
        holdId: hold.holdId,
        userId: user.id,
        paymentMethod: {
          type: 'credit-card',
          last4: cardNumber.replace(/\s/g, '').slice(-4),
          cardholderName: name,
          expiryMonth: expiry.split('/')[0],
          expiryYear: '20' + expiry.split('/')[1],
        },
        specialRequests: specialRequests || undefined,
      });

      console.log('✅ Reservation confirmed:', result.reservation);
      
      // Backend doesn't return date/time, use them from hold
      const completeReservation = {
        ...result.reservation,
        date: result.reservation.date || hold.date,
        time: result.reservation.time || hold.time,
        partySize: result.reservation.partySize || hold.partySize,
        depositAmount: result.reservation.depositAmount || hold.depositAmount,
        restaurantName: result.reservation.restaurantName || hold.restaurantName,
        restaurantId: result.reservation.restaurantId || hold.restaurantId,
      };
      
      console.log('✅ Complete reservation with hold data:', completeReservation);
      setReservation(completeReservation as any);
      
      // Clear the hold from store
      clearHold();
    } catch (err: any) {
      console.error('❌ Payment processing failed:', err);
      setError(err.message || 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hold) {
    return null;
  }

  if (reservation) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-12">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center space-y-6"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto w-20 h-20 bg-green-500 rounded-full flex items-center justify-center"
            >
              <Check className="h-10 w-10 text-white" />
            </motion.div>

            <div className="space-y-2">
              <h1 className="text-3xl font-bold">
                Reservation Confirmed!
              </h1>
              <p className="text-lg text-muted-foreground">
                Your table is reserved at {reservation.restaurantName}
              </p>
            </div>

            <Card className="border-2 border-green-500/20 bg-green-500/10">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-2">Confirmation Code</p>
                <p className="text-3xl font-bold text-green-500 tracking-wider">
                  {reservation.confirmationCode}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Show this code when you arrive
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 space-y-4 text-left">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-semibold">
                      {(() => {
                        try {
                          if (!reservation.date) {
                            console.error('❌ No reservation.date field:', reservation);
                            return 'Date not available';
                          }
                          // reservation.date could be "2025-12-13" or a timestamp
                          const dateStr = String(reservation.date);
                          console.log('📅 Parsing date:', dateStr);
                          
                          // Try parsing as ISO date first
                          let dateObj = new Date(dateStr);
                          
                          // If invalid, try appending time
                          if (isNaN(dateObj.getTime())) {
                            dateObj = new Date(dateStr + 'T00:00:00');
                          }
                          
                          if (isNaN(dateObj.getTime())) {
                            console.error('❌ Could not parse date:', dateStr);
                            return dateStr;
                          }
                          
                          return dateObj.toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          });
                        } catch (e) {
                          console.error('❌ Date parse error:', e, reservation.date);
                          return reservation.date ? String(reservation.date) : 'Date not available';
                        }
                      })()}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Time</p>
                    <p className="font-semibold">{reservation.time}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Party Size</p>
                    <p className="font-semibold">{reservation.partySize} guests</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Deposit Paid</p>
                    <p className="font-semibold">${reservation.depositAmount.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">$25 per person</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button variant="outline" onClick={() => router.push('/')} className="flex-1">
                Back to Home
              </Button>
              <Button onClick={() => router.push('/reservations')} className="flex-1">
                View All Reservations
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  const depositPerPerson = hold?.depositAmount ? (hold.depositAmount / (hold.partySize || 1)) : 25;
  const totalDeposit = hold?.depositAmount || (depositPerPerson * (hold?.partySize || 1));
  const partySize = hold?.partySize || 0;
  const holdDate = hold?.date ? new Date(hold.date) : new Date();
  const holdTime = hold?.time || '';
  const restaurantName = hold?.restaurantName || 'Restaurant';

  return (
    <div className="min-h-screen pb-20">
      <div className="sticky top-0 z-50 bg-background border-b">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <HoldTimer
            hold={hold}
            onExpired={handleExpired}
          />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4">
        <Button
          variant="ghost"
          onClick={() => {
            console.log('⬅️ Back button clicked - clearing hold');
            clearHold();
            router.back();
          }}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 pb-8">
        <h1 className="text-3xl font-bold mb-8">Complete Your Reservation</h1>

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <p className="text-red-800">{error}</p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">Reservation Details</h2>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Restaurant</p>
                    <p className="font-semibold text-lg">{restaurantName}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Date</p>
                      <p className="font-medium">
                        {holdDate.toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Time</p>
                      <p className="font-medium">{holdTime || 'Not selected'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Party Size</p>
                      <p className="font-medium">{partySize} guests</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Deposit (${depositPerPerson.toFixed(2)} × {partySize})</span>
                      <span className="font-medium">${totalDeposit.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total Deposit</span>
                      <span>${totalDeposit.toFixed(2)}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    💡 This deposit secures your table. Refund policy: 100% refund 24+ hours before, 50% refund 4-24 hours before, no refund within 4 hours.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <label className="block text-sm font-medium mb-2">
                  Special Requests (Optional)
                </label>
                <Textarea
                  value={specialRequests}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSpecialRequests(e.target.value)}
                  placeholder="Allergies, seating preferences, celebrations, etc."
                  rows={4}
                  className="w-full"
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">Payment Information</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Card Number
                    </label>
                    <Input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      placeholder="4242 4242 4242 4242"
                      maxLength={19}
                      className="w-full"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Expiry Date
                      </label>
                      <Input
                        type="text"
                        value={expiry}
                        onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                        placeholder="MM/YY"
                        maxLength={5}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        CVV
                      </label>
                      <Input
                        type="text"
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').substring(0, 3))}
                        placeholder="123"
                        maxLength={3}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Cardholder Name
                    </label>
                    <Input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleConfirmReservation}
                  disabled={processing}
                  className="w-full mt-6 bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  size="lg"
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-5 w-5 mr-2" />
                      Pay ${totalDeposit.toFixed(2)} & Confirm
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
