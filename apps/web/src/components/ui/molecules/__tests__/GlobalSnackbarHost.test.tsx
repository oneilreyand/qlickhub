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
      </Provider>
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
      </Provider>
    );

    act(() => {
      store.dispatch(enqueueSnackbar('Manual close test', 'info'));
    });

    expect(screen.getByText('Manual close test')).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: /dismiss notification/i });
    fireEvent.click(closeBtn);

    expect(screen.queryByText('Manual close test')).not.toBeInTheDocument();
  });
});
