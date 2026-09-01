import React, { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../lib/api/authService';
import { Lock, Mail, ArrowRight, AlertTriangle, ShieldCheck, Sparkles } from 'lucide-react';
import { Alert } from '../components/ui/atoms/Alert';
import { Button } from '../components/ui/atoms/Button';
import { Input } from '../components/ui/atoms/Input';
import { useAppDispatch } from '../store/hooks';
import { setSessionUser } from '../store/authSlice';

const LOGIN_HERO_IMAGE_URL =
  'https://res.cloudinary.com/dxgnzhn8l/image/upload/v1787848938/ChatGPT_Image_Aug_19_2026_03_01_47_PM.png';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const reason = searchParams.get('reason');
  const isSessionOverridden = reason === 'session_overridden';
  const isIdleTimeout = reason === 'idle_timeout';
  const isSessionExpired = reason === 'session_expired';

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

      localStorage.setItem('user_role', res.user.role || 'dev');
      localStorage.setItem('user_email', res.user.email || email);
      localStorage.setItem('user_name', res.user.name || 'User');
      localStorage.setItem('user_id', res.user.id);
      if (res.user.onboardingCompletedAt) {
        localStorage.setItem('user_onboarding_completed_at', res.user.onboardingCompletedAt);
      } else {
        localStorage.removeItem('user_onboarding_completed_at');
      }

      // Clear any previous session dismissal flags so freshly logged-in user gets their onboarding
      sessionStorage.removeItem('onboarding_dismissed');
      if (res.user.id) {
        sessionStorage.removeItem(`onboarding_dismissed_${res.user.id}`);
      }

      dispatch(setSessionUser(res.user));

      setIsLoading(false);
      const requestedPath = (
        location.state as { from?: { pathname?: string; search?: string } } | null
      )?.from;
      const destination = requestedPath?.pathname?.startsWith('/work')
        ? `${requestedPath.pathname}${requestedPath.search || ''}`
        : '/work';
      navigate(destination, { replace: true });
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(
        err?.message || 'Otentikasi gagal. Pastikan email dan kata sandi Anda benar.',
      );
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FBFCF7] dark:bg-[#141413] flex flex-col lg:flex-row overflow-x-hidden select-none">
      {/* LEFT COLUMN: Hero Showcase & Image (Desktop & Large Screens) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-stone-900 flex-col justify-between p-10 xl:p-14 overflow-hidden">
        {/* Background Image with Ambient Gradient Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src={LOGIN_HERO_IMAGE_URL}
            alt="QA Management Platform Illustration"
            className="w-full h-full object-cover object-center transform transition-transform duration-700 hover:scale-105"
          />
          {/* Subtle multi-layer gradient overlays for contrast & deep readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/95 via-stone-950/40 to-stone-950/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-stone-950/50 via-transparent to-stone-950/30" />
        </div>

        {/* Top Branding Pill */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#B1E743] text-[#22201F] font-black text-xl shadow-lg shadow-[#B1E743]/20">
            Q
          </div>
          <div className="leading-tight">
            <h2 className="text-base font-bold text-white tracking-wide">Qlick Hub</h2>
            <p className="text-xs text-stone-300 font-medium">
              Task Management & Collaboration Hub
            </p>
          </div>
        </div>

        {/* Bottom Hero Pitch */}
        <div className="relative z-10 space-y-4 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs text-white/90 font-semibold shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#B1E743]" />
            <span>Qlick Hub — Task Management & Collaboration Platform</span>
          </div>

          <h1 className="text-2xl xl:text-3xl font-extrabold text-white leading-tight tracking-tight">
            Accelerate delivery with real-time task management & cross-role collaboration.
          </h1>

          <p className="text-xs xl:text-sm text-stone-300 leading-relaxed">
            Centralize requirements, cross-role subtask handoffs (PO ➔ Dev ➔ QA), delivery tracking,
            and team discussions in one unified workspace.
          </p>

          <div className="pt-2 flex items-center gap-4 text-xs font-semibold text-stone-400">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#B1E743]" />
              Task Management & Sprints
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#B1E743]" />
              Cross-Role Collaboration
            </span>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Form Login (Responsive for All Screens) */}
      <div className="flex-1 flex flex-col justify-center items-center p-4 sm:p-8 lg:p-12 relative z-10 overflow-y-auto min-h-screen">
        {/* Ambient Glows */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full bg-[#B1E743]/10 dark:bg-[#B1E743]/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/3 w-80 h-80 rounded-full bg-[#B1E743]/20 dark:bg-[#B1E743]/5 blur-3xl pointer-events-none" />

        {/* Mobile-Only Hero Banner (Shown only on small screens < lg) */}
        <div className="lg:hidden w-full max-w-md mb-4 sm:mb-6 rounded-2xl overflow-hidden shadow-lg border border-stone-200/80 dark:border-stone-800 relative h-36 sm:h-44 shrink-0">
          <img
            src={LOGIN_HERO_IMAGE_URL}
            alt="Qlick Hub Platform"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/40 to-transparent flex items-end p-4">
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#B1E743] text-[#22201F] font-black text-base shadow-sm">
                Q
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Qlick Hub</h2>
                <p className="text-[11px] text-stone-300">Sign in to your account</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Login Card */}
        <div className="w-full max-w-md bg-white dark:bg-stone-900/90 p-6 sm:p-8 rounded-[24px] border border-stone-200/80 dark:border-stone-800 shadow-xl shadow-stone-200/50 dark:shadow-black/40 space-y-6 relative z-10">
          {/* Header Branding on Desktop */}
          <div className="space-y-1 text-left">
            <div className="hidden lg:flex items-center gap-2.5 mb-2">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-[#B1E743] text-[#22201F] font-black text-sm shadow-xs">
                Q
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
                Qlick Hub
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 dark:text-stone-100 tracking-tight">
              Selamat Datang Kembali
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">
              Sign in to access your workspaces, tasks, and reports.
            </p>
          </div>

          {/* Alert States */}
          {isSessionOverridden && (
            <Alert
              tone="warning"
              icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
              title="Sesi Tergantikan"
            >
              Batas sesi bersamaan untuk akun ini telah tercapai atau login baru telah menggantikan
              sesi ini.
            </Alert>
          )}

          {isIdleTimeout && (
            <Alert
              tone="warning"
              icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
              title="Sesi Habis Karena Tidak Aktif"
            >
              Anda telah keluar otomatis karena tidak ada aktivitas selama beberapa waktu. Silakan
              masuk kembali untuk melanjutkan.
            </Alert>
          )}

          {isSessionExpired && (
            <Alert
              tone="warning"
              icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
              title="Sesi Berakhir"
            >
              Masa berlaku sesi login telah berakhir. Silakan masuk kembali.
            </Alert>
          )}

          {errorMessage && <Alert tone="error">{errorMessage}</Alert>}

          {/* Form Login */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="email-input"
                className="block text-xs font-bold text-stone-700 dark:text-stone-300"
              >
                Email Address
              </label>
              <Input
                id="email-input"
                leftIcon={<Mail className="h-4 w-4 text-stone-400" />}
                type="email"
                placeholder="Masukkan alamat email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="!bg-stone-50/80 dark:!bg-stone-800/80 !text-stone-900 dark:!text-stone-100 !border-stone-200 dark:!border-stone-700 focus:!bg-white dark:focus:!bg-stone-800 focus:!border-stone-900 dark:focus:!border-[#B1E743] focus:!ring-stone-900/10 !placeholder-stone-400"
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password-input"
                  className="block text-xs font-bold text-stone-700 dark:text-stone-300"
                >
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200 hover:underline font-semibold transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password-input"
                leftIcon={<Lock className="h-4 w-4 text-stone-400" />}
                type="password"
                placeholder="Masukkan kata sandi"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="!bg-stone-50/80 dark:!bg-stone-800/80 !text-stone-900 dark:!text-stone-100 !border-stone-200 dark:!border-stone-700 focus:!bg-white dark:focus:!bg-stone-800 focus:!border-stone-900 dark:focus:!border-[#B1E743] focus:!ring-stone-900/10 !placeholder-stone-400"
                required
                autoComplete="current-password"
              />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full h-11 text-sm font-bold shadow-sm hover:shadow-md transition-all"
                isLoading={isLoading}
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                {isLoading ? 'Signing in…' : 'Sign In to Hub'}
              </Button>
            </div>
          </form>

          {/* Footer info */}
          <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-center gap-1.5 text-center">
            <ShieldCheck className="h-3.5 w-3.5 text-stone-400" />
            <span className="text-[11px] font-medium text-stone-400 dark:text-stone-500">
              Secure enterprise authentication & session guard
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
