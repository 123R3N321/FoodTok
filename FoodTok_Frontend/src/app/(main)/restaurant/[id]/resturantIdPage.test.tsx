import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), back: jest.fn() })),
  useParams: jest.fn(() => ({ id: '1' })),
}));
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));
jest.mock('@/lib/stores', () => ({
  useAuthStore: jest.fn(() => ({ user: { id: 'u1', name: 'Test User' } })),
  useCartStore: jest.fn(() => ({ cart: { items: [] }, addItem: jest.fn(), setCartOpen: jest.fn() })),
  useReservationStore: jest.fn(() => ({ setActiveHold: jest.fn() })),
}));
jest.mock('@/components/reservation/ReservationModal', () => {
  return function MockReservationModal() {
    return <div data-testid="reservation-modal">Reservation Modal</div>;
  };
});
jest.mock('@/lib/api', () => ({
  getRestaurantById: jest.fn(),
  getDiscoveryRestaurants: jest.fn(),
}));

import RestaurantDetailsPage from './page';

describe('RestaurantDetailsPage (smoke)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the restaurant details page without crashing', () => {
    const { container } = render(<RestaurantDetailsPage />);
    expect(container).toBeInTheDocument();
  });
});