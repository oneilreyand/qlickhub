import { initializeApp, getApps, cert, applicationDefault, App } from 'firebase-admin/app';
import { getMessaging, MulticastMessage } from 'firebase-admin/messaging';
import { Op } from 'sequelize';
import { env } from '../config/env.js';
import { UserFcmTokenModel } from '../db/models/userFcmToken.js';
import { PushNotificationPayload } from '@qa/contracts';

let firebaseApp: App | null = null;

function initializeFirebaseAdmin(): App | null {
  if (firebaseApp) return firebaseApp;
  const apps = getApps();
  if (apps.length > 0) {
    firebaseApp = apps[0];
    return firebaseApp;
  }

  try {
    if (env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
      firebaseApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id || env.FIREBASE_PROJECT_ID,
      });
      console.log('✅ Firebase Admin SDK initialized from service account JSON.');
      return firebaseApp;
    }

    if (env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      firebaseApp = initializeApp({
        credential: cert(env.FIREBASE_SERVICE_ACCOUNT_PATH),
        projectId: env.FIREBASE_PROJECT_ID,
      });
      console.log('✅ Firebase Admin SDK initialized from service account file.');
      return firebaseApp;
    }

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      firebaseApp = initializeApp({
        credential: applicationDefault(),
        projectId: env.FIREBASE_PROJECT_ID,
      });
      console.log('✅ Firebase Admin SDK initialized from Application Default Credentials.');
      return firebaseApp;
    }

    // Default project initialization for development/staging
    firebaseApp = initializeApp({
      projectId: env.FIREBASE_PROJECT_ID,
    });
    console.log(`ℹ️ Firebase Admin SDK initialized with project ID: ${env.FIREBASE_PROJECT_ID}`);
    return firebaseApp;
  } catch (error) {
    console.warn('⚠️ Firebase Admin SDK initialization warning:', error instanceof Error ? error.message : error);
    return null;
  }
}

export class FcmService {
  constructor() {
    initializeFirebaseAdmin();
  }

  /**
   * Registers or updates an FCM token for a user.
   */
  async registerToken(userId: string, token: string, deviceInfo?: string): Promise<{ success: boolean; message: string }> {
    const trimmedToken = token.trim();
    if (!trimmedToken) {
      throw new Error('BAD_REQUEST: FCM Token cannot be empty.');
    }

    const [record, created] = await UserFcmTokenModel.findOrCreate({
      where: { userId, token: trimmedToken },
      defaults: {
        userId,
        token: trimmedToken,
        deviceInfo: deviceInfo || null,
      },
    });

    if (!created && deviceInfo && record.deviceInfo !== deviceInfo) {
      record.deviceInfo = deviceInfo;
      await record.save();
    }

    return {
      success: true,
      message: created ? 'FCM token registered successfully.' : 'FCM token already active.',
    };
  }

  /**
   * Unregisters an FCM token when a user logs out or turns off notifications.
   */
  async unregisterToken(userId: string, token: string): Promise<{ success: boolean; message: string }> {
    const trimmedToken = token.trim();
    const deletedCount = await UserFcmTokenModel.destroy({
      where: { userId, token: trimmedToken },
    });

    return {
      success: true,
      message: deletedCount > 0 ? 'FCM token unregistered.' : 'FCM token was not found.',
    };
  }

  /**
   * Sends push notification payload to a specific user across all their registered devices.
   */
  async sendToUser(userId: string, payload: PushNotificationPayload): Promise<void> {
    await this.sendToUsers([userId], payload);
  }

  /**
   * Sends push notification payload to a list of distinct users across all their registered devices.
   */
  async sendToUsers(userIds: string[], payload: PushNotificationPayload): Promise<void> {
    const distinctUserIds = Array.from(new Set(userIds.filter(Boolean)));
    if (distinctUserIds.length === 0) return;

    try {
      const tokensRecords = await UserFcmTokenModel.findAll({
        where: {
          userId: { [Op.in]: distinctUserIds },
        },
        attributes: ['id', 'userId', 'token'],
      });

      if (tokensRecords.length === 0) {
        if (env.NODE_ENV !== 'production') {
          console.log(`[FCM Notification Simulated] To users ${distinctUserIds.join(', ')} (no active device tokens):`, payload);
        }
        return;
      }

      const tokens = tokensRecords.map((t) => t.token);

      // Construct multicast message
      const message: MulticastMessage = {
        tokens,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data || {},
        webpush: {
          notification: {
            title: payload.title,
            body: payload.body,
            icon: '/favicon.svg',
            badge: '/favicon.svg',
          },
          fcmOptions: {
            link: payload.data?.taskId ? `/work?tab=tasks&taskId=${payload.data.taskId}` : '/my-tasks',
          },
        },
      };

      const app = firebaseApp || initializeFirebaseAdmin();
      if (!app) return;

      const response = await getMessaging(app).sendEachForMulticast(message);

      // Clean up invalid or unregistered tokens
      const staleTokenIds: string[] = [];
      response.responses.forEach((res, idx) => {
        if (!res.success && res.error) {
          const errorCode = res.error.code;
          if (
            errorCode === 'messaging/registration-token-not-registered' ||
            errorCode === 'messaging/invalid-registration-token' ||
            errorCode === 'messaging/invalid-argument'
          ) {
            staleTokenIds.push(tokensRecords[idx].id);
          }
        }
      });

      if (staleTokenIds.length > 0) {
        await UserFcmTokenModel.destroy({
          where: { id: { [Op.in]: staleTokenIds } },
        });
      }
    } catch (error) {
      console.warn('⚠️ Error sending FCM multicast message:', error instanceof Error ? error.message : error);
    }
  }

  /**
   * Helper: Trigger 1 — Task Assignment Notification
   */
  async sendTaskAssignmentNotification(params: {
    assigneeId: string;
    assignerName: string;
    taskTitle: string;
    taskId: string;
    workspaceId: string;
  }): Promise<void> {
    const { assigneeId, assignerName, taskTitle, taskId, workspaceId } = params;
    await this.sendToUser(assigneeId, {
      title: 'Tugas Baru Ditugaskan',
      body: `${assignerName} menugaskan Anda pada tugas: "${taskTitle}"`,
      data: {
        type: 'assignment',
        taskId,
        workspaceId,
      },
    });
  }

  /**
   * Helper: Trigger 2 — Task Status Update Notification
   */
  async sendTaskStatusUpdateNotification(params: {
    recipientUserIds: string[];
    updaterName: string;
    taskTitle: string;
    taskId: string;
    workspaceId: string;
    oldStatus: string;
    newStatus: string;
  }): Promise<void> {
    const { recipientUserIds, updaterName, taskTitle, taskId, workspaceId, oldStatus, newStatus } = params;
    const formattedStatus = newStatus.replace('_', ' ').toUpperCase();
    await this.sendToUsers(recipientUserIds, {
      title: 'Status Tugas Diperbarui',
      body: `${updaterName} mengubah status "${taskTitle}" menjadi ${formattedStatus}`,
      data: {
        type: 'status_change',
        taskId,
        workspaceId,
        oldStatus,
        newStatus,
      },
    });
  }

  /**
   * Helper: Trigger 3 — Discussion Update on Working Tasks
   */
  async sendDiscussionUpdateNotification(params: {
    recipientUserIds: string[];
    authorName: string;
    taskTitle: string;
    taskId: string;
    workspaceId: string;
    commentId: string;
    commentSnippet: string;
  }): Promise<void> {
    const { recipientUserIds, authorName, taskTitle, taskId, workspaceId, commentId, commentSnippet } = params;
    const snippet = commentSnippet.length > 80 ? `${commentSnippet.slice(0, 77)}...` : commentSnippet;
    await this.sendToUsers(recipientUserIds, {
      title: `Update Diskusi: ${taskTitle}`,
      body: `${authorName}: "${snippet}"`,
      data: {
        type: 'discussion',
        taskId,
        workspaceId,
        commentId,
      },
    });
  }
}

export const fcmService = new FcmService();
