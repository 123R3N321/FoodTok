// ...existing code...
import { render, screen } from '@testing-library/react';
import FavoritesPage from './page';
import { useFavoritesStore } from '@/lib/stores';
import '@testing-library/jest-dom';

jest.mock('@/lib/stores');
jest.mock('next/navigation');
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));

const mockUseFavoritesStore = useFavoritesStore as jest.MockedFunction<
  typeof useFavoritesStore
>;

describe('FavoritesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    mockUseFavoritesStore.mockReturnValue({ favorites: [] } as any);
    const { container } = render(<FavoritesPage />);
    expect(container).toBeInTheDocument();
  });

  it('shows empty state when there are no favorites', () => {
    mockUseFavoritesStore.mockReturnValue({ favorites: [] } as any);
    render(<FavoritesPage />);
    expect(
      screen.queryByText(/no favorites|nothing here|haven't favorited|you haven't favorited/i)
    ).toBeTruthy();
  });
});