import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Snackbar } from './Snackbar';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { dismissSnackbar, SnackbarNotification } from '../../../store/uiSlice';

export const GlobalSnackbarHost: React.FC = () => {
  const dispatch = useAppDispatch();
  const notifications = useAppSelector((state) => state.ui.notifications);

  const handleDismiss = useCallback(
    (id: string) => {
      dispatch(dismissSnackbar(id));
    },
    [dispatch]
  );

  if (!notifications.length) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {notifications.map((n) => (
        <div key={n.id} className="pointer-events-auto">
          <SnackbarItem
            notification={n}
            onClose={() => handleDismiss(n.id)}
          />
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
