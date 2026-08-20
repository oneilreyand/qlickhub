import assert from 'node:assert';
import { describe, test, before, after } from 'node:test';
import { createApp } from '../../../app.js';
import {
  UserModel,
  WorkspaceModel,
  WorkspaceMemberModel,
  UserFcmTokenModel,
  NotificationModel,
} from '../../../db/models/index.js';
import { CreateTaskSchema } from '@qlick/contracts';
import { signToken, accessTokenCookieName } from '../../auth/jwt.js';
import { sessionManager } from '../../auth/sessionManager.js';
import { taskService } from '../../tasks/taskService.js';
import { taskDiscussionService } from '../../tasks/taskDiscussionService.js';
import { Server } from 'node:http';

describe('FCM Push & Persistent In-App Notification API & Triggers', () => {
  let appServer: Server;
  let baseUrl: string;

  let ownerUser: UserModel;
  let devUser: UserModel;
  let qaUser: UserModel;
  let workspace: WorkspaceModel;
  let ownerCookie: string;
  let devCookie: string;

  before(async () => {
    const app = createApp();
    await new Promise<void>((resolve) => {
      appServer = app.listen(0, () => {
        const address = appServer.address();
        if (typeof address === 'object' && address) {
          baseUrl = `http://localhost:${address.port}/v1`;
        }
        resolve();
      });
    });

    const timestamp = Date.now();
    ownerUser = await UserModel.create({
      email: `fcm_owner_${timestamp}@test.com`,
      name: 'FCM Owner',
      role: 'admin',
      passwordHash: 'dummy',
    });

    devUser = await UserModel.create({
      email: `fcm_dev_${timestamp}@test.com`,
      name: 'FCM Developer',
      role: 'dev',
      passwordHash: 'dummy',
    });

    qaUser = await UserModel.create({
      email: `fcm_qa_${timestamp}@test.com`,
      name: 'FCM QA',
      role: 'qa',
      passwordHash: 'dummy',
    });

    workspace = await WorkspaceModel.create({
      name: 'FCM Test Workspace',
      slug: `fcm-test-${timestamp}`,
      ownerId: ownerUser.id,
    });

    await WorkspaceMemberModel.create({
      workspaceId: workspace.id,
      userId: ownerUser.id,
      role: 'owner',
    });

    await WorkspaceMemberModel.create({
      workspaceId: workspace.id,
      userId: devUser.id,
      role: 'dev',
    });

    await WorkspaceMemberModel.create({
      workspaceId: workspace.id,
      userId: qaUser.id,
      role: 'qa',
    });

    const ownerSessionId = await sessionManager.createSession(ownerUser.id, 'TestAgent', '127.0.0.1');
    const ownerToken = signToken({
      userId: ownerUser.id,
      email: ownerUser.email,
      role: ownerUser.role,
      sessionId: ownerSessionId,
    });
    ownerCookie = `${accessTokenCookieName}=${ownerToken}`;

    const devSessionId = await sessionManager.createSession(devUser.id, 'TestAgent', '127.0.0.1');
    const devToken = signToken({
      userId: devUser.id,
      email: devUser.email,
      role: devUser.role,
      sessionId: devSessionId,
    });
    devCookie = `${accessTokenCookieName}=${devToken}`;
  });

  after(async () => {
    if (appServer) {
      await new Promise<void>((resolve) => appServer.close(() => resolve()));
    }
  });

  describe('1. Token Registration & Lifecycle API', () => {
    test('POST /v1/notifications/fcm-token registers device token', async () => {
      const response = await fetch(`${baseUrl}/notifications/fcm-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: ownerCookie,
        },
        body: JSON.stringify({
          token: 'fcm-device-token-abc-123',
          deviceInfo: 'Chrome MacOS Test Device',
        }),
      });

      assert.strictEqual(response.status, 200);
      const json = (await response.json()) as any;
      assert.strictEqual(json.data.success, true);

      const saved = await UserFcmTokenModel.findOne({
        where: { userId: ownerUser.id, token: 'fcm-device-token-abc-123' },
      });
      assert.ok(saved);
      assert.strictEqual(saved.deviceInfo, 'Chrome MacOS Test Device');
    });

    test('POST /v1/notifications/fcm-token rejects invalid empty token', async () => {
      const response = await fetch(`${baseUrl}/notifications/fcm-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: ownerCookie,
        },
        body: JSON.stringify({
          token: '',
        }),
      });

      assert.strictEqual(response.status, 400);
    });

    test('DELETE /v1/notifications/fcm-token unregisters device token', async () => {
      const response = await fetch(`${baseUrl}/notifications/fcm-token`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Cookie: ownerCookie,
        },
        body: JSON.stringify({
          token: 'fcm-device-token-abc-123',
        }),
      });

      assert.strictEqual(response.status, 200);
      const json = (await response.json()) as any;
      assert.strictEqual(json.data.success, true);

      const saved = await UserFcmTokenModel.findOne({
        where: { userId: ownerUser.id, token: 'fcm-device-token-abc-123' },
      });
      assert.strictEqual(saved, null);
    });

    test('POST /v1/notifications/test sends test notification and creates persistent in-app record', async () => {
      const response = await fetch(`${baseUrl}/notifications/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: ownerCookie,
        },
      });

      assert.strictEqual(response.status, 200);
      const json = (await response.json()) as any;
      assert.strictEqual(json.data.success, true);

      const savedNotif = await NotificationModel.findOne({
        where: { userId: ownerUser.id, type: 'system' },
      });
      assert.ok(savedNotif);
      assert.strictEqual(savedNotif.title, '🔔 Test Notifikasi Qlick Hub');
      assert.strictEqual(savedNotif.isRead, false);
    });
  });

  describe('2. In-App Notification Query & Mutation REST API', () => {
    let testNotifId: string;

    before(async () => {
      // Create test notifications for devUser
      const notif1 = await NotificationModel.create({
        userId: devUser.id,
        workspaceId: workspace.id,
        type: 'assignment',
        title: 'Assigned to Auth Subtask',
        message: 'You have been assigned to implement auth endpoints.',
        isRead: false,
      });
      testNotifId = notif1.id;

      await NotificationModel.create({
        userId: devUser.id,
        workspaceId: workspace.id,
        type: 'mention',
        title: 'Mention in Discussion',
        message: 'QA Lead mentioned you in discussion.',
        isRead: true,
        readAt: new Date(),
      });
    });

    test('GET /v1/notifications lists user notifications with unreadCount and pagination', async () => {
      const response = await fetch(`${baseUrl}/notifications?workspaceId=${workspace.id}`, {
        headers: { Cookie: devCookie },
      });

      assert.strictEqual(response.status, 200);
      const json = (await response.json()) as any;
      assert.ok(Array.isArray(json.data.notifications));
      assert.ok(json.data.notifications.length >= 2);
      assert.strictEqual(json.data.unreadCount, 1);
      assert.strictEqual(json.data.totalCount >= 2, true);
    });

    test('GET /v1/notifications?unreadOnly=true filters for unread notifications only', async () => {
      const response = await fetch(`${baseUrl}/notifications?workspaceId=${workspace.id}&unreadOnly=true`, {
        headers: { Cookie: devCookie },
      });

      assert.strictEqual(response.status, 200);
      const json = (await response.json()) as any;
      assert.strictEqual(json.data.notifications.length, 1);
      assert.strictEqual(json.data.notifications[0].isRead, false);
    });

    test('PATCH /v1/notifications/:id/read marks notification as read', async () => {
      const response = await fetch(`${baseUrl}/notifications/${testNotifId}/read`, {
        method: 'PATCH',
        headers: { Cookie: devCookie },
      });

      assert.strictEqual(response.status, 200);
      const json = (await response.json()) as any;
      assert.strictEqual(json.data.id, testNotifId);
      assert.strictEqual(json.data.isRead, true);
      assert.ok(json.data.readAt);

      const dbCheck = await NotificationModel.findByPk(testNotifId);
      assert.strictEqual(dbCheck?.isRead, true);
    });

    test('POST /v1/notifications/read-all marks all unread notifications as read', async () => {
      // Create another unread
      await NotificationModel.create({
        userId: devUser.id,
        workspaceId: workspace.id,
        type: 'status_change',
        title: 'Status Updated',
        message: 'Status was updated',
        isRead: false,
      });

      const response = await fetch(`${baseUrl}/notifications/read-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: devCookie,
        },
        body: JSON.stringify({ workspaceId: workspace.id }),
      });

      assert.strictEqual(response.status, 200);
      const json = (await response.json()) as any;
      assert.strictEqual(json.data.success, true);

      const unreadRemaining = await NotificationModel.count({
        where: { userId: devUser.id, isRead: false },
      });
      assert.strictEqual(unreadRemaining, 0);
    });

    test('DELETE /v1/notifications/:id deletes a single notification', async () => {
      const notifToDelete = await NotificationModel.create({
        userId: devUser.id,
        workspaceId: workspace.id,
        type: 'system',
        title: 'Temporary Notice',
        message: 'Will be deleted',
        isRead: false,
      });

      const response = await fetch(`${baseUrl}/notifications/${notifToDelete.id}`, {
        method: 'DELETE',
        headers: { Cookie: devCookie },
      });

      assert.strictEqual(response.status, 200);
      const json = (await response.json()) as any;
      assert.strictEqual(json.data.success, true);

      const dbCheck = await NotificationModel.findByPk(notifToDelete.id);
      assert.strictEqual(dbCheck, null);
    });

    test('DELETE /v1/notifications clears all notifications for user in workspace', async () => {
      const response = await fetch(`${baseUrl}/notifications?workspaceId=${workspace.id}`, {
        method: 'DELETE',
        headers: { Cookie: devCookie },
      });

      assert.strictEqual(response.status, 200);
      const json = (await response.json()) as any;
      assert.strictEqual(json.data.success, true);

      const remaining = await NotificationModel.count({
        where: { userId: devUser.id, workspaceId: workspace.id },
      });
      assert.strictEqual(remaining, 0);
    });
  });

  describe('3. Trigger 1: User Assigned to Task creates DB record & FCM push', () => {
    test('persists in-app notification when task is created with assignee', async () => {
      const parentTask = await taskService.createTask(
        ownerUser.id,
        CreateTaskSchema.parse({
          workspaceId: workspace.id,
          title: 'Parent Container',
        })
      );

      await taskService.createTask(
        ownerUser.id,
        CreateTaskSchema.parse({
          workspaceId: workspace.id,
          parentTaskId: parentTask.id,
          deliveryArea: 'backend',
          title: 'Implement Auth Service Subtask',
          assigneeId: devUser.id,
        })
      );

      // Give async promise callback a moment to settle
      await new Promise((r) => setTimeout(r, 60));

      const notif = await NotificationModel.findOne({
        where: {
          userId: devUser.id,
          type: 'assignment',
          title: 'Tugas Baru Ditugaskan',
        },
        order: [['createdAt', 'DESC']],
      });

      assert.ok(notif);
      assert.ok(notif.message.includes('Implement Auth Service Subtask'));
      assert.strictEqual(notif.isRead, false);
    });

    test('persists in-app notification when task assignee is updated', async () => {
      const parentTask = await taskService.createTask(
        ownerUser.id,
        CreateTaskSchema.parse({
          workspaceId: workspace.id,
          title: 'Parent Container for Reassignment',
        })
      );

      const task = await taskService.createTask(
        ownerUser.id,
        CreateTaskSchema.parse({
          workspaceId: workspace.id,
          parentTaskId: parentTask.id,
          deliveryArea: 'backend',
          title: 'Perform QA Review Subtask',
          assigneeId: devUser.id,
        })
      );

      await taskService.updateTask(ownerUser.id, workspace.id, task.id, {
        assigneeId: qaUser.id,
        deliveryArea: 'qa',
      });

      await new Promise((r) => setTimeout(r, 60));

      const notif = await NotificationModel.findOne({
        where: {
          userId: qaUser.id,
          type: 'assignment',
          title: 'Tugas Baru Ditugaskan',
        },
        order: [['createdAt', 'DESC']],
      });

      assert.ok(notif);
      assert.ok(notif.message.includes('Perform QA Review Subtask'));
    });
  });

  describe('4. Trigger 2: User Updates Task Status persists DB record', () => {
    test('persists status update notification to assignee when owner updates status', async () => {
      const parentTask = await taskService.createTask(
        ownerUser.id,
        CreateTaskSchema.parse({
          workspaceId: workspace.id,
          title: 'Parent Container for Status Test',
        })
      );

      const task = await taskService.createTask(
        ownerUser.id,
        CreateTaskSchema.parse({
          workspaceId: workspace.id,
          parentTaskId: parentTask.id,
          deliveryArea: 'backend',
          title: 'Backend API Gateway Subtask',
          assigneeId: devUser.id,
        })
      );

      // Owner updates status to in_progress
      await taskService.updateTask(ownerUser.id, workspace.id, task.id, {
        status: 'in_progress',
      });

      await new Promise((r) => setTimeout(r, 60));

      const notif = await NotificationModel.findOne({
        where: {
          userId: devUser.id,
          type: 'status_change',
          title: 'Status Tugas Diperbarui',
        },
        order: [['createdAt', 'DESC']],
      });

      assert.ok(notif);
      assert.ok(notif.message.includes('IN PROGRESS'));
    });

    test('persists status update notification to reporter when assigned dev updates subtask', async () => {
      const parentTask = await taskService.createTask(
        ownerUser.id,
        CreateTaskSchema.parse({
          workspaceId: workspace.id,
          title: 'Parent Feature for Dev Status Test',
        })
      );

      const subtask = await taskService.createTask(
        ownerUser.id,
        CreateTaskSchema.parse({
          workspaceId: workspace.id,
          parentTaskId: parentTask.id,
          deliveryArea: 'backend',
          title: 'Backend Subtask Status Test',
          assigneeId: devUser.id,
        })
      );

      // Owner updates subtask status to in_review
      await taskService.updateTask(ownerUser.id, workspace.id, subtask.id, {
        status: 'in_review',
      });

      await new Promise((r) => setTimeout(r, 60));

      const notif = await NotificationModel.findOne({
        where: {
          userId: devUser.id,
          type: 'status_change',
          title: 'Status Tugas Diperbarui',
        },
        order: [['createdAt', 'DESC']],
      });

      assert.ok(notif);
      assert.ok(notif.message.includes('IN REVIEW'));
    });
  });

  describe('5. Trigger 3: Discussion Update on Working Task persists DB records', () => {
    test('persists discussion notification to assigned user and mentions', async () => {
      const task = await taskService.createTask(
        ownerUser.id,
        CreateTaskSchema.parse({
          workspaceId: workspace.id,
          title: 'Payment Integration Flow Discussion',
          assigneeId: devUser.id,
        })
      );

      // QA user posts comment on task mentioning dev and owner
      await taskDiscussionService.createTaskComment(qaUser.id, workspace.id, task.id, {
        body: 'Found an edge case with multi-currency tokens @dev',
        mentionedUserIds: [devUser.id],
      });

      await new Promise((r) => setTimeout(r, 250));

      const devNotif = await NotificationModel.findOne({
        where: {
          userId: devUser.id,
          type: 'discussion',
          taskId: task.id,
        },
        order: [['createdAt', 'DESC']],
      });

      assert.ok(devNotif);
      assert.ok(devNotif.message.includes('Found an edge case with multi-currency tokens'));

      const ownerNotif = await NotificationModel.findOne({
        where: {
          userId: ownerUser.id,
          type: 'discussion',
          taskId: task.id,
        },
        order: [['createdAt', 'DESC']],
      });

      assert.ok(ownerNotif);
    });

    test('persists @channel broadcast notification to all task and subtask stakeholders', async () => {
      const parentTask = await taskService.createTask(
        ownerUser.id,
        CreateTaskSchema.parse({
          workspaceId: workspace.id,
          title: 'Core Architecture Parent Feature',
        })
      );

      await taskService.createTask(
        ownerUser.id,
        CreateTaskSchema.parse({
          workspaceId: workspace.id,
          parentTaskId: parentTask.id,
          deliveryArea: 'backend',
          title: 'BE Microservice Contract',
          assigneeId: devUser.id,
        })
      );

      await taskService.createTask(
        ownerUser.id,
        CreateTaskSchema.parse({
          workspaceId: workspace.id,
          parentTaskId: parentTask.id,
          deliveryArea: 'qa',
          title: 'QA Performance Testing',
          assigneeId: qaUser.id,
        })
      );

      // Owner broadcasts to @channel on parent task
      await taskDiscussionService.createTaskComment(ownerUser.id, workspace.id, parentTask.id, {
        body: '@channel Urgent release sync for all FE, BE, and QA members today at 4 PM.',
        mentionedUserIds: [],
      });

      await new Promise((r) => setTimeout(r, 250));

      const devNotif = await NotificationModel.findOne({
        where: {
          userId: devUser.id,
          taskId: parentTask.id,
          type: 'mention',
        },
        order: [['createdAt', 'DESC']],
      });

      assert.ok(devNotif);
      assert.ok(devNotif.title.includes('@channel'));
      assert.ok(devNotif.message.includes('Urgent release sync'));

      const qaNotif = await NotificationModel.findOne({
        where: {
          userId: qaUser.id,
          taskId: parentTask.id,
          type: 'mention',
        },
        order: [['createdAt', 'DESC']],
      });

      assert.ok(qaNotif);
      assert.ok(qaNotif.title.includes('@channel'));
    });
  });

  describe('6. Approaching Deadline Notifications & Anti-Spam Check', () => {
    test('detects tasks approaching due date within 24h and creates deadline alerts with anti-spam', async () => {
      const todayStr = new Date().toISOString().slice(0, 10);

      const parentTask = await taskService.createTask(
        ownerUser.id,
        CreateTaskSchema.parse({
          workspaceId: workspace.id,
          title: 'Parent Container for Deadline Feature',
        })
      );

      const dueSubtask = await taskService.createTask(
        ownerUser.id,
        CreateTaskSchema.parse({
          workspaceId: workspace.id,
          parentTaskId: parentTask.id,
          deliveryArea: 'backend',
          title: 'Payment Gateway Integration Due Soon',
          dueDate: todayStr,
          assigneeId: devUser.id,
        })
      );

      // Trigger deadline scan via API
      const res1 = await fetch(`${baseUrl}/notifications/check-deadlines?workspaceId=${workspace.id}`, {
        method: 'POST',
        headers: { Cookie: ownerCookie },
      });

      assert.strictEqual(res1.status, 200);
      const json1 = (await res1.json()) as any;
      assert.strictEqual(json1.data.success, true);
      assert.ok(json1.data.dispatchedCount >= 1);

      // Verify DB record
      const deadlineNotif = await NotificationModel.findOne({
        where: {
          userId: devUser.id,
          taskId: dueSubtask.id,
          type: 'deadline',
        },
      });

      assert.ok(deadlineNotif);
      assert.strictEqual(deadlineNotif.title, '⏰ Batas Waktu Mendekati');
      assert.ok(deadlineNotif.message.includes('Payment Gateway Integration Due Soon'));

      // Re-trigger scan immediately: anti-spam should suppress duplicate notifications
      const res2 = await fetch(`${baseUrl}/notifications/check-deadlines?workspaceId=${workspace.id}`, {
        method: 'POST',
        headers: { Cookie: ownerCookie },
      });

      assert.strictEqual(res2.status, 200);
      const json2 = (await res2.json()) as any;
      assert.strictEqual(json2.data.dispatchedCount, 0);
    });
  });
});

