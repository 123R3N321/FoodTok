'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, AlertTriangle } from 'lucide-react';
import type { Hold } from '@/types/reservation';

interface HoldTimerProps {
  hold: Hold;
  onExpired: () => void;
}

export default function HoldTimer({ hold, onExpired }: HoldTimerProps) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const calculateTimeLeft = () => {
      // Handle missing or invalid expiresAt
      if (!hold.expiresAt || isNaN(hold.expiresAt)) {
        console.warn('⚠️ Invalid expiresAt timestamp:', hold.expiresAt);
        // Default to 10 minutes from now
        const fallbackExpiry = Date.now() + (10 * 60 * 1000);
        setTimeLeft(fallbackExpiry - Date.now());
        return;
      }

      const remaining = Math.max(0, hold.expiresAt - Date.now());
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        onExpired();
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [hold.expiresAt, onExpired]);

  const totalSeconds = Math.floor(timeLeft / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const percentage = Math.min(100, Math.max(0, (timeLeft / (10 * 60 * 1000)) * 100));

  const isUrgent = minutes < 2;
  const isCritical = minutes < 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-30 p-4"
    >
      <div className="max-w-4xl mx-auto bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">
        <div className="p-4">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <motion.div
                animate={isUrgent ? { scale: [1, 1.15, 1] } : {}}
                transition={{ repeat: Infinity, duration: 1 }}
                className={`p-2 rounded-xl ${
                  isCritical
                    ? 'bg-red-500/20'
                    : isUrgent
                    ? 'bg-orange-500/20'
                    : 'bg-primary/20'
                }`}
              >
                {isUrgent ? (
                  <AlertTriangle 
                    size={20} 
                    className={isCritical ? 'text-red-400' : 'text-orange-400'} 
                  />
                ) : (
                  <Clock size={20} className="text-primary" />
                )}
              </motion.div>
              <div>
                <div className={`text-sm font-semibold ${
                  isCritical
                    ? 'text-red-400'
                    : isUrgent
                    ? 'text-orange-400'
                    : 'text-gray-200'
                }`}>
                  {isCritical
                    ? '⚠️ EXPIRING SOON!'
                    : isUrgent
                    ? '⚠️ Almost out of time!'
                    : '⏰ Hold Active'}
                </div>
                <div className="text-xs text-gray-400">
                  Complete payment to secure your reservation
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className={`text-3xl font-bold font-mono ${
                isCritical
                  ? 'text-red-400'
                  : isUrgent
                  ? 'text-orange-400'
                  : 'text-primary'
              }`}>
                {minutes}:{seconds.toString().padStart(2, '0')}
              </div>
              <div className="text-xs text-gray-400">remaining</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 h-3 bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${
                isCritical
                  ? 'bg-gradient-to-r from-red-500 to-red-600'
                  : isUrgent
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600'
                  : 'bg-gradient-to-r from-primary to-blue-500'
              }`}
              initial={{ width: '100%' }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          {/* Warning Messages */}
          {isUrgent && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className={`mt-3 text-xs font-medium ${
                isCritical ? 'text-red-400' : 'text-orange-400'
              }`}
            >
              {isCritical ? (
                <span>
                  🔥 Your hold will expire in less than 1 minute! Complete payment now to keep your table.
                </span>
              ) : (
                <span>
                  ⚡ Only {minutes} minute{minutes !== 1 ? 's' : ''} left to complete your reservation.
                </span>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
