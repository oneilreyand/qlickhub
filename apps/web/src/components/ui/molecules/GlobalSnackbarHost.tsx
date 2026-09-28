import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Snackbar } from './Snackbar';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { dismissSnackbar, SnackbarNotification } from '../../../store/uiSlice';
import { RATE_LIMIT_EVENT, RateLimitInfo } from '../../../lib/api/apiClient';
import { RateLimitCountdown } from './RateLimitCountdown';

export const GlobalSnackbarHost: React.FC = () => {
  const dispatch = useAppDispatch();
  const notifications = useAppSelector((state) => state.ui.notifications);
  const [rateLimit, setRateLimit] = useState<RateLimitInfo | null>(null);

  useEffect(() => {
    const handleRateLimit = (event: Event) => {
      const detail = (event as CustomEvent<RateLimitInfo>).detail;
      if (detail) setRateLimit(detail);
    };
    window.addEventListener(RATE_LIMIT_EVENT, handleRateLimit);
    return () => window.removeEventListener(RATE_LIMIT_EVENT, handleRateLimit);
  }, []);

  const handleDismiss = useCallback(
    (id: string) => {
      dispatch(dismissSnackbar(id));
    },
    [dispatch],
  );

  if (!notifications.length && !rateLimit) return null;

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-5 z-50 mx-auto flex w-auto max-w-sm flex-col gap-2 sm:inset-x-6">
      {rateLimit && (
        <div className="pointer-events-auto transition-transform duration-200 hover:scale-[1.01]">
          <Snackbar
            message={
              <RateLimitCountdown rateLimit={rateLimit} onComplete={() => setRateLimit(null)} />
            }
            type="warning"
            statusCode={429}
            onClose={() => setRateLimit(null)}
          />
        </div>
      )}
      {notifications.map((n) => (
        <div key={n.id} className="pointer-events-auto">
          <SnackbarItem notification={n} onClose={() => handleDismiss(n.id)} />
        </div>
      ))}
    </div>
  );
};

const SnackbarItem: React.FC<{
  notification: SnackbarNotification;
  onClose: () => void;
  duration?: number;
}> = ({ notification, onClose, duration = 4000 }) => {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const [isHovered, setIsHovered] = useState(false);
  const remainingTimeRef = useRef(duration);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    if (isHovered) return;

    startTimeRef.current = Date.now();
    const timeout = window.setTimeout(() => {
      onCloseRef.current();
    }, remainingTimeRef.current);

    return () => {
      window.clearTimeout(timeout);
      const elapsed = Date.now() - startTimeRef.current;
      remainingTimeRef.current = Math.max(500, remainingTimeRef.current - elapsed);
    };
  }, [isHovered]);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="transition-transform duration-200 hover:scale-[1.01]"
    >
      <Snackbar
        message={notification.message}
        type={notification.type}
        statusCode={notification.statusCode}
        onClose={onClose}
      />
    </div>
  );
};
