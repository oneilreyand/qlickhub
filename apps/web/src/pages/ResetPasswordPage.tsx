import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../lib/api/authService';
import { Lock, ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Alert } from '../components/ui/atoms/Alert';
import { Button } from '../components/ui/atoms/Button';
import { Input } from '../components/ui/atoms/Input';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setErrorMessage('Invalid or missing password reset token.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await authService.resetPassword({ token, newPassword });
      setIsSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[#FBFCF7] flex items-center justify-center p-4 sm:p-6 select-none relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-[#B1E743]/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 rounded-full bg-[#B1E743]/10 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white p-8 rounded-[24px] border border-stone-200/80 shadow-xl shadow-stone-200/60 space-y-6 relative z-10">
        <div className="text-center space-y-1">
          <h1 className="text-xl font-bold text-stone-900">Set New Password</h1>
          <p className="text-sm text-stone-500">
            Please enter and confirm your new password.
          </p>
        </div>

        {!token && (
          <Alert tone="error" icon={<AlertTriangle className="h-4 w-4 text-rose-500" />}>
            No reset token found in link. Please request a new reset link.
          </Alert>
        )}

        {errorMessage && <Alert tone="error">{errorMessage}</Alert>}

        {isSuccess ? (
          <div className="space-y-6 py-2 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-semibold text-stone-900">Password Reset Complete!</h3>
              <p className="text-xs text-stone-500">
                Your password has been successfully updated. Redirecting you to sign in…
              </p>
            </div>
            <div className="pt-2">
              <Link to="/login">
                <Button className="w-full">Sign In Now</Button>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="new-password-input"
              leftIcon={<Lock className="h-3.5 w-3.5 text-stone-400" />}
              type="password"
              placeholder="New password (min 6 characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="!bg-stone-50/80 !text-stone-900 !border-stone-200 focus:!bg-white focus:!border-[#B1E743] focus:!ring-[#B1E743]/20 !placeholder-stone-400"
              required
              disabled={!token || isLoading}
            />

            <Input
              id="confirm-password-input"
              leftIcon={<Lock className="h-3.5 w-3.5 text-stone-400" />}
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="!bg-stone-50/80 !text-stone-900 !border-stone-200 focus:!bg-white focus:!border-[#B1E743] focus:!ring-[#B1E743]/20 !placeholder-stone-400"
              required
              disabled={!token || isLoading}
            />

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full"
                isLoading={isLoading}
                disabled={!token || isLoading}
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                {isLoading ? 'Updating Password…' : 'Update Password'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
