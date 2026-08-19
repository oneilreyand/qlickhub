import assert from 'node:assert';
import { describe, test, before, after } from 'node:test';
import { createApp } from '../../../app.js';
import {
  UserModel,
  WorkspaceModel,
  WorkspaceMemberModel,
  UserFcmTokenModel,
} from '../../../db/models/index.js';
import { CreateTaskSchema } from '@qa/contracts';
import { signToken, accessTokenCookieName } from '../../auth/jwt.js';
import { sessionManager } from '../../auth/sessionManager.js';
import { fcmService } from '../../../services/fcmService.js';
import { taskService } from '../../tasks/taskService.js';
import { taskDiscussionService } from '../../tasks/taskDiscussionService.js';
import { Server } from 'node:http';

describe('FCM Push Notification API & Business Rule Triggers', () => {
  let appServer: Server;
  let baseUrl: string;

  let ownerUser: UserModel;
  let devUser: UserModel;
  let qaUser: UserModel;
  let workspace: WorkspaceModel;
  let ownerCookie: string;

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
      role: 'qa_member',
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

    test('POST /v1/notifications/test sends test notification', async () => {
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
    });
  });

  describe('2. FCM Trigger 1: User Assigned to Task', () => {
    test('dispatches assignment notification when task is created with assignee', async () => {
      let notifiedAssigneeId = '';
      let notifiedTaskTitle = '';

      const originalSend = fcmService.sendTaskAssignmentNotification;
      fcmService.sendTaskAssignmentNotification = async (params) => {
        notifiedAssigneeId = params.assigneeId;
        notifiedTaskTitle = params.taskTitle;
      };

      try {
        await taskService.createTask(
          ownerUser.id,
          CreateTaskSchema.parse({
            workspaceId: workspace.id,
            title: 'Implement Auth Service',
            assigneeId: devUser.id,
          })
        );

        // Give async promise callback a moment to settle
        await new Promise((r) => setTimeout(r, 50));

        assert.strictEqual(notifiedAssigneeId, devUser.id);
        assert.strictEqual(notifiedTaskTitle, 'Implement Auth Service');
      } finally {
        fcmService.sendTaskAssignmentNotification = originalSend;
      }
    });

    test('dispatches assignment notification when task assignee is updated', async () => {
      const task = await taskService.createTask(
        ownerUser.id,
        CreateTaskSchema.parse({
          workspaceId: workspace.id,
          title: 'Perform QA Review',
          assigneeId: devUser.id,
        })
      );

      let notifiedAssigneeId = '';
      const originalSend = fcmService.sendTaskAssignmentNotification;
      fcmService.sendTaskAssignmentNotification = async (params) => {
        notifiedAssigneeId = params.assigneeId;
      };

      try {
        await taskService.updateTask(ownerUser.id, workspace.id, task.id, {
          assigneeId: qaUser.id,
        });

        await new Promise((r) => setTimeout(r, 50));
        assert.strictEqual(notifiedAssigneeId, qaUser.id);
      } finally {
        fcmService.sendTaskAssignmentNotification = originalSend;
      }
    });
  });

  describe('3. FCM Trigger 2: User Updates Task Status', () => {
    test('dispatches status update notification to assignee when owner updates parent task', async () => {
      const task = await taskService.createTask(
        ownerUser.id,
        CreateTaskSchema.parse({
          workspaceId: workspace.id,
          title: 'Backend API Gateway',
          assigneeId: devUser.id,
        })
      );

      let notifiedRecipients: string[] = [];
      let notifiedNewStatus = '';

      const originalSend = fcmService.sendTaskStatusUpdateNotification;
      fcmService.sendTaskStatusUpdateNotification = async (params) => {
        notifiedRecipients = params.recipientUserIds;
        notifiedNewStatus = params.newStatus;
      };

      try {
        // Owner updates status to in_progress
        await taskService.updateTask(ownerUser.id, workspace.id, task.id, {
          status: 'in_progress',
        });

        await new Promise((r) => setTimeout(r, 50));

        // Assignee (devUser) should be notified since Owner updated it
        assert.ok(notifiedRecipients.includes(devUser.id));
        assert.strictEqual(notifiedNewStatus, 'in_progress');
      } finally {
        fcmService.sendTaskStatusUpdateNotification = originalSend;
      }
    });

    test('dispatches status update notification to reporter when assigned dev updates subtask', async () => {
      const parentTask = await taskService.createTask(
        ownerUser.id,
        CreateTaskSchema.parse({
          workspaceId: workspace.id,
          title: 'Parent Feature for Subtask',
        })
      );

      const subtask = await taskService.createTask(
        ownerUser.id,
        CreateTaskSchema.parse({
          workspaceId: workspace.id,
          parentTaskId: parentTask.id,
          deliveryArea: 'backend',
          title: 'Backend Subtask Implementation',
          assigneeId: devUser.id,
        })
      );

      let notifiedRecipients: string[] = [];
      const originalSend = fcmService.sendTaskStatusUpdateNotification;
      fcmService.sendTaskStatusUpdateNotification = async (params) => {
        notifiedRecipients = params.recipientUserIds;
      };

      try {
        // Assigned Dev updates subtask status to in_review
        await taskService.updateTask(devUser.id, workspace.id, subtask.id, {
          status: 'in_review',
        });

        await new Promise((r) => setTimeout(r, 50));

        // Reporter (ownerUser) should be notified
        assert.ok(notifiedRecipients.includes(ownerUser.id));
      } finally {
        fcmService.sendTaskStatusUpdateNotification = originalSend;
      }
    });
  });

  describe('4. FCM Trigger 3: Discussion Update on Working Task', () => {
    test('dispatches discussion notification to assigned user and mentions', async () => {
      const task = await taskService.createTask(
        ownerUser.id,
        CreateTaskSchema.parse({
          workspaceId: workspace.id,
          title: 'Payment Integration Flow',
          assigneeId: devUser.id,
        })
      );

      let notifiedRecipients: string[] = [];
      let notifiedSnippet = '';

      const originalSend = fcmService.sendDiscussionUpdateNotification;
      fcmService.sendDiscussionUpdateNotification = async (params) => {
        notifiedRecipients = params.recipientUserIds;
        notifiedSnippet = params.commentSnippet;
      };

      try {
        // QA user posts comment on task mentioning dev and owner
        await taskDiscussionService.createTaskComment(qaUser.id, workspace.id, task.id, {
          body: 'Found an edge case with multi-currency tokens @dev',
          mentionedUserIds: [devUser.id],
        });

        await new Promise((r) => setTimeout(r, 50));

        // Dev (assignee + mentioned) and Owner (reporter) should be in recipients
        assert.ok(notifiedRecipients.includes(devUser.id));
        assert.ok(notifiedRecipients.includes(ownerUser.id));
        assert.ok(!notifiedRecipients.includes(qaUser.id)); // author excluded
        assert.strictEqual(notifiedSnippet, 'Found an edge case with multi-currency tokens @dev');
      } finally {
        fcmService.sendDiscussionUpdateNotification = originalSend;
      }
    });
  });
});
