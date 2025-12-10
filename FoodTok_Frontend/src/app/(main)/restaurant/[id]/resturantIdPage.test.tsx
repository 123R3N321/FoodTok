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

import RestaurantDetailsPage from './page';

describe('RestaurantDetailsPage (smoke)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: '1',
        name: 'Test Restaurant',
        description: 'Test',
        menu: [],
        images: [],
        rating: 4.5,
        reviewCount: 100,
        priceRange: '$$',
        cuisine: ['Italian'],
        location: { address: '123 Main St', city: 'Test City' },
        url: 'https://yelp.com',
      }),
    });
  });

  afterEach(() => {
    delete (global as any).fetch;
  });

  it('renders without crashing', () => {
    const { container } = render(<RestaurantDetailsPage />);
    expect(container).toBeInTheDocument();
  });
});