import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { authService } from '../../lib/api/authService';
import { X } from 'lucide-react';
import { GlobalSnackbarHost } from '../ui/molecules/GlobalSnackbarHost';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setMobileSidebarOpen } from '../../store/uiSlice';
import { ThemeProvider } from '../../lib/theme/ThemeContext';
import { IconButton } from '../ui/atoms/IconButton';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayoutContent: React.FC<AppLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const mobileOpen = useAppSelector((state) => state.ui.mobileSidebarOpen);

  const userEmail = localStorage.getItem('user_email') || 'qa.lead@company.com';

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
      <main className="flex-1 min-w-0 max-w-full w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
      <GlobalSnackbarHost />
    </div>
  );
};


export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => (
  <ThemeProvider>
    <AppLayoutContent>{children}</AppLayoutContent>
  </ThemeProvider>
);
