/**
 * Cart Page
 * Review cart items and proceed to checkout
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useCartStore } from '@/lib/stores';
import { 
  Minus, 
  Plus, 
  Trash2, 
  ShoppingCart,
  ArrowRight,
  MapPin,
  Clock
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export default function CartPage() {
  const router = useRouter();
  const { cart, updateItemQuantity, removeItem, clearCart } = useCartStore();
  const [promoCode, setPromoCode] = useState('');
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);

  const handleQuantityChange = (menuItemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(menuItemId);
    } else {
      updateItemQuantity(menuItemId, newQuantity);
    }
  };

  const handleApplyPromo = async () => {
    setIsApplyingPromo(true);
    // Simulate promo code application
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsApplyingPromo(false);
    // You could add actual promo code logic here
  };

  if (!cart || cart.items.length === 0) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-md mx-auto">
          <div className="text-6xl">🛒</div>
          <div>
            <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
            <p className="text-muted-foreground">
              Browse restaurants and add some delicious items to your cart!
            </p>
          </div>
          <Button onClick={() => router.push('/')} size="lg">
            Start Discovering
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32">
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Your Cart</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={clearCart}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Cart
          </Button>
        </div>

        {/* Restaurant Info */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Order from Restaurant</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>Est. delivery: {cart.estimatedDeliveryTime} mins</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cart Items */}
        <Card>
          <CardHeader>
            <CardTitle>Items ({cart.items.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AnimatePresence>
              {cart.items.map((item) => (
                <motion.div
                  key={item.menuItem.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-b border-border pb-4 last:border-b-0 last:pb-0"
                >
                  <div className="flex gap-4">
                    {/* Item Image */}
                    {item.menuItem.image && (
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                        <Image
                          src={item.menuItem.image}
                          alt={item.menuItem.name}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      </div>
                    )}
                    
                    {/* Item Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium truncate">{item.menuItem.name}</h4>
                        <span className="text-sm font-semibold flex-shrink-0 ml-2">
                          {formatCurrency(item.menuItem.price * item.quantity)}
                        </span>
                      </div>
                      
                      {item.specialInstructions && (
                        <p className="text-sm text-muted-foreground mb-2">
                          Note: {item.specialInstructions}
                        </p>
                      )}

                      {/* Quantity Controls */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center border rounded-lg">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleQuantityChange(item.menuItem.id, item.quantity - 1)}
                            className="h-8 w-8 p-0"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="px-3 text-sm font-medium min-w-[2rem] text-center">
                            {item.quantity}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleQuantityChange(item.menuItem.id, item.quantity + 1)}
                            className="h-8 w-8 p-0"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.menuItem.id)}
                          className="text-destructive hover:text-destructive p-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Promo Code */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter promo code"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={handleApplyPromo}
                disabled={!promoCode || isApplyingPromo}
              >
                {isApplyingPromo ? 'Applying...' : 'Apply'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatCurrency(cart.subtotal)}</span>
            </div>
            
            <div className="flex justify-between">
              <span>Delivery Fee</span>
              <span>{formatCurrency(cart.deliveryFee)}</span>
            </div>
            
            <div className="flex justify-between">
              <span>Tax</span>
              <span>{formatCurrency(cart.tax)}</span>
            </div>
            
            <hr />
            
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>{formatCurrency(cart.total)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fixed Checkout Button */}
      <div className="fixed bottom-20 left-0 right-0 p-4 bg-background border-t">
        <div className="max-w-2xl mx-auto">
          <Button
            size="lg"
            className="w-full"
            onClick={() => router.push('/checkout')}
          >
            Proceed to Checkout • {formatCurrency(cart.total)}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}