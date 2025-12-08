import { render, screen } from '@testing-library/react';
import FavoritesPage from './page';
import * as stores from '@/lib/stores';
import '@testing-library/jest-dom';

jest.mock('next/navigation', () => ({
  __esModule: true,
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));

jest.mock('@/lib/stores', () => ({
  useFavoritesStore: jest.fn(),
  useAuthStore: jest.fn(),
}));

const mockUseFavoritesStore = (stores as any).useFavoritesStore as jest.Mock;
const mockUseAuthStore = (stores as any).useAuthStore as jest.Mock;

describe('FavoritesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAuthStore.mockReturnValue({
      user: { id: 'u1', name: 'Test' },
    });

    // default: no favorites in store
    mockUseFavoritesStore.mockReturnValue({
      favorites: [],
    });

    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: '1', name: 'Sushi Roll' }],
    });
  });

  afterEach(() => {
    delete (global as any).fetch;
  });

  it('renders the empty-state text when there are no favorites', async () => {
    // explicitly ensure empty state
    mockUseFavoritesStore.mockReturnValue({
      favorites: [],
    });

    render(<FavoritesPage />);

    // main empty-state heading
    expect(
      await screen.findByText(/no favorites yet/i)
    ).toBeInTheDocument();

    // supporting text
    expect(
      screen.getByText(/start discovering restaurants/i)
    ).toBeInTheDocument();

    // CTA button/link
    expect(
      screen.getByText(/discover restaurants/i)
    ).toBeInTheDocument();
  });

  it('renders the Favorites title and shows fetched favorites', async () => {
    // simulate store having a favorite (e.g. after fetch)
    mockUseFavoritesStore.mockReturnValue({
      favorites: [{ id: '1', name: 'Sushi Roll' }],
    });

    render(<FavoritesPage />);

    // title
    expect(await screen.findByText(/favorites/i)).toBeInTheDocument();
    // favorite item
    expect(await screen.findByText(/sushi roll/i)).toBeInTheDocument();
  });
});
