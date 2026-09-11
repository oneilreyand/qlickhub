import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ResetPasswordPage } from '../ResetPasswordPage';
import { authService } from '../../lib/api/authService';

vi.mock('../../lib/api/authService', () => ({
  authService: {
    resetPassword: vi.fn(),
  },
}));

const LocationProbe = () => {
  const location = useLocation();
  return (
    <output data-testid="location">{`${location.pathname}${location.search}${location.hash}`}</output>
  );
};

const renderResetPage = (initialEntry: string) =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="/reset-password"
          element={
            <>
              <ResetPasswordPage />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );

describe('ResetPasswordPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('captures a fragment token and removes it from the address bar', async () => {
    renderResetPage('/reset-password#token=valid-token');

    expect(screen.getByText('Buat Kata Sandi Baru')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent(/^\/reset-password$/);
      expect(screen.getByTestId('location')).not.toHaveTextContent('valid-token');
    });
    const newPasswordInput = screen.getByPlaceholderText(/Kata sandi baru \(minimal 6 karakter\)/i);
    const confirmPasswordInput = screen.getByPlaceholderText(/Konfirmasi kata sandi baru/i);

    expect(newPasswordInput).toHaveAttribute('type', 'password');
    expect(confirmPasswordInput).toHaveAttribute('type', 'password');

    const toggleButtons = screen.getAllByRole('button', { name: /tampilkan kata sandi/i });
    expect(toggleButtons).toHaveLength(2);

    // Toggle first input
    fireEvent.click(toggleButtons[0]);
    expect(newPasswordInput).toHaveAttribute('type', 'text');
    expect(confirmPasswordInput).toHaveAttribute('type', 'password');

    // Toggle second input
    fireEvent.click(toggleButtons[1]);
    expect(newPasswordInput).toHaveAttribute('type', 'text');
    expect(confirmPasswordInput).toHaveAttribute('type', 'text');
  });

  it('submits valid passwords and shows success message', async () => {
    (authService.resetPassword as any).mockResolvedValueOnce({ success: true });

    renderResetPage('/reset-password#token=valid-token-123');

    fireEvent.change(screen.getByPlaceholderText(/Kata sandi baru \(minimal 6 karakter\)/i), {
      target: { value: 'ValidPass123!' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Konfirmasi kata sandi baru/i), {
      target: { value: 'ValidPass123!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Perbarui Kata Sandi/i }));

    await waitFor(() => {
      expect(authService.resetPassword).toHaveBeenCalledWith({
        token: 'valid-token-123',
        newPassword: 'ValidPass123!',
      });
      expect(screen.getByText('Kata Sandi Berhasil Diatur Ulang')).toBeInTheDocument();
    });
  });

  it('keeps a legacy query-token link usable while replacing its history entry', async () => {
    renderResetPage('/reset-password?source=invite&token=legacy-token');

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent(/^\/reset-password\?source=invite$/);
      expect(screen.getByTestId('location')).not.toHaveTextContent('legacy-token');
    });
    expect(screen.getByRole('button', { name: /Perbarui Kata Sandi/i })).toBeEnabled();
  });
});
