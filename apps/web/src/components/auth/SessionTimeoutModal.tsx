import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { Modal } from '../ui/molecules/Modal';
import { authService } from '../../lib/api/authService';
import { useAppDispatch } from '../../store/hooks';
import { enqueueSnackbar } from '../../store/uiSlice';

const LAST_ACTIVITY_KEY = 'qlick_last_activity_at';

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
  const dispatch = useAppDispatch();
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(countdownSeconds);
  const [isExtending, setIsExtending] = useState(false);

  const getStoredActivityTime = (): number => {
    try {
      const raw = localStorage.getItem(LAST_ACTIVITY_KEY);
      if (!raw) return 0;
      const parsed = Number(raw);
      return !Number.isNaN(parsed) && parsed > 0 ? parsed : 0;
    } catch {
      return 0;
    }
  };

  const lastActivityTimeRef = useRef<number>(Date.now());
  const lastRefreshTimeRef = useRef<number>(Date.now());
  const lastWriteTimeRef = useRef<number>(0);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogoutDueToInactivity = useCallback(async () => {
    setIsWarningOpen(false);
    try {
      await authService.logout('/login?reason=idle_timeout');
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
      const now = Date.now();
      lastActivityTimeRef.current = now;
      lastRefreshTimeRef.current = now;
      try {
        localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
      } catch {
        // ignore
      }
      setIsWarningOpen(false);
      setRemainingSeconds(countdownSeconds);
      dispatch(enqueueSnackbar('Sesi Anda berhasil diperpanjang.', 'success'));
    } catch {
      // If refresh fails, session is already invalid
      await handleLogoutDueToInactivity();
    } finally {
      setIsExtending(false);
    }
  };

  // Cross-tab synchronization via storage event
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === LAST_ACTIVITY_KEY && e.newValue) {
        const externalActivityTime = Number(e.newValue);
        if (
          !Number.isNaN(externalActivityTime) &&
          externalActivityTime > lastActivityTimeRef.current
        ) {
          lastActivityTimeRef.current = externalActivityTime;
          // Active in another tab: dismiss warning modal and reset countdown
          setIsWarningOpen(false);
          setRemainingSeconds(countdownSeconds);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [countdownSeconds]);

  // Activity listener: tracks user interaction and performs throttled background refresh
  useEffect(() => {
    const onUserActivity = (evt: Event) => {
      const now = Date.now();
      lastActivityTimeRef.current = now;

      // Throttle localStorage writes to once every 2 seconds for continuous events (mousemove/scroll),
      // but update immediately for discrete user interaction events.
      const isDiscrete =
        evt.type === 'keydown' || evt.type === 'mousedown' || evt.type === 'touchstart';
      if (isDiscrete || now - lastWriteTimeRef.current >= 2000) {
        lastWriteTimeRef.current = now;
        try {
          localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
        } catch {
          // ignore
        }
      }

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
      const stored = getStoredActivityTime();
      const effectiveLastActivity =
        stored > 0 ? Math.max(lastActivityTimeRef.current, stored) : lastActivityTimeRef.current;
      lastActivityTimeRef.current = effectiveLastActivity;

      const idleTime = now - effectiveLastActivity;
      const warningThreshold = idleMinutesBeforeWarning * 60 * 1000;
      const totalTimeoutThreshold = warningThreshold + countdownSeconds * 1000;

      if (idleTime >= totalTimeoutThreshold) {
        // Exceeded total allowable inactivity duration (e.g. computer sleep)
        handleLogoutDueToInactivity();
      } else if (idleTime >= warningThreshold) {
        const remaining = Math.max(
          1,
          Math.ceil((totalTimeoutThreshold - idleTime) / 1000),
        );
        setIsWarningOpen(true);
        setRemainingSeconds(remaining);
      }
    }, 15000); // check every 15 seconds

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, onUserActivity));
      clearInterval(checkIdleInterval);
    };
  }, [
    idleMinutesBeforeWarning,
    activeRefreshIntervalMinutes,
    isWarningOpen,
    countdownSeconds,
    handleLogoutDueToInactivity,
  ]);

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
      onClose={handleLogoutDueToInactivity}
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
          <div
            role="timer"
            aria-live="polite"
            aria-atomic="true"
            className="text-3xl font-black font-mono tracking-tight text-amber-600 dark:text-amber-400 py-2"
          >
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

