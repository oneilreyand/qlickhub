import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authService } from '../../lib/api/authService';

export interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const location = useLocation();
  const [status, setStatus] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking');

  useEffect(() => {
    let active = true;

    authService
      .getSession()
      .then((user) => {
        if (!active) return;
        localStorage.setItem('user_role', user.role);
        localStorage.setItem('user_email', user.email);
        localStorage.setItem('user_name', user.name);
        localStorage.setItem('user_id', user.id);
        setStatus('authenticated');
      })
      .catch(() => {
        if (active) setStatus('unauthenticated');
      });

    return () => {
      active = false;
    };
  }, []);

  if (status === 'checking') {
    return (
      <div className="min-h-screen w-screen bg-[#FBFCF7] dark:bg-[#141413] flex items-center justify-center" aria-label="Checking session">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-stone-300 border-t-stone-800 dark:border-stone-700 dark:border-t-[#B1E743] animate-spin" />
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
