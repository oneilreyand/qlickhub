import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import { SessionTimeoutModal } from '../SessionTimeoutModal';
import authReducer from '../../../store/authSlice';
import uiReducer from '../../../store/uiSlice';
import { authService } from '../../../lib/api/authService';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../../lib/api/authService', () => ({
  authService: {
    logout: vi.fn(),
    refreshSession: vi.fn(),
  },
}));

const createTestStore = () => {
  return configureStore({
    reducer: {
      auth: authReducer,
      ui: uiReducer,
    },
  });
};

describe('SessionTimeoutModal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    window.localStorage.clear();
    mockNavigate.mockReset();
    (authService.logout as any).mockResolvedValue(undefined);
    (authService.refreshSession as any).mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not display warning when activity is recent', () => {
    const store = createTestStore();
    render(
      <Provider store={store}>
        <MemoryRouter>
          <SessionTimeoutModal idleMinutesBeforeWarning={28} countdownSeconds={120} />
        </MemoryRouter>
      </Provider>,
    );

    expect(screen.queryByText('Sesi Anda Akan Berakhir')).not.toBeInTheDocument();
  });

  it('displays warning modal with accessible countdown when idle time reaches threshold', () => {
    const store = createTestStore();
    render(
      <Provider store={store}>
        <MemoryRouter>
          <SessionTimeoutModal idleMinutesBeforeWarning={1} countdownSeconds={60} />
        </MemoryRouter>
      </Provider>,
    );

    expect(screen.queryByText('Sesi Anda Akan Berakhir')).not.toBeInTheDocument();

    // Advance time by 60 seconds (1 minute idle threshold) + 15 second interval check
    act(() => {
      vi.advanceTimersByTime(75000);
    });

    expect(screen.getByText('Sesi Anda Akan Berakhir')).toBeInTheDocument();
    const timerElement = screen.getByRole('timer');
    expect(timerElement).toBeInTheDocument();
    expect(timerElement).toHaveAttribute('aria-live', 'polite');
  });

  it('triggers logout and navigation to login with idle_timeout when "Keluar Sekarang" is clicked', async () => {
    const store = createTestStore();
    render(
      <Provider store={store}>
        <MemoryRouter>
          <SessionTimeoutModal idleMinutesBeforeWarning={1} countdownSeconds={60} />
        </MemoryRouter>
      </Provider>,
    );

    act(() => {
      vi.advanceTimersByTime(75000);
    });

    const logoutButton = screen.getByRole('button', { name: /keluar sekarang/i });
    expect(logoutButton).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(logoutButton);
    });

    expect(authService.logout).toHaveBeenCalledWith('/login?reason=idle_timeout');
    expect(mockNavigate).toHaveBeenCalledWith('/login?reason=idle_timeout');
  });

  it('refreshes session, resets countdown, and shows success snackbar when "Tetap Masuk" is clicked', async () => {
    const store = createTestStore();
    render(
      <Provider store={store}>
        <MemoryRouter>
          <SessionTimeoutModal idleMinutesBeforeWarning={1} countdownSeconds={60} />
        </MemoryRouter>
      </Provider>,
    );

    act(() => {
      vi.advanceTimersByTime(75000);
    });

    expect(screen.getByText('Sesi Anda Akan Berakhir')).toBeInTheDocument();

    const extendButton = screen.getByRole('button', { name: /tetap masuk/i });
    await act(async () => {
      fireEvent.click(extendButton);
    });

    expect(authService.refreshSession).toHaveBeenCalled();
    expect(screen.queryByText('Sesi Anda Akan Berakhir')).not.toBeInTheDocument();

    // Verify snackbar state in store
    const state = store.getState();
    expect(state.ui.notifications.some((s) => s.message.includes('berhasil diperpanjang'))).toBe(true);
  });

  it('automatically logs out when countdown reaches zero', async () => {
    const store = createTestStore();
    render(
      <Provider store={store}>
        <MemoryRouter>
          <SessionTimeoutModal idleMinutesBeforeWarning={1} countdownSeconds={30} />
        </MemoryRouter>
      </Provider>,
    );

    // Open modal at 75s (warning at 60s, total timeout at 90s)
    act(() => {
      vi.advanceTimersByTime(75000);
    });
    expect(screen.getByText('Sesi Anda Akan Berakhir')).toBeInTheDocument();

    // Advance 16 seconds through countdown
    await act(async () => {
      vi.advanceTimersByTime(16000);
    });

    expect(authService.logout).toHaveBeenCalledWith('/login?reason=idle_timeout');
    expect(mockNavigate).toHaveBeenCalledWith('/login?reason=idle_timeout');
  });

  it('synchronizes activity across tabs via storage event to dismiss warning modal', () => {
    const store = createTestStore();
    render(
      <Provider store={store}>
        <MemoryRouter>
          <SessionTimeoutModal idleMinutesBeforeWarning={1} countdownSeconds={60} />
        </MemoryRouter>
      </Provider>,
    );

    act(() => {
      vi.advanceTimersByTime(75000);
    });
    expect(screen.getByText('Sesi Anda Akan Berakhir')).toBeInTheDocument();

    // Simulate activity from another tab by dispatching storage event
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'qlick_last_activity_at',
          newValue: String(Date.now() + 1000),
        }),
      );
    });

    expect(screen.queryByText('Sesi Anda Akan Berakhir')).not.toBeInTheDocument();
  });

  it('immediately triggers auto-logout when machine wakes after total timeout exceeded', async () => {
    const store = createTestStore();
    render(
      <Provider store={store}>
        <MemoryRouter>
          <SessionTimeoutModal idleMinutesBeforeWarning={1} countdownSeconds={60} />
        </MemoryRouter>
      </Provider>,
    );

    // Jump 2 hours forward (e.g. computer sleep/hibernation)
    await act(async () => {
      vi.advanceTimersByTime(2 * 60 * 60 * 1000);
    });

    expect(authService.logout).toHaveBeenCalledWith('/login?reason=idle_timeout');
    expect(mockNavigate).toHaveBeenCalledWith('/login?reason=idle_timeout');
  });
});
