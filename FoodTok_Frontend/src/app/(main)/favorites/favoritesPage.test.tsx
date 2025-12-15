import React from 'react';
import { render, screen } from '@testing-library/react';
import FavoritesPage from './page';
import * as stores from '@/lib/stores';
import '@testing-library/jest-dom';

jest.mock('next/navigation');
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

describe('FavoritesPage (smoke)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthStore.mockReturnValue({ user: null });
    mockUseFavoritesStore.mockReturnValue({ favorites: [] });
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
  });

  afterEach(() => {
    delete (global as any).fetch;
  });

  it('renders the favorites page without crashing', () => {
    const { container } = render(<FavoritesPage />);
    expect(container).toBeInTheDocument();
  });

  it('renders without errors with empty favorites', () => {
    mockUseFavoritesStore.mockReturnValue({ favorites: [] });
    const { container } = render(<FavoritesPage />);
    expect(container).toBeInTheDocument();
  });

  it('renders without errors with multiple favorites', () => {
    mockUseFavoritesStore.mockReturnValue({
      favorites: [
        { id: '1', name: 'Restaurant 1', rating: 4.5 },
        { id: '2', name: 'Restaurant 2', rating: 4.8 },
        { id: '3', name: 'Restaurant 3', rating: 4.2 },
      ],
    });
    const { container } = render(<FavoritesPage />);
    expect(container).toBeInTheDocument();
  });

  it('renders without errors when user is authenticated', () => {
    mockUseAuthStore.mockReturnValue({ user: { id: 'user-123', name: 'Test User' } });
    const { container } = render(<FavoritesPage />);
    expect(container).toBeInTheDocument();
  });

  it('renders without errors with loading state', () => {
    mockUseFavoritesStore.mockReturnValue({ 
      favorites: [],
      isLoading: true,
    });
    const { container } = render(<FavoritesPage />);
    expect(container).toBeInTheDocument();
  });

  it('renders without errors with error state', () => {
    mockUseFavoritesStore.mockReturnValue({ 
      favorites: [],
      error: 'Failed to load favorites',
    });
    const { container } = render(<FavoritesPage />);
    expect(container).toBeInTheDocument();
  });

  it('renders without errors with authenticated user and favorites', () => {
    mockUseAuthStore.mockReturnValue({ user: { id: 'user-123', name: 'Test User' } });
    mockUseFavoritesStore.mockReturnValue({
      favorites: [
        { id: '1', name: 'Restaurant 1', rating: 4.5, cuisine: ['Italian'] },
      ],
    });
    const { container } = render(<FavoritesPage />);
    expect(container).toBeInTheDocument();
  });
});