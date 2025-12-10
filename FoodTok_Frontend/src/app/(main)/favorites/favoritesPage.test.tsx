import React from 'react';
import { render } from '@testing-library/react';
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
});