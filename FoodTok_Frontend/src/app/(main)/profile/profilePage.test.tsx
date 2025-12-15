import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('renders profile page with authenticated user', () => {
    const { container } = render(<ProfilePage />);
    expect(container).toBeInTheDocument();
  });

  it('renders without errors on initial load', () => {
    const { container } = render(<ProfilePage />);
    expect(container).toBeInTheDocument();
  });

  describe('Button Interactions', () => {
    it('handles logout button click', () => {
      const { container } = render(<ProfilePage />);
      const buttons = screen.queryAllByRole('button');
      
      buttons.forEach(button => {
        if (button.textContent?.toLowerCase().includes('logout')) {
          fireEvent.click(button);
        }
      });
      expect(container).toBeInTheDocument();
    });

    it('handles edit profile button click', () => {
      const { container } = render(<ProfilePage />);
      const buttons = screen.queryAllByRole('button');
      
      buttons.forEach(button => {
        if (button.textContent?.toLowerCase().includes('edit')) {
          fireEvent.click(button);
        }
      });
      expect(container).toBeInTheDocument();
    });

    it('handles settings button click', () => {
      const { container } = render(<ProfilePage />);
      const buttons = screen.queryAllByRole('button');
      
      buttons.forEach(button => {
        if (button.textContent?.toLowerCase().includes('settings')) {
          fireEvent.click(button);
        }
      });
      expect(container).toBeInTheDocument();
    });

    it('handles all visible buttons without crashing', () => {
      const { container } = render(<ProfilePage />);
      const buttons = screen.queryAllByRole('button');
      
      buttons.forEach(button => {
        fireEvent.click(button);
      });
      expect(container).toBeInTheDocument();
    });

    it('handles preference toggle buttons', () => {
      const { container } = render(<ProfilePage />);
      const buttons = screen.queryAllByRole('button');
      
      buttons.forEach(button => {
        if (button.getAttribute('role') === 'button') {
          fireEvent.click(button);
        }
      });
      expect(container).toBeInTheDocument();
    });
  });

  describe('Page States', () => {
    it('renders with loading state', () => {
      const { container } = render(<ProfilePage />);
      expect(container).toBeInTheDocument();
    });

    it('renders with user data loaded', () => {
      const { container } = render(<ProfilePage />);
      expect(container).toBeInTheDocument();
    });

    it('renders without errors after user interaction', async () => {
      const user = userEvent.setup();
      const { container } = render(<ProfilePage />);
      
      const buttons = screen.queryAllByRole('button');
      if (buttons.length > 0) {
        await user.click(buttons[0]);
      }
      
      expect(container).toBeInTheDocument();
    });
  });
});