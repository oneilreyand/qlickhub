import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { Modal } from '../ui/molecules/Modal';
import { authService } from '../../lib/api/authService';

interface SessionTimeoutModalProps {
  /**
   * Idle threshold in minutes before showing warning modal.
   * Default: 28 minutes (warning 2 minutes before a 30m idle limit).
   */
  idleMinutesBeforeWarning?: number;
  /**
   * Countdown duration in seconds in the warning modal before forced auto-logout.
   * Default: 120 seconds (2 minutes).
   */
  countdownSeconds?: number;
  /**
   * Background silent refresh throttle interval in minutes while user is active.
   * Default: 10 minutes.
   */
  activeRefreshIntervalMinutes?: number;
}

export const SessionTimeoutModal: React.FC<SessionTimeoutModalProps> = ({
  idleMinutesBeforeWarning = 28,
  countdownSeconds = 120,
  activeRefreshIntervalMinutes = 10,
}) => {
  const navigate = useNavigate();
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(countdownSeconds);
  const [isExtending, setIsExtending] = useState(false);

  const lastActivityTimeRef = useRef<number>(Date.now());
  const lastRefreshTimeRef = useRef<number>(Date.now());
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogoutDueToInactivity = useCallback(async () => {
    setIsWarningOpen(false);
    try {
      await authService.logout();
    } catch {
      // ignore
    } finally {
      navigate('/login?reason=idle_timeout');
    }
  }, [navigate]);

  const handleExtendSession = async () => {
    setIsExtending(true);
    try {
      await authService.refreshSession();
      lastActivityTimeRef.current = Date.now();
      lastRefreshTimeRef.current = Date.now();
      setIsWarningOpen(false);
      setRemainingSeconds(countdownSeconds);
    } catch {
      // If refresh fails, session is already invalid
      await handleLogoutDueToInactivity();
    } finally {
      setIsExtending(false);
    }
  };

  // Activity listener: tracks user interaction and performs throttled background refresh
  useEffect(() => {
    const onUserActivity = () => {
      const now = Date.now();
      lastActivityTimeRef.current = now;

      // If warning modal is not open, check if we should do a background keep-alive refresh
      if (!isWarningOpen) {
        const timeSinceLastRefresh = now - lastRefreshTimeRef.current;
        if (timeSinceLastRefresh > activeRefreshIntervalMinutes * 60 * 1000) {
          lastRefreshTimeRef.current = now;
          authService.refreshSession().catch(() => {
            // silent ignore background error, apiClient retry will handle it
          });
        }
      }
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((evt) => window.addEventListener(evt, onUserActivity, { passive: true }));

    // Periodic check for idle timeout warning
    const checkIdleInterval = setInterval(() => {
      if (isWarningOpen) return;
      const now = Date.now();
      const idleTime = now - lastActivityTimeRef.current;
      const warningThreshold = idleMinutesBeforeWarning * 60 * 1000;

      if (idleTime >= warningThreshold) {
        setIsWarningOpen(true);
        setRemainingSeconds(countdownSeconds);
      }
    }, 15000); // check every 15 seconds

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, onUserActivity));
      clearInterval(checkIdleInterval);
    };
  }, [idleMinutesBeforeWarning, activeRefreshIntervalMinutes, isWarningOpen, countdownSeconds]);

  // Countdown timer when warning modal is active
  useEffect(() => {
    if (isWarningOpen) {
      countdownIntervalRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current as NodeJS.Timeout);
            handleLogoutDueToInactivity();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [isWarningOpen, handleLogoutDueToInactivity]);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Modal
      isOpen={isWarningOpen}
      onClose={() => {}}
      title="Sesi Anda Akan Berakhir"
      primaryActionLabel="Tetap Masuk (Perpanjang Sesi)"
      onPrimaryAction={handleExtendSession}
      secondaryActionLabel="Keluar Sekarang"
      isPrimaryLoading={isExtending}
      size="sm"
    >
      <div className="space-y-4 text-center py-2">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
          <Clock className="h-6 w-6 animate-pulse" />
        </div>

        <div className="space-y-1">
          <p className="text-sm text-stone-600 dark:text-stone-300">
            Anda telah tidak aktif selama beberapa waktu. Untuk menjaga keamanan data Anda, sesi akan diakhiri secara otomatis dalam:
          </p>
          <div className="text-3xl font-black font-mono tracking-tight text-amber-600 dark:text-amber-400 py-2">
            {formatCountdown(remainingSeconds)}
          </div>
          <p className="text-xs text-stone-400 dark:text-stone-500">
            Klik tombol di bawah untuk tetap aktif bekerja tanpa kehilangan progres Anda.
          </p>
        </div>
      </div>
    </Modal>
  );
};
