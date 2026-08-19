import { useState, useEffect, useCallback } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { getMessagingInstance, firebaseConfig } from '../config/firebase';
import { notificationService } from '../lib/api/notificationService';
import { useAppDispatch } from '../store/hooks';
import { addInAppNotification, enqueueSnackbar, NotificationType } from '../store/uiSlice';

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

  // Initialize and register token if permission was already granted
  const registerToken = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
      return;
    }

    const messagingInstance = await getMessagingInstance();
    if (!messagingInstance) return;

    try {
      setIsRegistering(true);

      // Register the background service worker
      const swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      await navigator.serviceWorker.ready;

      // Send Firebase config to service worker so it can init without hardcoded credentials
      const sw = swRegistration.active || swRegistration.waiting || swRegistration.installing;
      if (sw) {
        sw.postMessage({ type: 'FIREBASE_CONFIG', config: firebaseConfig });
      }

      // Get FCM token
      const token = await getToken(messagingInstance, {
        serviceWorkerRegistration: swRegistration,
      });

      if (token) {
        setFcmToken(token);
        // Register token with our backend
        const deviceInfo = `${navigator.platform || 'Web'} - ${navigator.userAgent.slice(0, 100)}`;
        await notificationService.registerFcmToken({ token, deviceInfo });
      }
    } catch (err) {
      console.warn('⚠️ FCM registration notice:', err instanceof Error ? err.message : err);
    } finally {
      setIsRegistering(false);
    }
  }, []);


  // Request browser permission and obtain FCM token
  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      dispatch(enqueueSnackbar('Notifikasi browser tidak didukung di perangkat ini.', 'warning'));
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        await registerToken();
        dispatch(enqueueSnackbar('Notifikasi Firebase Cloud Messaging berhasil diaktifkan!', 'success'));
        return true;
      } else if (result === 'denied') {
        dispatch(enqueueSnackbar('Izin notifikasi ditolak oleh browser.', 'warning'));
        return false;
      }
      return false;
    } catch (err) {
      console.warn('Error requesting notification permission:', err);
      return false;
    }
  }, [dispatch, registerToken]);

  // Send a test push notification
  const sendTestNotification = useCallback(async () => {
    try {
      await notificationService.sendTestNotification();
      dispatch(enqueueSnackbar('Test notifikasi FCM telah dikirim ke perangkat Anda.', 'info'));
    } catch (err) {
      dispatch(enqueueSnackbar(err instanceof Error ? err.message : 'Gagal mengirim test notifikasi.', 'error'));
    }
  }, [dispatch]);

  // Initial check & auto-register if already granted
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator) {
      setIsSupported(true);
      setPermission(Notification.permission);

      if (Notification.permission === 'granted') {
        registerToken().catch(() => {});
      }
    }
  }, [registerToken]);

  // Set up foreground message listener
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    getMessagingInstance().then((messagingInstance) => {
      if (!messagingInstance) return;

      unsubscribe = onMessage(messagingInstance, (payload) => {
        const title = payload.notification?.title || payload.data?.title || 'Notifikasi Baru';
        const message = payload.notification?.body || payload.data?.body || 'Ada pembaruan pada workspace Anda.';
        const typeRaw = payload.data?.type || 'system';
        const taskId = payload.data?.taskId;

        let notifType: NotificationType = 'system';
        if (typeRaw === 'assignment') notifType = 'assignment';
        else if (typeRaw === 'status_change') notifType = 'status_change';
        else if (typeRaw === 'discussion' || typeRaw === 'mention') notifType = 'mention';

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
    requestPermission,
    sendTestNotification,
  };
}
