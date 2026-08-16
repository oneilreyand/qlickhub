import React, { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../lib/api/authService';
import { Lock, Mail, ArrowRight, AlertTriangle } from 'lucide-react';
import { Alert } from '../components/ui/atoms/Alert';
import { Button } from '../components/ui/atoms/Button';
import { Input } from '../components/ui/atoms/Input';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isSessionOverridden = searchParams.get('reason') === 'session_overridden';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Call Backend API POST /v1/auth/login
      const res = await authService.login({ email: email.trim(), password });

      // Only non-sensitive profile data is stored for UI display. The access token stays HttpOnly.
      localStorage.setItem('user_role', res.user.role || 'qa_member');
      localStorage.setItem('user_email', res.user.email || email);
      localStorage.setItem('user_name', res.user.name || 'User');
      localStorage.setItem('user_id', res.user.id);

      setIsLoading(false);
      const requestedPath = (location.state as { from?: { pathname?: string; search?: string } } | null)?.from;
      const destination = requestedPath?.pathname?.startsWith('/work')
        ? `${requestedPath.pathname}${requestedPath.search || ''}`
        : '/work';
      navigate(destination, { replace: true });
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err?.message || 'Otentikasi gagal. Pastikan email dan kata sandi Anda benar.');
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[#FBFCF7] flex items-center justify-center p-4 sm:p-6 select-none relative overflow-hidden">
      {/* Light Theme Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-indigo-200/40 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 rounded-full bg-teal-100/50 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white p-8 rounded-[24px] border border-stone-200/80 shadow-xl shadow-stone-200/60 space-y-6 relative z-10">
        {/* Header Branding */}
        <div className="text-center">
          <p className="text-sm font-medium text-stone-600">
            Sign in to access your account.
          </p>
        </div>

        {isSessionOverridden && (
          <Alert tone="warning" icon={<AlertTriangle className="h-4 w-4 text-amber-500" />} title="Sesi Anda Telah Berakhir (Double Login)">
            Akun ini baru saja di-login dari perangkat atau browser lain. Sesi sebelumnya otomatis dinonaktifkan untuk keamanan.
          </Alert>
        )}

        {errorMessage && (
          <Alert tone="error">{errorMessage}</Alert>
        )}

        {/* Form Login */}
        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            id="email-input"
            leftIcon={<Mail className="h-3.5 w-3.5 text-stone-400" />}
            type="email"
            placeholder="Masukkan alamat email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="!bg-stone-50/80 !text-stone-900 !border-stone-200 focus:!bg-white focus:!border-indigo-600 focus:!ring-indigo-500/20 !placeholder-stone-400"
            required
          />

          <div className="space-y-1.5">
            <Input
              id="password-input"
              leftIcon={<Lock className="h-3.5 w-3.5 text-stone-400" />}
              type="password"
              placeholder="Masukkan kata sandi"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="!bg-stone-50/80 !text-stone-900 !border-stone-200 focus:!bg-white focus:!border-indigo-600 focus:!ring-indigo-500/20 !placeholder-stone-400"
              required
            />
            <div className="flex justify-end pt-0.5">
              <Link to="/forgot-password" className="text-[11px] text-indigo-600 hover:text-indigo-700 hover:underline font-medium">
                Forgot password?
              </Link>
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              className="w-full"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              {isLoading ? 'Signing in…' : 'Sign In'}
            </Button>
          </div>
        </form>

        {/* Footer info */}
        <div className="pt-2 border-t border-stone-100 text-center">
          <span className="text-[11px] text-stone-400">
            Secure account authentication
          </span>
        </div>
      </div>
    </div>
  );
};
