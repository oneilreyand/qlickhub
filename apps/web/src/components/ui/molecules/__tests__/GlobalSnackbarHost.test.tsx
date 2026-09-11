import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { GlobalSnackbarHost } from '../GlobalSnackbarHost';
import uiReducer, { enqueueSnackbar } from '../../../../store/uiSlice';

const createTestStore = () => {
  return configureStore({
    reducer: {
      ui: uiReducer,
    },
  });
};

describe('GlobalSnackbarHost Molecule', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders snackbars and automatically dismisses them after duration', () => {
    const store = createTestStore();
    render(
      <Provider store={store}>
        <GlobalSnackbarHost />
      </Provider>,
    );

    act(() => {
      store.dispatch(enqueueSnackbar('Task updated successfully', 'success'));
    });

    expect(screen.getByText('Task updated successfully')).toBeInTheDocument();

    // Advance timer by 4000ms
    act(() => {
      vi.advanceTimersByTime(4100);
    });

    expect(screen.queryByText('Task updated successfully')).not.toBeInTheDocument();
  });

  it('allows user to manually dismiss snackbar by clicking close button', () => {
    const store = createTestStore();
    render(
      <Provider store={store}>
        <GlobalSnackbarHost />
      </Provider>,
    );

    act(() => {
      store.dispatch(enqueueSnackbar('Manual close test', 'info'));
    });

    expect(screen.getByText('Manual close test')).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: /tutup notifikasi/i });
    fireEvent.click(closeBtn);

    expect(screen.queryByText('Manual close test')).not.toBeInTheDocument();
  });

  it('keeps long snackbar content centered and contained on mobile and tablet viewports', () => {
    const store = createTestStore();
    render(
      <Provider store={store}>
        <GlobalSnackbarHost />
      </Provider>,
    );

    act(() => {
      store.dispatch(
        enqueueSnackbar(
          'https://example.com/a-very-long-unbroken-snackbar-message-that-must-stay-inside-the-viewport',
          'warning',
        ),
      );
    });

    const message = screen.getByText(/a-very-long-unbroken-snackbar-message/);
    const snackbar = message.parentElement;
    const host = snackbar?.parentElement?.parentElement?.parentElement;

    expect(host).toHaveClass('fixed', 'inset-x-4', 'mx-auto', 'w-auto', 'max-w-sm');
    expect(host).not.toHaveClass('right-5', 'w-full');
    expect(message).toHaveClass('min-w-0', 'break-words');
  });
});
