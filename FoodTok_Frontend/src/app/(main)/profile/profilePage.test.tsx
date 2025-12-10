import React from 'react';
import { render } from '@testing-library/react';
import ProfilePage from './page';
import '@testing-library/jest-dom';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), back: jest.fn() })),
  useParams: jest.fn(() => ({})),
}));
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));
jest.mock('@/lib/stores', () => ({
  useAuthStore: jest.fn(() => ({ user: { id: 'u1', name: 'Test User' }, logout: jest.fn() })),
  useAppStore: jest.fn(() => ({ addNotification: jest.fn() })),
}));

describe('ProfilePage (smoke)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
  });

  afterEach(() => {
    delete (global as any).fetch;
  });

  it('renders the profile page without crashing', () => {
    const { container } = render(<ProfilePage />);
    expect(container).toBeInTheDocument();
  });
});