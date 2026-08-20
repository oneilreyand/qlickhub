import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../lib/api/authService';
import { Mail, ArrowLeft, Send, CheckCircle2 } from 'lucide-react';
import { Alert } from '../components/ui/atoms/Alert';
import { Button } from '../components/ui/atoms/Button';
import { Input } from '../components/ui/atoms/Input';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await authService.forgotPassword(email.trim());
      setIsSubmitted(true);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to request password reset. Please try again.');
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
        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-xl font-bold text-stone-900">Reset Password</h1>
          <p className="text-sm text-stone-500">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        {errorMessage && <Alert tone="error">{errorMessage}</Alert>}

        {isSubmitted ? (
          <div className="space-y-6 py-2 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-semibold text-stone-900">Check your inbox</h3>
              <p className="text-xs text-stone-500 leading-relaxed max-w-xs mx-auto">
                If an account exists for <strong className="text-stone-700">{email}</strong>, we've dispatched a password reset link.
              </p>
            </div>
            <div className="pt-2">
              <Link to="/login">
                <Button variant="outline" className="w-full" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                  Back to Sign In
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="forgot-email-input"
              leftIcon={<Mail className="h-3.5 w-3.5 text-stone-400" />}
              type="email"
              placeholder="Enter your registered email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="!bg-stone-50/80 !text-stone-900 !border-stone-200 focus:!bg-white focus:!border-[#B1E743] focus:!ring-[#B1E743]/20 !placeholder-stone-400"
              required
            />

            <div className="pt-2 space-y-2">
              <Button
                type="submit"
                className="w-full"
                isLoading={isLoading}
                rightIcon={<Send className="h-4 w-4" />}
              >
                {isLoading ? 'Sending Link…' : 'Send Reset Link'}
              </Button>

              <Link to="/login" className="block text-center pt-2">
                <span className="text-xs text-stone-500 hover:text-stone-800 font-medium inline-flex items-center gap-1">
                  <ArrowLeft className="h-3 w-3" /> Back to Sign In
                </span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
