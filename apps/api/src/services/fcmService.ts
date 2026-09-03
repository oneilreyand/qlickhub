import { initializeApp, getApps, cert, applicationDefault, App } from 'firebase-admin/app';
import { getMessaging, MulticastMessage } from 'firebase-admin/messaging';
import { Op } from 'sequelize';
import { env } from '../config/env.js';
import { UserFcmTokenModel } from '../db/models/userFcmToken.js';
import { PushNotificationPayload } from '@qlick/contracts';
// notificationService is imported lazily inside each helper to avoid a circular dependency
// at module load time (notificationService → fcmService → notificationService).
import type { NotificationService } from '../modules/notifications/notificationService.js';

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
    console.warn(
      '⚠️ Firebase Admin SDK initialization warning:',
      error instanceof Error ? error.message : error,
    );
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
  async registerToken(
    userId: string,
    token: string,
    deviceInfo?: string,
  ): Promise<{ success: boolean; message: string }> {
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
  async unregisterToken(
    userId: string,
    token: string,
  ): Promise<{ success: boolean; message: string }> {
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
          console.log(
            `[FCM Notification Simulated] To users ${distinctUserIds.join(', ')} (no active device tokens):`,
            payload,
          );
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
            link: payload.data?.taskId
              ? `/work?tab=tasks&taskId=${payload.data.taskId}`
              : '/my-tasks',
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
      console.warn(
        '⚠️ Error sending FCM multicast message:',
        error instanceof Error ? error.message : error,
      );
    }
  }

  /**
   * Helper: Trigger 1 — Task Assignment Notification
   * Delegates DB persistence to NotificationService and dispatches FCM push.
   */
  async sendTaskAssignmentNotification(params: {
    assigneeId: string;
    assignerName: string;
    assignerId: string;
    taskTitle: string;
    taskId: string;
    workspaceId: string;
  }): Promise<void> {
    const { assigneeId, assignerName, assignerId, taskTitle, taskId, workspaceId } = params;
    const title = 'Tugas Baru Ditugaskan';
    const message = `${assignerName} menugaskan Anda pada tugas: "${taskTitle}"`;

    // 1. Persist via NotificationService (single source of truth for notifications table)
    try {
      const { notificationService } =
        await import('../modules/notifications/notificationService.js');
      await notificationService.createNotification({
        userId: assigneeId,
        workspaceId,
        taskId: taskId || null,
        actorId: assignerId,
        type: 'assignment',
        title,
        message,
        sendFcm: false, // push is dispatched below
      });
    } catch (err) {
      console.warn('⚠️ Failed to save in-app assignment notification in DB:', err);
    }

    // 2. Dispatch FCM Push without delaying the Task mutation response. The persisted
    // notification above is the internal delivery record; external push remains best-effort.
    void this.sendToUser(assigneeId, {
      title,
      body: message,
      data: { type: 'assignment', taskId, workspaceId },
    });
  }

  /**
   * Helper: Trigger 2 — Task Status Update Notification
   * Delegates DB persistence to NotificationService and dispatches FCM multicast push.
   */
  async sendTaskStatusUpdateNotification(params: {
    recipientUserIds: string[];
    updaterName: string;
    updaterId: string;
    taskTitle: string;
    taskId: string;
    workspaceId: string;
    oldStatus: string;
    newStatus: string;
  }): Promise<void> {
    const {
      recipientUserIds,
      updaterName,
      updaterId,
      taskTitle,
      taskId,
      workspaceId,
      oldStatus,
      newStatus,
    } = params;
    // FIX: use regex so all underscores are replaced (e.g. "in_review_qa" → "IN REVIEW QA")
    const formattedStatus = newStatus.replace(/_/g, ' ').toUpperCase();
    const title = 'Status Tugas Diperbarui';
    const message = `${updaterName} mengubah status "${taskTitle}" menjadi ${formattedStatus}`;

    // 1. Persist via NotificationService
    try {
      const { notificationService } =
        await import('../modules/notifications/notificationService.js');
      await notificationService.createBulkNotifications(
        recipientUserIds.map((userId) => ({
          userId,
          workspaceId,
          taskId: taskId || null,
          actorId: updaterId,
          type: 'status_change' as const,
          title,
          message,
        })),
        false, // sendFcm handled below
      );
    } catch (err) {
      console.warn('⚠️ Failed to save in-app status update notification in DB:', err);
    }

    // 2. Dispatch FCM multicast push
    await this.sendToUsers(recipientUserIds, {
      title,
      body: message,
      data: { type: 'status_change', taskId, workspaceId, oldStatus, newStatus },
    });
  }

  /**
   * Helper: Trigger 3 — Discussion Update on Working Tasks (with @channel support)
   * Delegates DB persistence to NotificationService and dispatches FCM multicast push.
   */
  async sendDiscussionUpdateNotification(params: {
    recipientUserIds: string[];
    authorName: string;
    authorId: string;
    taskTitle: string;
    taskId: string;
    workspaceId: string;
    commentId: string;
    commentSnippet: string;
    isChannel?: boolean;
  }): Promise<void> {
    const {
      recipientUserIds,
      authorName,
      authorId,
      taskTitle,
      taskId,
      workspaceId,
      commentId,
      commentSnippet,
      isChannel,
    } = params;
    const snippet =
      commentSnippet.length > 80 ? `${commentSnippet.slice(0, 77)}...` : commentSnippet;

    const notifTitle = isChannel ? `📢 @channel: ${taskTitle}` : `Update Diskusi: ${taskTitle}`;
    const notifBody = isChannel
      ? `${authorName} me-mention @channel: "${snippet}"`
      : `${authorName}: "${snippet}"`;
    const notifType = isChannel ? 'mention' : 'discussion';

    // 1. Persist via NotificationService
    try {
      const { notificationService } =
        await import('../modules/notifications/notificationService.js');
      await notificationService.createBulkNotifications(
        recipientUserIds.map((userId) => ({
          userId,
          workspaceId,
          taskId: taskId || null,
          actorId: authorId,
          type: notifType as 'mention' | 'discussion',
          title: notifTitle,
          message: notifBody,
        })),
        false, // sendFcm handled below
      );
    } catch (err) {
      console.warn('⚠️ Failed to save in-app discussion notification in DB:', err);
    }

    // 2. Dispatch FCM multicast push
    await this.sendToUsers(recipientUserIds, {
      title: notifTitle,
      body: notifBody,
      data: { type: isChannel ? 'mention' : 'discussion', taskId, workspaceId, commentId },
    });
  }

  /**
   * Helper: Trigger 4 — Approaching Deadline Notification
   * Delegates DB persistence to NotificationService and dispatches FCM multicast push.
   */
  async sendDeadlineApproachingNotification(params: {
    recipientUserIds: string[];
    taskTitle: string;
    taskId: string;
    workspaceId: string;
    dueDate: string;
  }): Promise<void> {
    const { recipientUserIds, taskTitle, taskId, workspaceId, dueDate } = params;
    const notifTitle = '⏰ Batas Waktu Mendekati';
    const notifBody = `Tugas "${taskTitle}" jatuh tempo pada ${dueDate}. Segera selesaikan sebelum terlambat!`;

    // 1. Persist via NotificationService (no actorId for system-generated deadline alerts)
    try {
      const { notificationService } =
        await import('../modules/notifications/notificationService.js');
      await notificationService.createBulkNotifications(
        recipientUserIds.map((userId) => ({
          userId,
          workspaceId,
          taskId: taskId || null,
          actorId: null,
          type: 'deadline' as const,
          title: notifTitle,
          message: notifBody,
        })),
        false, // sendFcm handled below
      );
    } catch (err) {
      console.warn('⚠️ Failed to save in-app deadline notification in DB:', err);
    }

    // 2. Dispatch FCM multicast push
    await this.sendToUsers(recipientUserIds, {
      title: notifTitle,
      body: notifBody,
      data: { type: 'deadline', taskId, workspaceId },
    });
  }

  /**
   * Helper: Trigger 5 — Bug Lifecycle Notification
   */
  async sendBugNotification(params: {
    recipientUserIds: string[];
    actorName: string;
    actorId: string;
    bugTitle: string;
    bugId: string;
    taskId?: string | null;
    workspaceId: string;
    action: 'created' | 'status_change' | 'critical';
    details?: string;
  }): Promise<void> {
    const {
      recipientUserIds,
      actorName,
      actorId,
      bugTitle,
      bugId,
      taskId,
      workspaceId,
      action,
      details,
    } = params;
    let notifTitle = 'Laporan Bug Baru';
    let notifBody = `${actorName} melaporkan bug baru: "${bugTitle}"`;
    let notifType: 'bug_created' | 'bug_status_change' | 'bug_critical' = 'bug_created';

    if (action === 'status_change') {
      notifTitle = 'Status Bug Diperbarui';
      notifBody = `${actorName} memperbarui status bug "${bugTitle}"${details ? ` menjadi ${details}` : ''}`;
      notifType = 'bug_status_change';
    } else if (action === 'critical') {
      notifTitle = '🚨 Bug Kritis Terdeteksi';
      notifBody = `Bug "${bugTitle}" ditandai sebagai SEVERITY CRITICAL oleh ${actorName}`;
      notifType = 'bug_critical';
    }

    try {
      const { notificationService } =
        await import('../modules/notifications/notificationService.js');
      await notificationService.createBulkNotifications(
        recipientUserIds.map((userId) => ({
          userId,
          workspaceId,
          taskId: taskId || null,
          actorId,
          type: notifType,
          title: notifTitle,
          message: notifBody,
        })),
        false,
      );
    } catch (err) {
      console.warn('⚠️ Failed to save in-app bug notification in DB:', err);
    }

    await this.sendToUsers(recipientUserIds, {
      title: notifTitle,
      body: notifBody,
      data: { type: notifType, bugId, taskId: taskId || '', workspaceId },
    });
  }

  /**
   * Helper: Trigger 6 — QA Sign-Off Notification
   */
  async sendQaSignOffNotification(params: {
    recipientUserIds: string[];
    qaName: string;
    qaId: string;
    taskTitle: string;
    taskId: string;
    workspaceId: string;
  }): Promise<void> {
    const { recipientUserIds, qaName, qaId, taskTitle, taskId, workspaceId } = params;
    const title = '✅ QA Sign-Off Selesai';
    const message = `${qaName} telah menyetujui QA sign-off untuk tugas: "${taskTitle}"`;

    try {
      const { notificationService } =
        await import('../modules/notifications/notificationService.js');
      await notificationService.createBulkNotifications(
        recipientUserIds.map((userId) => ({
          userId,
          workspaceId,
          taskId: taskId || null,
          actorId: qaId,
          type: 'qa_signoff' as const,
          title,
          message,
        })),
        false,
      );
    } catch (err) {
      console.warn('⚠️ Failed to save in-app QA sign-off notification in DB:', err);
    }

    await this.sendToUsers(recipientUserIds, {
      title,
      body: message,
      data: { type: 'qa_signoff', taskId, workspaceId },
    });
  }

  /**
   * Helper: Trigger 7 — Release Decision Notification
   */
  async sendReleaseDecisionNotification(params: {
    recipientUserIds: string[];
    poName: string;
    poId: string;
    taskTitle: string;
    taskId: string;
    workspaceId: string;
    decision: string;
    reason?: string;
  }): Promise<void> {
    const { recipientUserIds, poName, poId, taskTitle, taskId, workspaceId, decision } = params;
    const formattedDecision = decision.replace(/_/g, ' ').toUpperCase();
    const title = `Keputusan Rilis: ${formattedDecision}`;
    const message = `${poName} menetapkan keputusan rilis "${formattedDecision}" untuk tugas: "${taskTitle}"`;

    try {
      const { notificationService } =
        await import('../modules/notifications/notificationService.js');
      await notificationService.createBulkNotifications(
        recipientUserIds.map((userId) => ({
          userId,
          workspaceId,
          taskId: taskId || null,
          actorId: poId,
          type: 'release_decision' as const,
          title,
          message,
        })),
        false,
      );
    } catch (err) {
      console.warn('⚠️ Failed to save in-app release decision notification in DB:', err);
    }

    await this.sendToUsers(recipientUserIds, {
      title,
      body: message,
      data: { type: 'release_decision', taskId, workspaceId, decision },
    });
  }

  /**
   * Helper: Trigger 8 — Test Failure / Blocker Notification
   */
  async sendTestFailureNotification(params: {
    recipientUserIds: string[];
    testerName: string;
    testerId: string;
    testCaseTitle: string;
    taskTitle: string;
    taskId: string;
    workspaceId: string;
    status: 'failed' | 'blocked';
  }): Promise<void> {
    const {
      recipientUserIds,
      testerName,
      testerId,
      testCaseTitle,
      taskTitle,
      taskId,
      workspaceId,
      status,
    } = params;
    const title = `⚠️ Uji QA ${status.toUpperCase()}`;
    const message = `${testerName} mencatat hasil ${status.toUpperCase()} pada "${testCaseTitle}" untuk tugas: "${taskTitle}"`;

    try {
      const { notificationService } =
        await import('../modules/notifications/notificationService.js');
      await notificationService.createBulkNotifications(
        recipientUserIds.map((userId) => ({
          userId,
          workspaceId,
          taskId: taskId || null,
          actorId: testerId,
          type: 'test_failed' as const,
          title,
          message,
        })),
        false,
      );
    } catch (err) {
      console.warn('⚠️ Failed to save in-app test failure notification in DB:', err);
    }

    await this.sendToUsers(recipientUserIds, {
      title,
      body: message,
      data: { type: 'test_failed', taskId, workspaceId, status },
    });
  }

  /**
   * Helper: Trigger 9 — Workspace Membership Notification
   */
  async sendWorkspaceMembershipNotification(params: {
    userId: string;
    actorName: string;
    actorId: string;
    workspaceName: string;
    workspaceId: string;
    action: 'added' | 'role_updated';
    newRole?: string;
  }): Promise<void> {
    const { userId, actorName, actorId, workspaceName, workspaceId, action, newRole } = params;
    const title = action === 'added' ? 'Bergabung ke Workspace' : 'Peran Workspace Diperbarui';
    const message =
      action === 'added'
        ? `${actorName} menambahkan Anda ke workspace "${workspaceName}"`
        : `${actorName} memperbarui peran Anda menjadi ${newRole ? newRole.toUpperCase() : ''} di workspace "${workspaceName}"`;

    try {
      const { notificationService } =
        await import('../modules/notifications/notificationService.js');
      await notificationService.createNotification({
        userId,
        workspaceId,
        actorId,
        type: 'workspace_membership',
        title,
        message,
        sendFcm: false,
      });
    } catch (err) {
      console.warn('⚠️ Failed to save in-app workspace membership notification in DB:', err);
    }

    await this.sendToUser(userId, {
      title,
      body: message,
      data: { type: 'workspace_membership', workspaceId },
    });
  }
}

export const fcmService = new FcmService();
// Export type to allow type-only imports elsewhere
export type { NotificationService };
