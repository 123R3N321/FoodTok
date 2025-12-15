import React from 'react';
import { render } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import CheckoutPage from './page';
import * as stores from '@/lib/stores';
import '@testing-library/jest-dom';

jest.mock('next/navigation');
jest.mock('@/lib/stores');
jest.mock('@/lib/api');
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));
jest.mock('@/components/reservation/HoldTimer', () => {
  return function MockHoldTimer() {
    return <div data-testid="hold-timer">Timer</div>;
  };
});

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseReservationStore = (stores as any).useReservationStore as jest.Mock;
const mockUseAuthStore = (stores as any).useAuthStore as jest.Mock;

describe('CheckoutPage (smoke)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseRouter.mockReturnValue({ 
      push: jest.fn(),
      back: jest.fn(),
    } as any);
    
    mockUseAuthStore.mockReturnValue({ user: { id: 'user-123' } });
    
    mockUseReservationStore.mockReturnValue({
      activeHold: {
        holdId: 'hold-123',
        restaurantName: 'Test Restaurant',
        date: '2025-12-20',
        time: '19:00',
        partySize: 4,
        depositAmount: 100,
        expiresAt: Date.now() + 600000,
      },
      clearHold: jest.fn(),
    });
  });

  it('renders the checkout page without crashing', () => {
    const { container } = render(<CheckoutPage />);
    expect(container).toBeInTheDocument();
  });

  it('renders without errors when user is authenticated', () => {
    const { container } = render(<CheckoutPage />);
    expect(container).toBeInTheDocument();
  });

  it('renders without errors when active hold exists', () => {
    const { container } = render(<CheckoutPage />);
    expect(container).toBeInTheDocument();
  });
});