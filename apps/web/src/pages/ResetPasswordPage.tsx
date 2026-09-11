import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../lib/api/authService';
import { Lock, ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Alert } from '../components/ui/atoms/Alert';
import { Button } from '../components/ui/atoms/Button';
import { Input } from '../components/ui/atoms/Input';

export const ResetPasswordPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [token] = useState(() => {
    const fragmentParams = new URLSearchParams(location.hash.replace(/^#/, ''));
    const queryParams = new URLSearchParams(location.search);
    return fragmentParams.get('token') || queryParams.get('token') || '';
  });

  const sanitizedLocation = useMemo(() => {
    const queryParams = new URLSearchParams(location.search);
    const fragmentParams = new URLSearchParams(location.hash.replace(/^#/, ''));
    const hasQueryToken = queryParams.has('token');
    const hasFragmentToken = fragmentParams.has('token');

    if (!hasQueryToken && !hasFragmentToken) return null;

    queryParams.delete('token');
    fragmentParams.delete('token');
    const sanitizedQuery = queryParams.toString();
    const sanitizedFragment = fragmentParams.toString();

    return {
      pathname: location.pathname,
      search: sanitizedQuery ? `?${sanitizedQuery}` : '',
      hash: sanitizedFragment ? `#${sanitizedFragment}` : '',
    };
  }, [location.hash, location.pathname, location.search]);

  useLayoutEffect(() => {
    if (!sanitizedLocation) return;

    const browserLocation = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const routerLocation = `${location.pathname}${location.search}${location.hash}`;
    if (browserLocation !== routerLocation) return;

    const sanitizedUrl = `${sanitizedLocation.pathname}${sanitizedLocation.search}${sanitizedLocation.hash}`;
    window.history.replaceState(window.history.state, '', sanitizedUrl);
  }, [location.hash, location.pathname, location.search, sanitizedLocation]);

  useEffect(() => {
    if (sanitizedLocation) navigate(sanitizedLocation, { replace: true });
  }, [navigate, sanitizedLocation]);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setErrorMessage('Token atur ulang kata sandi tidak valid atau tidak tersedia.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMessage('Kata sandi minimal terdiri dari 6 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Konfirmasi kata sandi tidak cocok.');
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
      setErrorMessage(
        err?.message || 'Kata sandi gagal diatur ulang. Tautan mungkin sudah kedaluwarsa.',
      );
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
          <h1 className="text-xl font-bold text-stone-900">Buat Kata Sandi Baru</h1>
          <p className="text-sm text-stone-500">Masukkan dan konfirmasikan kata sandi baru Anda.</p>
        </div>

        {!token && (
          <Alert tone="error" icon={<AlertTriangle className="h-4 w-4 text-rose-500" />}>
            Tautan tidak memiliki token atur ulang. Silakan minta tautan baru.
          </Alert>
        )}

        {errorMessage && <Alert tone="error">{errorMessage}</Alert>}

        {isSuccess ? (
          <div className="space-y-6 py-2 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-semibold text-stone-900">
                Kata Sandi Berhasil Diatur Ulang
              </h3>
              <p className="text-xs text-stone-500">
                Kata sandi berhasil diperbarui. Anda akan diarahkan ke halaman masuk…
              </p>
            </div>
            <div className="pt-2">
              <Link to="/login">
                <Button className="w-full">Masuk Sekarang</Button>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="new-password-input"
              leftIcon={<Lock className="h-3.5 w-3.5 text-stone-400" />}
              type="password"
              placeholder="Kata sandi baru (minimal 6 karakter)"
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
              placeholder="Konfirmasi kata sandi baru"
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
                {isLoading ? 'Memperbarui kata sandi…' : 'Perbarui Kata Sandi'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
