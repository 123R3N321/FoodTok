import React from 'react';
import { render } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import CheckoutPage from './page';
import * as stores from '@/lib/stores';
import '@testing-library/jest-dom';

jest.mock('next/navigation');
jest.mock('@/lib/stores');
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseCartStore = (stores as any).useCartStore as jest.Mock;
const mockUseReservationStore = (stores as any).useReservationStore as jest.Mock;
const mockUseAuthStore = (stores as any).useAuthStore as jest.Mock;

describe('CheckoutPage (smoke)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({ push: jest.fn() } as any);
    mockUseCartStore.mockReturnValue({ cart: { items: [] }, clearCart: jest.fn() });
    mockUseReservationStore.mockReturnValue({ activeHold: null, clearHold: jest.fn() });
    mockUseAuthStore.mockReturnValue({ user: null });
  });

  it('renders the checkout page without crashing', () => {
    const { container } = render(<CheckoutPage />);
    expect(container).toBeInTheDocument();
  });
});