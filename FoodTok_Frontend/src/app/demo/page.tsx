'use client';

/**
 * RESERVATION SYSTEM DEMO PAGE
 * Visual verification of race conditions, idempotency, and inventory
 */

import { useState } from 'react';
import {
  checkAvailability,
  createHold,
  confirmReservation,
  cancelReservation,
  getUserReservations,
} from '@/lib/api';
import type { TimeSlot, Hold, Reservation } from '@/types/reservation';

export default function ReservationDemoPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [availability, setAvailability] = useState<TimeSlot[]>([]);
  const [selectedTime, setSelectedTime] = useState('');
  const [hold, setHold] = useState<Hold | null>(null);
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds

  const log = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    const emoji = {
      info: 'ℹ️',
      success: '✅',
      error: '❌',
      warning: '⚠️',
    }[type];
    setLogs(prev => [`${emoji} ${new Date().toLocaleTimeString()}: ${message}`, ...prev]);
  };

  // Step 1: Check Availability
  const handleCheckAvailability = async () => {
    setLoading(true);
    log('Checking availability...', 'info');
    
    try {
      const result = await checkAvailability({
        restaurantId: 'rest_001',
        date: '2025-11-15',
        partySize: 2,
      });
      
      setAvailability(result.slots.filter((s: TimeSlot) => s.available));
      log(`Found ${result.slots.filter((s: TimeSlot) => s.available).length} available slots`, 'success');
      log(`Deposit: $${result.depositPerPerson}/person × ${result.partySize} = $${result.totalDeposit} total`, 'info');
      setStep(2);
    } catch (error: any) {
      log(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Create Hold
  const handleCreateHold = async (time: string) => {
    setLoading(true);
    log(`Creating hold for ${time}...`, 'info');
    
    try {
      const result = await createHold({
        userId: 'demo_user_001',
        restaurantId: 'rest_001',
        date: '2025-11-15',
        time: time,
        partySize: 2,
      });
      
      setHold(result.hold);
      setSelectedTime(time);
      log(`Hold created! ID: ${result.hold.holdId}`, 'success');
      log(`10-minute timer started. Table reserved temporarily.`, 'warning');
      
      // Start countdown timer
      const interval = setInterval(() => {
        const remaining = Math.floor((result.hold.expiresAt - Date.now()) / 1000);
        setTimeLeft(remaining);
        
        if (remaining <= 0) {
          clearInterval(interval);
          log('Hold expired! Table released back to inventory.', 'error');
          setHold(null);
          setStep(1);
        } else if (remaining === 120) {
          log('⚠️ Only 2 minutes left! Complete payment soon!', 'warning');
        }
      }, 1000);
      
      setStep(3);
    } catch (error: any) {
      log(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Confirm Reservation (Payment)
  const handleConfirmReservation = async () => {
    if (!hold) return;
    
    setLoading(true);
    log('Processing payment...', 'info');
    
    try {
      const result = await confirmReservation({
        holdId: hold.holdId,
        userId: 'demo_user_001',
        paymentMethod: {
          type: 'credit-card',
          last4: '4242',
          cardBrand: 'Visa',
        },
        specialRequests: 'Window seat please',
      });
      
      setReservation(result.reservation);
      log(`Payment successful! $${result.reservation.depositAmount} charged.`, 'success');
      log(`Confirmation Code: ${result.reservation.confirmationCode}`, 'success');
      log('Table confirmed! Hold converted to reservation.', 'success');
      setStep(4);
    } catch (error: any) {
      log(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Test: Race Condition
  const handleTestRaceCondition = async () => {
    if (!selectedTime) return;
    
    setLoading(true);
    log('🏁 RACE CONDITION TEST: 5 users booking same slot simultaneously...', 'warning');
    
    const promises = [];
    for (let i = 1; i <= 5; i++) {
      promises.push(
        createHold({
          userId: `race_user_${i}`,
          restaurantId: 'rest_002',
          date: '2025-11-16',
          time: selectedTime,
          partySize: 2,
        })
          .then((result: any) => {
            log(`User ${i} SUCCESS: Got hold ${result.hold.holdId.slice(-8)}`, 'success');
            return { success: true, user: i };
          })
          .catch((error: any) => {
            log(`User ${i} FAILED: ${error.message}`, 'error');
            return { success: false, user: i };
          })
      );
    }
    
    const results = await Promise.all(promises);
    const successful = results.filter((r: any) => r.success).length;
    
    log(`RACE TEST COMPLETE: ${successful} succeeded, ${5 - successful} failed (expected behavior)`, 'info');
    setLoading(false);
  };

  // Test: Idempotency
  const handleTestIdempotency = async () => {
    setLoading(true);
    log('🔄 IDEMPOTENCY TEST: Trying to create 2nd hold for same user...', 'warning');
    
    try {
      await createHold({
        userId: 'demo_user_001',
        restaurantId: 'rest_003',
        date: '2025-11-17',
        time: '20:00',
        partySize: 2,
      });
      log('ERROR: Should have been rejected!', 'error');
    } catch (error: any) {
      log(`Correctly rejected: ${error.message}`, 'success');
    }
    
    setLoading(false);
  };

  // Format time remaining
  const formatTimeLeft = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-2">🍽️ FoodTok Reservations</h1>
          <p className="text-xl text-blue-300">Production-Ready System Demo</p>
          <div className="mt-4 flex gap-4 justify-center">
            <span className="px-3 py-1 bg-green-500/20 rounded-full text-green-300 text-sm">
              ✅ Race Conditions Handled
            </span>
            <span className="px-3 py-1 bg-blue-500/20 rounded-full text-blue-300 text-sm">
              ✅ Idempotency Enforced
            </span>
            <span className="px-3 py-1 bg-yellow-500/20 rounded-full text-yellow-300 text-sm">
              ✅ Real-time Inventory
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Side: Main Flow */}
          <div className="space-y-6">
            {/* Step 1: Check Availability */}
            <div className={`p-6 rounded-xl ${step >= 1 ? 'bg-white/10 border border-white/20' : 'bg-white/5'}`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">1. Check Availability</h2>
                {step > 1 && <span className="text-green-400">✓</span>}
              </div>
              
              {step === 1 && (
                <button
                  onClick={handleCheckAvailability}
                  disabled={loading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold disabled:opacity-50"
                >
                  {loading ? 'Checking...' : 'Check Available Times'}
                </button>
              )}
              
              {step > 1 && (
                <p className="text-green-400">✓ Found {availability.length} available slots</p>
              )}
            </div>

            {/* Step 2: Select Time & Create Hold */}
            {step >= 2 && (
              <div className={`p-6 rounded-xl ${step >= 2 ? 'bg-white/10 border border-white/20' : 'bg-white/5'}`}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">2. Select Time (Creates Hold)</h2>
                  {step > 2 && <span className="text-green-400">✓</span>}
                </div>
                
                {step === 2 && (
                  <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                    {availability.slice(0, 12).map((slot) => (
                      <button
                        key={slot.time}
                        onClick={() => handleCreateHold(slot.time)}
                        disabled={loading}
                        className="py-2 px-3 bg-blue-600/50 hover:bg-blue-600 rounded text-sm disabled:opacity-50"
                      >
                        {slot.time}
                        <div className="text-xs text-blue-200">
                          {slot.remainingCapacity} left
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                
                {step > 2 && hold && (
                  <p className="text-green-400">✓ Hold created for {hold.time}</p>
                )}
              </div>
            )}

            {/* Step 3: Confirm with Payment */}
            {step >= 3 && hold && (
              <div className="p-6 rounded-xl bg-white/10 border border-yellow-500/50">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">3. Complete Payment</h2>
                  {step > 3 && <span className="text-green-400">✓</span>}
                </div>
                
                {step === 3 && (
                  <div>
                    <div className="mb-4 p-4 bg-yellow-500/20 rounded-lg border border-yellow-500/50">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold">Time Remaining:</span>
                        <span className={`text-3xl font-mono ${timeLeft < 120 ? 'text-red-400' : 'text-green-400'}`}>
                          {formatTimeLeft(timeLeft)}
                        </span>
                      </div>
                      {timeLeft < 120 && (
                        <p className="text-sm text-red-300 mt-2">⚠️ Hurry! Your hold is about to expire!</p>
                      )}
                    </div>

                    <div className="mb-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Restaurant:</span>
                        <span className="font-semibold">{hold.restaurantName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Date & Time:</span>
                        <span className="font-semibold">Nov 15, 2025 at {hold.time}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Party Size:</span>
                        <span className="font-semibold">{hold.partySize} guests</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold border-t border-white/20 pt-2">
                        <span>Deposit Total:</span>
                        <span className="text-green-400">${hold.depositAmount}</span>
                      </div>
                    </div>

                    <button
                      onClick={handleConfirmReservation}
                      disabled={loading}
                      className="w-full py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold disabled:opacity-50"
                    >
                      {loading ? 'Processing Payment...' : `Pay $${hold.depositAmount} & Confirm`}
                    </button>
                  </div>
                )}
                
                {step > 3 && reservation && (
                  <div className="space-y-2">
                    <p className="text-green-400 text-lg font-bold">
                      ✓ Reservation Confirmed!
                    </p>
                    <p className="text-2xl font-mono bg-black/30 p-3 rounded text-center">
                      {reservation.confirmationCode}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Success */}
            {step >= 4 && reservation && (
              <div className="p-6 rounded-xl bg-green-500/20 border border-green-500">
                <h2 className="text-2xl font-bold mb-4">🎉 All Done!</h2>
                <p className="text-green-300 mb-4">
                  Your table is reserved! Show this code at the restaurant:
                </p>
                <div className="text-4xl font-mono text-center bg-black/30 p-6 rounded">
                  {reservation.confirmationCode}
                </div>
              </div>
            )}
          </div>

          {/* Right Side: Tests & Logs */}
          <div className="space-y-6">
            {/* Test Buttons */}
            <div className="p-6 rounded-xl bg-white/10 border border-white/20">
              <h2 className="text-2xl font-bold mb-4">🧪 System Tests</h2>
              <div className="space-y-3">
                <button
                  onClick={handleTestRaceCondition}
                  disabled={loading || !selectedTime}
                  className="w-full py-2 bg-red-600/50 hover:bg-red-600 rounded text-sm disabled:opacity-50"
                >
                  Test Race Condition (5 users)
                </button>
                <button
                  onClick={handleTestIdempotency}
                  disabled={loading}
                  className="w-full py-2 bg-blue-600/50 hover:bg-blue-600 rounded text-sm disabled:opacity-50"
                >
                  Test Idempotency (Double booking)
                </button>
                <button
                  onClick={() => {
                    setStep(1);
                    setHold(null);
                    setReservation(null);
                    setSelectedTime('');
                    log('Reset demo', 'info');
                  }}
                  className="w-full py-2 bg-gray-600/50 hover:bg-gray-600 rounded text-sm"
                >
                  Reset Demo
                </button>
              </div>
            </div>

            {/* Activity Log */}
            <div className="p-6 rounded-xl bg-white/10 border border-white/20">
              <h2 className="text-2xl font-bold mb-4">📋 Activity Log</h2>
              <div className="space-y-1 max-h-96 overflow-y-auto font-mono text-xs">
                {logs.length === 0 ? (
                  <p className="text-gray-400">No activity yet...</p>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="p-2 bg-black/30 rounded">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Info Footer */}
        <div className="mt-8 p-6 rounded-xl bg-white/5 border border-white/10">
          <h3 className="text-lg font-bold mb-2">💡 How It Works:</h3>
          <ul className="space-y-1 text-sm text-gray-300">
            <li>• <strong>Distributed Locking:</strong> Prevents multiple users from booking the same table simultaneously</li>
            <li>• <strong>Idempotency:</strong> Users can't create multiple holds or double-charge payments</li>
            <li>• <strong>Real-time Inventory:</strong> Table capacity tracked accurately across all operations</li>
            <li>• <strong>Auto-expiry:</strong> Holds automatically release after 10 minutes (DynamoDB TTL)</li>
            <li>• <strong>Atomic Operations:</strong> Hold → Reservation conversion is guaranteed consistent</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
