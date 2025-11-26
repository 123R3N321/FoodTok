/**
 * Main Application Layout
 * Shared layout for authenticated users with navigation
 */

'use client';

import { Inter } from 'next/font/google';
import { useAuthStore, useCartStore } from '@/lib/stores';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Home, User, ShoppingBag, Settings, Heart, Calendar } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const inter = Inter({ subsets: ['latin'] });

const navigationItems = [
  { href: '/', label: 'Discover', icon: Home },
  { href: '/favorites', label: 'Favorites', icon: Heart },
  { href: '/reservations', label: 'Reservations', icon: Calendar },
  { href: '/profile', label: 'Profile', icon: User },
];

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, user } = useAuthStore();
  const { cart } = useCartStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Add a small delay to ensure Zustand store has hydrated
    const timer = setTimeout(() => {
      if (!isAuthenticated) {
        router.replace('/login');
      }
      // Don't redirect to onboarding automatically - let user navigate manually if needed
      // This prevents infinite loops when preferences fail to save
    }, 100);

    return () => clearTimeout(timer);
  }, [isAuthenticated, router]);

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className={`${inter.className} min-h-screen bg-background`}>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold gradient-text">FoodTok</h1>
          </Link>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-foreground font-medium">
              Hi, {user.firstName || 'User'}!
            </span>
            <Link href="/settings">
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 pb-20">
        {children}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t">
        <div className="container px-4">
          <div className="flex items-center justify-around py-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              // No badge for now - can add reservation count later if needed

              return (
                <Link key={item.href} href={item.href} className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "flex flex-col items-center space-y-1 h-auto py-2 px-3",
                      isActive && "text-primary"
                    )}
                  >
                    <div className="relative">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs">{item.label}</span>
                  </Button>
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute -top-0.5 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ type: "spring", duration: 0.3 }}
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}