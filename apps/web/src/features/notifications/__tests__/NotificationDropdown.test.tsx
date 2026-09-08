import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { NotificationDropdown } from '../components/NotificationDropdown';

const baseProps = {
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  isFcmSupported: true,
  fcmPermission: 'granted' as NotificationPermission,
  isFcmRegistering: false,
  fcmRegistrationError: null,
  onRequestFcmPermission: vi.fn(),
  onMarkAllAsRead: vi.fn(),
  onClearAll: vi.fn(),
  onNotificationClick: vi.fn(),
  onClose: vi.fn(),
};

describe('NotificationDropdown mobile Web Push states', () => {
  it('shows active only after device registration succeeds', () => {
    render(
      <MemoryRouter>
        <NotificationDropdown {...baseProps} fcmRegistrationStatus="registered" />
      </MemoryRouter>,
    );

    expect(screen.getByText('FCM Push Aktif')).toBeInTheDocument();
  });

  it('shows retryable failure instead of a false active state', () => {
    render(
      <MemoryRouter>
        <NotificationDropdown
          {...baseProps}
          fcmRegistrationStatus="error"
          fcmRegistrationError="Perangkat belum berhasil didaftarkan untuk Web Push."
        />
      </MemoryRouter>,
    );

    expect(screen.queryByText('FCM Push Aktif')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Coba lagi' })).toBeEnabled();
  });

  it('explains the Home Screen requirement on iPhone', () => {
    render(
      <MemoryRouter>
        <NotificationDropdown {...baseProps} fcmRegistrationStatus="installation_required" />
      </MemoryRouter>,
    );

    expect(screen.getByText(/tambahkan Qlick Hub ke Layar Utama/i)).toBeInTheDocument();
    expect(screen.queryByText('FCM Push Aktif')).not.toBeInTheDocument();
  });
});
