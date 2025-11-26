/**
 * Cart Store
 * Manages shopping cart state and related actions
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, MenuItem, Restaurant, Cart } from '@/types';
import { generateId } from '@/lib/utils';

interface CartState {
  cart: Cart | null;
  isOpen: boolean;
}

interface CartActions {
  addItem: (restaurant: Restaurant, menuItem: MenuItem, quantity?: number, customizations?: any[]) => void;
  removeItem: (menuItemId: string) => void;
  updateItemQuantity: (menuItemId: string, quantity: number) => void;
  clearCart: () => void;
  setCartOpen: (isOpen: boolean) => void;
  calculateTotals: () => void;
}

type CartStore = CartState & CartActions;

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      // Initial state
      cart: null,
      isOpen: false,

      // Actions
      addItem: (restaurant: Restaurant, menuItem: MenuItem, quantity = 1, customizations = []) => {
        const { cart } = get();
        
        // If cart exists and it's from a different restaurant, clear it
        if (cart && cart.restaurantId !== restaurant.id) {
          get().clearCart();
        }
        
        const newCartItem: CartItem = {
          menuItem,
          quantity,
          customizations: customizations.map(c => ({
            name: c.name,
            price: c.price,
            selected: c.selected
          }))
        };
        
        const currentCart = get().cart;
        
        if (!currentCart) {
          // Create new cart
          const newCart: Cart = {
            restaurantId: restaurant.id,
            items: [newCartItem],
            subtotal: 0,
            tax: 0,
            deliveryFee: 3.99, // Standard delivery fee
            total: 0,
            estimatedDeliveryTime: 30
          };
          
          set({ cart: newCart });
        } else {
          // Add to existing cart
          const existingItemIndex = currentCart.items.findIndex(
            item => item.menuItem.id === menuItem.id
          );
          
          if (existingItemIndex >= 0) {
            // Update quantity of existing item
            const updatedItems = [...currentCart.items];
            updatedItems[existingItemIndex].quantity += quantity;
            
            set({
              cart: {
                ...currentCart,
                items: updatedItems
              }
            });
          } else {
            // Add new item to cart
            set({
              cart: {
                ...currentCart,
                items: [...currentCart.items, newCartItem]
              }
            });
          }
        }
        
        get().calculateTotals();
      },

      removeItem: (menuItemId: string) => {
        const { cart } = get();
        if (!cart) return;
        
        const updatedItems = cart.items.filter(item => item.menuItem.id !== menuItemId);
        
        if (updatedItems.length === 0) {
          set({ cart: null });
        } else {
          set({
            cart: {
              ...cart,
              items: updatedItems
            }
          });
          get().calculateTotals();
        }
      },

      updateItemQuantity: (menuItemId: string, quantity: number) => {
        const { cart } = get();
        if (!cart) return;
        
        if (quantity <= 0) {
          get().removeItem(menuItemId);
          return;
        }
        
        const updatedItems = cart.items.map(item =>
          item.menuItem.id === menuItemId
            ? { ...item, quantity }
            : item
        );
        
        set({
          cart: {
            ...cart,
            items: updatedItems
          }
        });
        
        get().calculateTotals();
      },

      clearCart: () => {
        set({ cart: null });
      },

      setCartOpen: (isOpen: boolean) => {
        set({ isOpen });
      },

      calculateTotals: () => {
        const { cart } = get();
        if (!cart) return;
        
        // Calculate subtotal
        const subtotal = cart.items.reduce((total, item) => {
          const itemPrice = item.menuItem.price;
          const customizationPrice = item.customizations?.reduce(
            (sum, custom) => sum + (custom.selected ? custom.price : 0),
            0
          ) || 0;
          return total + ((itemPrice + customizationPrice) * item.quantity);
        }, 0);
        
        // Calculate tax (8.875% NYC tax)
        const tax = subtotal * 0.08875;
        
        // Calculate total
        const total = subtotal + tax + cart.deliveryFee;
        
        set({
          cart: {
            ...cart,
            subtotal,
            tax,
            total
          }
        });
      }
    }),
    {
      name: 'foodtok-cart'
    }
  )
);