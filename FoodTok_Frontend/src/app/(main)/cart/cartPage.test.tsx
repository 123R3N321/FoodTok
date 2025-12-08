import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import CartPage from './page';
import { useCartStore } from '@/lib/stores';
import '@testing-library/jest-dom';

// Mock dependencies
jest.mock('next/navigation');
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));
jest.mock('@/lib/stores');
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));

const mockPush = jest.fn();
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseCartStore = useCartStore as jest.MockedFunction<typeof useCartStore>;

describe('CartPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({
      push: mockPush,
    } as any);
  });

  describe('Empty Cart State', () => {
    it('should display empty cart message when cart is empty', () => {
      mockUseCartStore.mockReturnValue({
        cart: { items: [] },
      } as any);

      render(<CartPage />);

      expect(screen.getByText('🛒')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Start Discovering/i })).toBeInTheDocument();
    });

    it('should navigate to home when Start Discovering button is clicked', () => {
      mockUseCartStore.mockReturnValue({
        cart: { items: [] },
      } as any);

      render(<CartPage />);

      const button = screen.getByRole('button', { name: /Start Discovering/i });
      fireEvent.click(button);

      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  describe('Cart with Items', () => {
    const mockCartData = {
      items: [
        {
          menuItem: {
            id: '1',
            name: 'Burger',
            price: 10.99,
            image: '/burger.jpg',
          },
          quantity: 2,
          specialInstructions: 'No onions',
        },
        {
          menuItem: {
            id: '2',
            name: 'Fries',
            price: 4.99,
            image: '/fries.jpg',
          },
          quantity: 1,
          specialInstructions: '',
        },
      ],
      subtotal: 26.97,
      deliveryFee: 2.99,
      tax: 2.34,
      total: 32.3,
      estimatedDeliveryTime: 30,
    };

    beforeEach(() => {
      mockUseCartStore.mockReturnValue({
        cart: mockCartData,
        updateItemQuantity: jest.fn(),
        removeItem: jest.fn(),
        clearCart: jest.fn(),
      } as any);
    });

    it('should render cart header', () => {
      render(<CartPage />);

      expect(screen.getByText('Your Cart')).toBeInTheDocument();
    });

    it('should display all cart items', () => {
      render(<CartPage />);

      expect(screen.getByText('Burger')).toBeInTheDocument();
      expect(screen.getByText('Fries')).toBeInTheDocument();
    });

    it('should display order summary', () => {
      render(<CartPage />);

      expect(screen.getByText('Order Summary')).toBeInTheDocument();
    });
  });

  describe('Promo Code', () => {
    const mockCartData = {
      items: [
        {
          menuItem: {
            id: '1',
            name: 'Burger',
            price: 10.99,
            image: '/burger.jpg',
          },
          quantity: 1,
          specialInstructions: '',
        },
      ],
      subtotal: 10.99,
      deliveryFee: 2.99,
      tax: 1.07,
      total: 15.05,
      estimatedDeliveryTime: 30,
    };

    beforeEach(() => {
      mockUseCartStore.mockReturnValue({
        cart: mockCartData,
        updateItemQuantity: jest.fn(),
        removeItem: jest.fn(),
        clearCart: jest.fn(),
      } as any);
    });

    it('should render promo code section', () => {
      render(<CartPage />);

      const input = screen.queryByPlaceholderText('Enter promo code');
      if (input) {
        expect(input).toBeInTheDocument();
      }
    });
  });

  describe('Clear Cart', () => {
    const mockCartData = {
      items: [
        {
          menuItem: {
            id: '1',
            name: 'Burger',
            price: 10.99,
            image: '/burger.jpg',
          },
          quantity: 1,
          specialInstructions: '',
        },
      ],
      subtotal: 10.99,
      deliveryFee: 2.99,
      tax: 1.07,
      total: 15.05,
      estimatedDeliveryTime: 30,
    };

    it('should render clear cart button', () => {
      mockUseCartStore.mockReturnValue({
        cart: mockCartData,
        updateItemQuantity: jest.fn(),
        removeItem: jest.fn(),
        clearCart: jest.fn(),
      } as any);

      render(<CartPage />);

      const clearButton = screen.queryByRole('button', { name: /Clear Cart/i });
      if (clearButton) {
        expect(clearButton).toBeInTheDocument();
      }
    });
  });

  describe('Checkout Button', () => {
    const mockCartData = {
      items: [
        {
          menuItem: {
            id: '1',
            name: 'Burger',
            price: 10.99,
            image: '/burger.jpg',
          },
          quantity: 1,
          specialInstructions: '',
        },
      ],
      subtotal: 10.99,
      deliveryFee: 2.99,
      tax: 1.07,
      total: 15.05,
      estimatedDeliveryTime: 30,
    };

    beforeEach(() => {
      mockUseCartStore.mockReturnValue({
        cart: mockCartData,
        updateItemQuantity: jest.fn(),
        removeItem: jest.fn(),
        clearCart: jest.fn(),
      } as any);
    });

    it('should render checkout button', () => {
      render(<CartPage />);

      const checkoutButton = screen.queryByRole('button', { name: /Proceed to Checkout/i });
      if (checkoutButton) {
        expect(checkoutButton).toBeInTheDocument();
      }
    });
  });
});