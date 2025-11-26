'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, Users, ChevronRight, AlertCircle } from 'lucide-react';
import { checkAvailability, createHold } from '@/lib/api';
import type { TimeSlot, Hold } from '@/types/reservation';

interface ReservationModalProps {
  restaurantId: string;
  restaurantName: string;
  restaurantImage?: string;
  isOpen: boolean;
  onClose: () => void;
  onHoldCreated: (holdData: any) => void;
}

export default function ReservationModal({
  restaurantId,
  restaurantName,
  restaurantImage,
  isOpen,
  onClose,
  onHoldCreated,
}: ReservationModalProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form state
  const [selectedDate, setSelectedDate] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedTime, setSelectedTime] = useState('');
  const [depositInfo, setDepositInfo] = useState({ perPerson: 0, total: 0 });

  // Generate next 30 days
  const generateDates = () => {
    const dates = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      dates.push({
        value: date.toISOString().split('T')[0],
        label: date.toLocaleDateString('en-US', { 
          weekday: 'short', 
          month: 'short', 
          day: 'numeric' 
        }),
        dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'long' }),
      });
    }
    return dates;
  };

  const dates = generateDates();

  // Step 1: Check availability when date/party changes
  const handleCheckAvailability = async () => {
    if (!selectedDate) {
      setError('Please select a date');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await checkAvailability({
        restaurantId,
        date: selectedDate,
        partySize,
      });

      console.log('📅 Availability result:', result);

      // Handle cases where slots might be undefined or null
      const slots = result?.slots || [];
      const availableSlots = slots.filter((s: any) => s.available);
      
      setAvailableSlots(availableSlots);
      setDepositInfo({
        perPerson: result?.depositPerPerson || 25,
        total: result?.totalDeposit || (25 * partySize),
      });
      
      if (availableSlots.length === 0) {
        setError('No availability for this date. Please try another day.');
      } else {
        setStep(2);
      }
    } catch (err: any) {
      console.error('❌ Availability check error:', err);
      setError(err.message || 'Failed to check availability. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Create hold
  const handleCreateHold = async () => {
    if (!selectedTime) {
      setError('Please select a time');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await createHold({
        userId: 'current_user', // Replace with actual user ID from auth
        restaurantId,
        date: selectedDate,
        time: selectedTime,
        partySize,
      });

      // Pass full context including restaurant info
      const holdWithContext = {
        hold: result.hold,
        restaurantName,
        restaurantImage: restaurantImage || '',
        totalDeposit: depositInfo.total || (depositInfo.perPerson * partySize) || 50
      };

      console.log('📤 Passing hold to parent with context:', holdWithContext);
      console.log('📤 Hold expiresAt:', result.hold.expiresAt);
      onHoldCreated(holdWithContext);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep(1);
        setSelectedDate('');
        setSelectedTime('');
        setPartySize(2);
        setError('');
      }, 300);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            style={{ pointerEvents: 'auto' }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-lg bg-gray-900 rounded-2xl shadow-2xl z-50 max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="relative h-32 bg-gradient-to-br from-primary to-primary/80">
              {restaurantImage ? (
                <img 
                  src={restaurantImage} 
                  alt={restaurantName}
                  className="w-full h-full object-cover opacity-50"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-4xl opacity-50">
                  🍽️
                </div>
              )}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70"
              >
                <X size={20} />
              </button>
              <div className="absolute bottom-4 left-4">
                <h2 className="text-2xl font-bold text-white">{restaurantName}</h2>
                <p className="text-white/90 text-sm">Reserve Your Table</p>
              </div>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center justify-center gap-2 py-4 bg-gray-800 border-b border-gray-700">
              <div className={`flex items-center gap-2 ${step >= 1 ? 'text-primary' : 'text-gray-500'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 1 ? 'bg-primary text-white' : 'bg-gray-700 text-gray-400'}`}>
                  1
                </div>
                <span className="text-sm font-medium hidden sm:inline">Date & Party</span>
              </div>
              <ChevronRight className="text-gray-600" size={16} />
              <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary' : 'text-gray-500'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 2 ? 'bg-primary text-white' : 'bg-gray-700 text-gray-400'}`}>
                  2
                </div>
                <span className="text-sm font-medium hidden sm:inline">Select Time</span>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-900">
              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-800"
                >
                  <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{error}</p>
                </motion.div>
              )}

              {/* Step 1: Date & Party Size */}
              {step === 1 && (
                <div className="space-y-6">
                  {/* Date Selection */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-200 mb-3">
                      <Calendar size={18} />
                      Select Date
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                      {dates.map((date) => (
                        <button
                          key={date.value}
                          onClick={() => setSelectedDate(date.value)}
                          className={`p-3 rounded-xl border-2 text-left transition-all ${
                            selectedDate === date.value
                              ? 'border-primary bg-primary text-white shadow-lg scale-105'
                              : 'border-gray-600 dark:border-gray-600 bg-gray-800 dark:bg-gray-800 hover:border-primary hover:bg-gray-700'
                          }`}
                        >
                          <div className="text-xs opacity-80">{date.dayOfWeek}</div>
                          <div className="font-semibold text-sm">{date.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Party Size */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-200 mb-3">
                      <Users size={18} />
                      Party Size
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setPartySize(Math.max(1, partySize - 1))}
                        disabled={partySize <= 1}
                        className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
                      >
                        −
                      </button>
                      <div className="flex-1 text-center">
                        <div className="text-3xl font-bold text-primary">{partySize}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">guests</div>
                      </div>
                      <button
                        onClick={() => setPartySize(Math.min(20, partySize + 1))}
                        disabled={partySize >= 20}
                        className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Deposit Info */}
                  <div className="p-4 bg-gray-800 rounded-xl border border-primary/30">
                    <div className="text-sm text-gray-300 mb-1">Deposit Required:</div>
                    <div className="text-xl font-bold text-primary">
                      ${25} per person × {partySize} = ${25 * partySize}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      This reserves your table. Refundable with 24hr notice.
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Time Selection */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-200">
                    <Clock size={18} />
                    Available Times for {dates.find(d => d.value === selectedDate)?.label}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 max-h-96 overflow-y-auto">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot.time}
                        onClick={() => setSelectedTime(slot.time)}
                        className={`p-3 rounded-xl border-2 transition-all ${
                          selectedTime === slot.time
                            ? 'border-primary bg-primary text-white shadow-lg scale-105'
                            : 'border-gray-600 bg-gray-800 hover:border-primary hover:bg-gray-700'
                        }`}
                      >
                        <div className="text-lg font-bold">{slot.time}</div>
                        <div className="text-xs opacity-80">
                          {slot.remainingCapacity} tables
                        </div>
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setStep(1)}
                    className="w-full py-2 text-sm text-gray-400 hover:text-gray-200"
                  >
                    ← Change Date or Party Size
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 bg-gray-800 border-t border-gray-700">
              <button
                onClick={step === 1 ? handleCheckAvailability : handleCreateHold}
                disabled={loading || (step === 1 ? !selectedDate : !selectedTime)}
                className="w-full py-4 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {step === 1 ? 'Checking...' : 'Creating Hold...'}
                  </span>
                ) : (
                  step === 1 ? 'Check Availability' : 'Reserve Table (10 Minutes)'
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
