import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { authService } from '../../lib/api/authService';
import { X } from 'lucide-react';
import { GlobalSnackbarHost } from '../ui/molecules/GlobalSnackbarHost';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setMobileSidebarOpen } from '../../store/uiSlice';
import {
  selectCurrentUser,
  selectShowOnboardingModal,
  setShowOnboardingModal,
} from '../../store/authSlice';
import { IconButton } from '../ui/atoms/IconButton';
import { SessionTimeoutModal } from '../auth/SessionTimeoutModal';
import { RoleOnboardingModal } from '../ui/organisms/RoleOnboardingModal';
import { isOnboardingDismissed } from '../../lib/storage/browserStorage';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayoutContent: React.FC<AppLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const mobileOpen = useAppSelector((state) => state.ui.mobileSidebarOpen);
  const currentUser = useAppSelector(selectCurrentUser);
  const showOnboardingModal = useAppSelector(selectShowOnboardingModal);

  const userEmail = currentUser?.email || '';

  // Trigger onboarding on first-time login if not yet completed and not dismissed in current browser session
  useEffect(() => {
    if (currentUser && !currentUser.onboardingCompletedAt) {
      if (!isOnboardingDismissed()) {
        dispatch(setShowOnboardingModal(true));
      }
    }
  }, [currentUser, dispatch]);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {
      // ignore
    } finally {
      navigate('/login');
    }
  };

  return (
    <div className="flex flex-col min-h-screen w-screen bg-[#FBFCF7] font-sans text-[#22201F] transition-colors duration-200 dark:bg-[#141413] dark:text-stone-100">
      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity dark:bg-stone-950/80"
            onClick={() => dispatch(setMobileSidebarOpen(false))}
            aria-hidden="true"
          />

          {/* Drawer Content */}
          <div className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-white shadow-2xl dark:bg-[#1C1A19]">
            <div className="absolute top-4 right-4 z-10">
              <IconButton
                onClick={() => dispatch(setMobileSidebarOpen(false))}
                label="Close navigation"
                size="sm"
                variant="ghost"
                className="bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300"
              >
                <X className="h-5 w-5" />
              </IconButton>
            </div>
            <Sidebar onCloseMobile={() => dispatch(setMobileSidebarOpen(false))} />
          </div>
        </div>
      )}

      {/* Header Bar */}
      <Header
        onToggleMobileSidebar={() => dispatch(setMobileSidebarOpen(true))}
        userEmail={userEmail}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="mx-auto w-full min-w-0 max-w-full flex-1 px-4 py-4 sm:px-8 sm:py-6 lg:py-8">
        {children}
      </main>
      <GlobalSnackbarHost />
      <SessionTimeoutModal />
      <RoleOnboardingModal
        isOpen={showOnboardingModal}
        onClose={() => dispatch(setShowOnboardingModal(false))}
      />
    </div>
  );
};

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => (
  <AppLayoutContent>{children}</AppLayoutContent>
);
