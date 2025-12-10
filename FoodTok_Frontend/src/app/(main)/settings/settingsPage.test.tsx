import React from 'react';
import { render } from '@testing-library/react';
import SettingsPage from './page';
import '@testing-library/jest-dom';

jest.mock('next/navigation');
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));
jest.mock('@/lib/stores', () => ({
  useAuthStore: jest.fn(),
}));

const stores = require('@/lib/stores') as any;
const mockUseAuthStore = stores.useAuthStore as jest.Mock;

describe('SettingsPage (smoke)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthStore.mockReturnValue({ user: { id: 'u1', name: 'Test User' } });
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
  });

  afterEach(() => {
    delete (global as any).fetch;
  });

  it('renders the settings page without crashing', () => {
    const { container } = render(<SettingsPage />);
    expect(container).toBeInTheDocument();
  });
});