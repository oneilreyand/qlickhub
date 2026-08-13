import React, { useEffect } from 'react';
import { Snackbar } from './Snackbar';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { dismissSnackbar, SnackbarNotification } from '../../../store/uiSlice';

export const GlobalSnackbarHost: React.FC = () => {
  const dispatch = useAppDispatch();
  const notifications = useAppSelector((state) => state.ui.notifications);

  if (!notifications.length) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {notifications.map((n) => (
        <div key={n.id} className="pointer-events-auto">
          <SnackbarItem
            notification={n}
            onClose={() => dispatch(dismissSnackbar(n.id))}
          />
        </div>
      ))}
    </div>
  );
};

const SnackbarItem: React.FC<{
  notification: SnackbarNotification;
  onClose: () => void;
}> = ({ notification, onClose }) => {
  useEffect(() => {
    const timeout = window.setTimeout(onClose, 4500);
    return () => window.clearTimeout(timeout);
  }, [onClose]);

  return (
    <Snackbar
      message={notification.message}
      type={notification.type}
      statusCode={notification.statusCode}
      onClose={onClose}
    />
  );
};
