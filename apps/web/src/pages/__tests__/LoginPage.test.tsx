import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LoginPage } from '../LoginPage';
import authReducer from '../../store/authSlice';
import uiReducer from '../../store/uiSlice';
import { authService } from '../../lib/api/authService';

vi.mock('../../lib/api/authService', () => ({
  authService: {
    login: vi.fn(),
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

describe('LoginPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders split layout with the specified hero image and branding', () => {
    const store = createTestStore();
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </MemoryRouter>
      </Provider>,
    );

    // Checks hero image src
    const images = screen.getAllByRole('img');
    const heroImage = images.find((img) =>
      img.getAttribute('src')?.includes('ChatGPT_Image_Aug_19_2026_03_01_47_PM.png'),
    );
    expect(heroImage).toBeDefined();

    // Checks header & copy
    expect(screen.getByText('Selamat Datang Kembali')).toBeInTheDocument();
    expect(
      screen.getByText(/Sign in to access your workspaces, tasks, and reports\./i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Task Management & Collaboration Platform/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Qlick Hub/i).length).toBeGreaterThan(0);

    // Checks form inputs
    expect(screen.getByPlaceholderText('Masukkan alamat email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Masukkan kata sandi')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In to Hub/i })).toBeInTheDocument();
    expect(screen.getByText(/Forgot password\?/i)).toBeInTheDocument();
  });

  it('displays session expired alert when reason=session_expired', () => {
    const store = createTestStore();
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/login?reason=session_expired']}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </MemoryRouter>
      </Provider>,
    );

    expect(screen.getByText('Sesi Berakhir')).toBeInTheDocument();
    expect(screen.getByText(/Masa berlaku sesi login telah berakhir/i)).toBeInTheDocument();
  });

  it('displays idle timeout alert when reason=idle_timeout', () => {
    const store = createTestStore();
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/login?reason=idle_timeout']}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </MemoryRouter>
      </Provider>,
    );

    expect(screen.getByText('Sesi Habis Karena Tidak Aktif')).toBeInTheDocument();
  });

  it('handles successful login flow', async () => {
    const store = createTestStore();
    const mockUser = {
      id: 'user-123',
      email: 'lead@company.com',
      name: 'QA Engineer',
      role: 'qa',
    };

    (authService.login as any).mockResolvedValueOnce({
      user: mockUser,
      token: 'jwt-token-xyz',
    });

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/work" element={<div>WorkHub Destination</div>} />
          </Routes>
        </MemoryRouter>
      </Provider>,
    );

    fireEvent.change(screen.getByPlaceholderText('Masukkan alamat email'), {
      target: { value: 'lead@company.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Masukkan kata sandi'), {
      target: { value: 'password123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Sign In to Hub/i }));

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith({
        email: 'lead@company.com',
        password: 'password123',
      });
      expect(localStorage.getItem('user_email')).toBeNull();
      expect(localStorage.getItem('user_role')).toBeNull();
      expect(localStorage.getItem('user_id')).toBeNull();
      expect(store.getState().auth.currentUser?.email).toBe('lead@company.com');
      expect(store.getState().auth.isAuthenticated).toBe(true);
      expect(screen.getByText('WorkHub Destination')).toBeInTheDocument();
    });
  });

  it('displays error message when login fails', async () => {
    const store = createTestStore();
    (authService.login as any).mockRejectedValueOnce(new Error('Invalid email or password'));

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </MemoryRouter>
      </Provider>,
    );

    fireEvent.change(screen.getByPlaceholderText('Masukkan alamat email'), {
      target: { value: 'wrong@company.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Masukkan kata sandi'), {
      target: { value: 'wrongpassword' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Sign In to Hub/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
    });
  });

  it('allows toggling password visibility on the password field', () => {
    const store = createTestStore();
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </MemoryRouter>
      </Provider>,
    );

    const passwordInput = screen.getByPlaceholderText('Masukkan kata sandi');
    expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleButton = screen.getByRole('button', { name: /show password/i });
    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');

    const hideButton = screen.getByRole('button', { name: /hide password/i });
    fireEvent.click(hideButton);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });
});
