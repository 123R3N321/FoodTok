import { render, screen } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import CheckoutPage from './page';
import { useCartStore, useReservationStore } from '@/lib/stores';
import '@testing-library/jest-dom';

jest.mock('next/navigation');
jest.mock('@/lib/stores');
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseCartStore = useCartStore as jest.MockedFunction<typeof useCartStore>;
const mockUseReservationStore = useReservationStore as jest.MockedFunction<typeof useReservationStore>;

describe('CheckoutPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({ push: jest.fn() } as any);
    mockUseCartStore.mockReturnValue({
      cart: { items: [] },
      clearCart: jest.fn(),
    } as any);
    mockUseReservationStore.mockReturnValue({
      activeHold: null,
      setActiveHold: jest.fn(),
    } as any);
  });

  it('should render checkout page without crashing', () => {
    const { container } = render(<CheckoutPage />);
    expect(container).toBeInTheDocument();
  });
});