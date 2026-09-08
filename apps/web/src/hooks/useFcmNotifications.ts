import { useState, useEffect, useCallback } from 'react';
import { onMessage } from 'firebase/messaging';
import { firebaseConfig, firebaseVapidKey, getMessagingInstance } from '../config/firebase';
import { registerCurrentFcmDevice } from '../lib/firebase/fcmDevice';
import {
  getMissingFirebaseWebPushConfig,
  requiresIosHomeScreenInstall,
} from '../lib/firebase/mobilePushSupport';
import { useAppDispatch } from '../store/hooks';
import { addInAppNotification, enqueueSnackbar, NotificationType } from '../store/uiSlice';

export type FcmRegistrationStatus =
  | 'checking'
  | 'unsupported'
  | 'installation_required'
  | 'permission_required'
  | 'registering'
  | 'registered'
  | 'denied'
  | 'error';

export function useFcmNotifications() {
  const dispatch = useAppDispatch();
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    return typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'default';
  });
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [registrationStatus, setRegistrationStatus] = useState<FcmRegistrationStatus>('checking');
  const [registrationError, setRegistrationError] = useState<string | null>(null);

  // Initialize and register token if permission was already granted
  const registerToken = useCallback(async (): Promise<boolean> => {
    if (
      typeof window === 'undefined' ||
      !('Notification' in window) ||
      !('serviceWorker' in navigator)
    ) {
      setRegistrationStatus('unsupported');
      return false;
    }

    try {
      setIsRegistering(true);
      setRegistrationStatus('registering');
      setRegistrationError(null);

      const registration = await registerCurrentFcmDevice();
      setFcmToken(registration.token);
      setRegistrationStatus('registered');
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registrasi Web Push gagal.';
      setFcmToken(null);
      setRegistrationError(
        'Perangkat belum berhasil didaftarkan untuk Web Push. Periksa koneksi lalu coba lagi.',
      );
      setRegistrationStatus('error');
      console.warn('⚠️ FCM registration notice:', message);
      return false;
    } finally {
      setIsRegistering(false);
    }
  }, []);

  // Request browser permission and obtain FCM token
  const requestPermission = useCallback(async () => {
    if (requiresIosHomeScreenInstall()) {
      setRegistrationStatus('installation_required');
      dispatch(
        enqueueSnackbar(
          'Tambahkan Qlick Hub ke Layar Utama, lalu buka dari ikon tersebut untuk mengaktifkan notifikasi.',
          'warning',
        ),
      );
      return false;
    }

    if (getMissingFirebaseWebPushConfig(firebaseConfig, firebaseVapidKey).length > 0) {
      setRegistrationStatus('error');
      setRegistrationError(
        'Layanan Web Push belum dikonfigurasi untuk environment ini. Hubungi administrator.',
      );
      dispatch(enqueueSnackbar('Layanan Web Push belum siap pada environment ini.', 'error'));
      return false;
    }

    if (typeof window === 'undefined' || !('Notification' in window)) {
      dispatch(enqueueSnackbar('Notifikasi browser tidak didukung di perangkat ini.', 'warning'));
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        const registered = await registerToken();
        if (registered) {
          dispatch(
            enqueueSnackbar('Notifikasi Firebase Cloud Messaging berhasil diaktifkan!', 'success'),
          );
        } else {
          dispatch(
            enqueueSnackbar(
              'Izin diberikan, tetapi perangkat belum berhasil didaftarkan.',
              'error',
            ),
          );
        }
        return registered;
      } else if (result === 'denied') {
        setRegistrationStatus('denied');
        dispatch(enqueueSnackbar('Izin notifikasi ditolak oleh browser.', 'warning'));
        return false;
      }
      setRegistrationStatus('permission_required');
      return false;
    } catch (err) {
      console.warn('Error requesting notification permission:', err);
      return false;
    }
  }, [dispatch, registerToken]);

  // Initial check & auto-register if already granted
  useEffect(() => {
    if (requiresIosHomeScreenInstall()) {
      setRegistrationStatus('installation_required');
      return;
    }

    if (
      typeof window === 'undefined' ||
      !('Notification' in window) ||
      !('serviceWorker' in navigator) ||
      window.isSecureContext === false
    ) {
      setRegistrationStatus('unsupported');
      return;
    }

    setIsSupported(true);
    setPermission(Notification.permission);

    if (getMissingFirebaseWebPushConfig(firebaseConfig, firebaseVapidKey).length > 0) {
      setRegistrationStatus('error');
      setRegistrationError(
        'Layanan Web Push belum dikonfigurasi untuk environment ini. Hubungi administrator.',
      );
      return;
    }

    if (Notification.permission === 'granted') {
      registerToken().catch(() => {});
    } else if (Notification.permission === 'denied') {
      setRegistrationStatus('denied');
    } else {
      setRegistrationStatus('permission_required');
    }
  }, [registerToken]);

  // Set up foreground message listener
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    getMessagingInstance().then((messagingInstance) => {
      if (!messagingInstance) return;

      unsubscribe = onMessage(messagingInstance, (payload) => {
        const title = payload.notification?.title || payload.data?.title || 'Notifikasi Baru';
        const message =
          payload.notification?.body || payload.data?.body || 'Ada pembaruan pada workspace Anda.';
        const typeRaw = payload.data?.type || 'system';
        const taskId = payload.data?.taskId;

        const supportedTypes: NotificationType[] = [
          'mention',
          'assignment',
          'status_change',
          'system',
          'discussion',
          'deadline',
          'bug_created',
          'bug_status_change',
          'bug_critical',
          'qa_signoff',
          'release_decision',
          'test_failed',
          'workspace_membership',
        ];
        const notifType: NotificationType = supportedTypes.includes(typeRaw as NotificationType)
          ? (typeRaw as NotificationType)
          : 'system';

        // Add to Redux in-app notification list
        dispatch(addInAppNotification(title, message, notifType, taskId));

        // Show toast alert in UI
        dispatch(enqueueSnackbar(`${title}: ${message}`, 'info'));
      });
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [dispatch]);

  return {
    isSupported,
    permission,
    fcmToken,
    isRegistering,
    registrationStatus,
    registrationError,
    requestPermission,
  };
}
