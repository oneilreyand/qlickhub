import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ResetPasswordPage } from '../ResetPasswordPage';
import { authService } from '../../lib/api/authService';

vi.mock('../../lib/api/authService', () => ({
  authService: {
    resetPassword: vi.fn(),
  },
}));

describe('ResetPasswordPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders reset password form with password visibility toggles on both inputs', () => {
    render(
      <MemoryRouter initialEntries={['/reset-password?token=valid-token']}>
        <Routes>
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Set New Password')).toBeInTheDocument();
    const newPasswordInput = screen.getByPlaceholderText(/New password \(min 6 characters\)/i);
    const confirmPasswordInput = screen.getByPlaceholderText(/Confirm new password/i);

    expect(newPasswordInput).toHaveAttribute('type', 'password');
    expect(confirmPasswordInput).toHaveAttribute('type', 'password');

    const toggleButtons = screen.getAllByRole('button', { name: /show password/i });
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

    render(
      <MemoryRouter initialEntries={['/reset-password?token=valid-token-123']}>
        <Routes>
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText(/New password \(min 6 characters\)/i), {
      target: { value: 'ValidPass123!' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Confirm new password/i), {
      target: { value: 'ValidPass123!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Update Password/i }));

    await waitFor(() => {
      expect(authService.resetPassword).toHaveBeenCalledWith({
        token: 'valid-token-123',
        newPassword: 'ValidPass123!',
      });
      expect(screen.getByText('Password Reset Complete!')).toBeInTheDocument();
    });
  });
});
