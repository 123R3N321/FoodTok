/**
 * Authentication Layout
 * Shared layout for all authentication pages
 */

import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${inter.className} min-h-screen bg-gradient-to-br from-primary/5 to-accent/5`}>
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold gradient-text">FoodTok</h1>
            <p className="mt-2 text-muted-foreground">
              Discover your next favorite meal
            </p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}