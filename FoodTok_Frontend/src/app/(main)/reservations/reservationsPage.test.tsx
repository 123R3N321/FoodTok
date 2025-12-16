import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ReservationsPage from './page';
import '@testing-library/jest-dom';

jest.mock('next/navigation');
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
  useReservationStore: jest.fn(() => ({ activeHold: null })),
}));

import ReservationsPage from './page';

describe('ReservationsPage (smoke)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the reservations page without crashing', () => {
    const { container } = render(<ReservationsPage />);
    expect(container).toBeInTheDocument();
  });

  it('clicks all visible buttons without crashing', () => {
    const { container } = render(<ReservationsPage />);
    const buttons = screen.queryAllByRole('button');

    buttons.forEach(button => {
      fireEvent.click(button);
    });

    expect(container).toBeInTheDocument();
  });

  it('renders without errors', () => {
    const { container } = render(<ReservationsPage />);
    expect(container).toBeInTheDocument();
  });
});
