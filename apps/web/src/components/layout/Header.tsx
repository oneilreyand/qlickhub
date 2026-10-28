import React, { useEffect, useRef, useState } from 'react';
import {
  LogOut,
  Menu,
  Moon,
  Sun,
  Building2,
  User as UserIcon,
  Sparkles,
  Laptop,
  BookOpen,
} from 'lucide-react';
import { useTheme } from '../../lib/theme/ThemeContext';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchWorkspaces } from '../../store/workspaceSlice';
import {
  selectCurrentUser,
  selectCurrentUserRole,
  setShowOnboardingModal,
} from '../../store/authSlice';
import { useNavigate, useLocation } from 'react-router-dom';
import { IconButton } from '../ui/atoms/IconButton';
import { NotificationBell, useNotifications } from '../../features/notifications';

import { UserProfileModal } from '../ui/organisms/UserProfileModal';
import { ActiveSessionsModal } from '../auth/ActiveSessionsModal';
import { useDismissableLayer } from '../../hooks/useDismissableLayer';
import { getSectionLabel } from '../../lib/utils/sectionLabel';
import { featureVisibility } from '../../config/featureVisibility';

interface HeaderProps {
  onToggleMobileSidebar: () => void;
  userEmail?: string;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleMobileSidebar,
  userEmail = '',
  onLogout,
}) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get('tab') || 'overview';
  const sectionLabel = getSectionLabel(location.pathname, currentTab, location.state);

  const { workspaces, activeWorkspaceId } = useAppSelector((state) => state.workspace);
  const currentUser = useAppSelector(selectCurrentUser);
  const currentUserRole = useAppSelector(selectCurrentUserRole);

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSessionsModal, setShowSessionsModal] = useState(false);

  const profileMenuRef = useRef<HTMLDivElement>(null);

  const { theme, toggleTheme } = useTheme();
  const isDarkMode = theme === 'dark';

  const effectiveEmail = currentUser?.email || userEmail;
  const effectiveName = currentUser?.name || effectiveEmail.split('@')[0].replace('.', ' ');
  const userInitial = effectiveEmail ? effectiveEmail[0].toUpperCase() : 'U';
  const userName = effectiveName;

  // Sync notifications and SSE realtime events
  useNotifications(activeWorkspaceId || undefined);

  useDismissableLayer(profileMenuRef, isProfileOpen, () => setIsProfileOpen(false));

  useEffect(() => {
    dispatch(fetchWorkspaces());
  }, [dispatch]);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];
  const userRole = (
    activeWorkspace?.role ||
    activeWorkspace?.myRole ||
    currentUserRole ||
    ''
  ).toLowerCase();
  const canAccessSettings = ['owner', 'admin', 'po'].includes(userRole);

  return (
    <header className="sticky top-0 z-30 h-20 w-full border-b border-border bg-canvas px-4 backdrop-blur-md transition-colors sm:px-8">
      <div className="mx-auto flex h-full w-full max-w-[1440px] items-center justify-between">
        {/* Left section: mobile menu, small-screen logo, and current section */}
        <div className="flex items-center gap-3 lg:gap-4">
          <IconButton
            onClick={onToggleMobileSidebar}
            label="Buka atau tutup menu seluler"
            variant="ghost"
            className="lg:hidden text-stone-700 hover:bg-stone-200/60 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            <Menu className="h-5 w-5" />
          </IconButton>

          {/* Brand logo on small screens; the Sidebar shows it on desktop (ADR-035). */}
          <div className="flex items-center gap-3 lg:hidden">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#B1E743] text-[#141413] shadow-sm font-black text-lg">
              Q
            </div>
          </div>

          <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">
            {sectionLabel}
          </span>
        </div>

        {/* Right section: Notifications & User profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {featureVisibility.userFlowGuide && (
            <IconButton
              onClick={() => navigate('/user-flows')}
              label="Panduan alur kerja & Quality Gate"
              size="sm"
              className="rounded-full border border-stone-200/90 bg-white text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-all dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 dark:hover:text-white"
            >
              <BookOpen className="h-4 w-4 text-[#B1E743] dark:text-[#B1E743]" />
            </IconButton>
          )}

          {/* Quick Theme Toggle Button */}
          <IconButton
            onClick={toggleTheme}
            label={`Ganti ke mode ${isDarkMode ? 'terang' : 'gelap'}`}
            aria-pressed={isDarkMode}
            size="sm"
            className="rounded-full border border-stone-200/90 bg-white dark:border-stone-800 dark:bg-stone-900"
          >
            {isDarkMode ? (
              <Sun className="h-4.5 w-4.5 text-amber-400" />
            ) : (
              <Moon className="h-4.5 w-4.5 text-stone-500" />
            )}
          </IconButton>

          {/* Notification Bell with indicator dot and dropdown */}
          <NotificationBell />

          {/* User Profile Avatar Pill */}
          <div className="relative" ref={profileMenuRef}>
            <button
              type="button"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              aria-label="Menu profil pengguna"
              aria-expanded={isProfileOpen}
              className="flex items-center gap-2 p-0.5 rounded-full border border-stone-200/90 bg-white hover:bg-stone-100 focus:outline-none transition-all dark:border-stone-800 dark:bg-stone-900"
            >
              <div className="relative">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-[#B1E743] text-xs font-bold text-[#141413] shadow-xs">
                  {userInitial}
                </div>
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-[#B1E743] ring-2 ring-white dark:ring-stone-900" />
              </div>
            </button>

            {/* Profile Menu Dropdown */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-stone-200 bg-white p-2 shadow-xl ring-1 ring-stone-900/5 z-30 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100">
                <div className="border-b border-stone-100 px-3 py-2.5 dark:border-stone-800">
                  <p className="text-xs font-semibold text-stone-900 capitalize dark:text-stone-100">
                    {userName}
                  </p>
                  <p className="truncate text-xs text-stone-500 dark:text-stone-400">
                    {effectiveEmail}
                  </p>
                </div>

                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      setShowProfileModal(true);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"
                  >
                    <UserIcon className="h-4 w-4 text-stone-400" />
                    <span>Pengaturan Akun & Profil</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      setShowSessionsModal(true);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"
                  >
                    <Laptop className="h-4 w-4 text-stone-400" />
                    <span>Perangkat & Sesi Aktif</span>
                  </button>

                  {featureVisibility.userFlowGuide && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        navigate('/user-flows');
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"
                    >
                      <BookOpen className="h-4 w-4 text-[#B1E743] dark:text-[#B1E743]" />
                      <span>Panduan Alur &amp; Peran</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      dispatch(setShowOnboardingModal(true));
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"
                  >
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <span>Mulai Ulang Onboarding</span>
                  </button>

                  {canAccessSettings && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        navigate('/workspaces/settings');
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"
                    >
                      <Building2 className="h-4 w-4 text-stone-400" />
                      <span>Pengaturan Workspace</span>
                    </button>
                  )}
                </div>

                <div className="border-t border-stone-100 pt-1 dark:border-stone-800">
                  <button
                    type="button"
                    onClick={onLogout}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Keluar</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User Profile & Password Modal */}
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        currentUser={{
          id: currentUser?.id || '',
          email: effectiveEmail,
          name: effectiveName,
          role: currentUser?.role || 'dev',
        }}
      />

      {/* Active Sessions & Devices Modal */}
      <ActiveSessionsModal isOpen={showSessionsModal} onClose={() => setShowSessionsModal(false)} />
    </header>
  );
};
