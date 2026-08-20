import assert from 'node:assert';
import { test, describe, before, after } from 'node:test';
import { realtimeEventBus } from '../../../services/realtimeEventBus.js';
import { taskService } from '../../tasks/taskService.js';
import { taskDiscussionService } from '../../tasks/taskDiscussionService.js';
import { notificationService } from '../../notifications/notificationService.js';
import {
  TaskModel,
  TaskCommentModel,
  TaskCommentMentionModel,
  WorkspaceModel,
  WorkspaceMemberModel,
  UserModel,
  NotificationModel,
} from '../../../db/models/index.js';
import { CreateTaskSchema, CreateTaskCommentSchema } from '@qlick/contracts';

describe('Realtime SSE & Event Stream Integration Tests', () => {
  let fajar: UserModel;
  let indra: UserModel;
  let devUser: UserModel;
  let workspace: WorkspaceModel;
  let task: TaskModel;

  before(async () => {
    fajar = await UserModel.create({
      email: `fajar-rt-${Date.now()}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Fajar Pratama',
      role: 'admin',
    });

    indra = await UserModel.create({
      email: `indra-rt-${Date.now()}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Indra QA',
      role: 'qa',
    });

    devUser = await UserModel.create({
      email: `dev-rt-${Date.now()}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Dev Budi',
      role: 'dev',
    });

    workspace = await WorkspaceModel.create({
      name: 'Realtime Test Workspace',
      slug: `rt-ws-${Date.now()}`,
      ownerId: fajar.id,
    });

    await WorkspaceMemberModel.bulkCreate([
      { workspaceId: workspace.id, userId: fajar.id, role: 'owner' },
      { workspaceId: workspace.id, userId: indra.id, role: 'qa' },
      { workspaceId: workspace.id, userId: devUser.id, role: 'dev' },
    ]);

    const created = await taskService.createTask(
      fajar.id,
      CreateTaskSchema.parse({
        workspaceId: workspace.id,
        title: 'Realtime Discussion Task Feature',
      })
    );

    task = (await TaskModel.findByPk(created.id))!;
  });

  after(async () => {
    await NotificationModel.destroy({ where: { workspaceId: workspace.id } });
    await TaskCommentMentionModel.destroy({ where: { workspaceId: workspace.id } });
    await TaskCommentModel.destroy({ where: { workspaceId: workspace.id } });
    await TaskModel.destroy({ where: { workspaceId: workspace.id }, force: true });
    await WorkspaceModel.destroy({ where: { id: workspace.id }, force: true });
    await UserModel.destroy({ where: { id: fajar.id }, force: true });
    await UserModel.destroy({ where: { id: indra.id }, force: true });
    await UserModel.destroy({ where: { id: devUser.id }, force: true });
  });

  test('RealtimeEventBus registers clients, tracks connection count, and cleans up on disconnect', () => {
    const mockWritten: string[] = [];
    const mockRes: any = {
      write: (data: string) => {
        mockWritten.push(data);
        return true;
      },
    };

    const clientId = `test-client-${Date.now()}`;
    realtimeEventBus.registerClient({
      clientId,
      workspaceId: workspace.id,
      userId: indra.id,
      res: mockRes,
    });

    assert.ok(mockWritten.length > 0, 'Should send initial connection confirmation message');
    assert.strictEqual(realtimeEventBus.getActiveConnectionCount(workspace.id) >= 1, true);

    // Remove client
    realtimeEventBus.removeClient(clientId);
  });

  test('Discussion comment creation emits discussion:comment_created event to workspace', async () => {
    const receivedEvents: Array<{ event: string; payload: any }> = [];
    const mockRes: any = {
      write: (data: string) => {
        if (data.startsWith('event: ')) {
          const eventName = data.replace('event: ', '').trim();
          receivedEvents.push({ event: eventName, payload: null });
        } else if (data.startsWith('data: ') && receivedEvents.length > 0) {
          const last = receivedEvents[receivedEvents.length - 1];
          try {
            last.payload = JSON.parse(data.replace('data: ', '').trim());
          } catch {}
        }
        return true;
      },
    };

    const clientId = `test-client-indra-${Date.now()}`;
    realtimeEventBus.registerClient({
      clientId,
      workspaceId: workspace.id,
      userId: indra.id,
      res: mockRes,
    });

    // Fajar posts a comment with mention @indra
    await taskDiscussionService.createTaskComment(
      fajar.id,
      workspace.id,
      task.id,
      CreateTaskCommentSchema.parse({
        body: 'Halo @indra ada update realtime diskusi baru nih!',
        mentionedUserIds: [indra.id],
      })
    );

    // Verify discussion event arrived
    const discussionEvent = receivedEvents.find((e) => e.event === 'discussion:comment_created');
    assert.ok(discussionEvent, 'Must receive discussion:comment_created realtime event');
    assert.strictEqual(discussionEvent.payload.data.taskId, task.id);
    assert.ok(discussionEvent.payload.data.comment.body.includes('update realtime diskusi'));

    // Verify notification event arrived for Indra
    const notifEvent = receivedEvents.find((e) => e.event === 'notification:new');
    assert.ok(notifEvent, 'Indra must receive notification:new realtime event for direct mention');

    realtimeEventBus.removeClient(clientId);
  });

  test('Notification creation emits notification:new directly to recipient stream', async () => {
    const receivedEvents: Array<{ event: string; payload: any }> = [];
    const mockRes: any = {
      write: (data: string) => {
        if (data.startsWith('event: ')) {
          receivedEvents.push({ event: data.replace('event: ', '').trim(), payload: null });
        } else if (data.startsWith('data: ') && receivedEvents.length > 0) {
          const last = receivedEvents[receivedEvents.length - 1];
          try {
            last.payload = JSON.parse(data.replace('data: ', '').trim());
          } catch {}
        }
        return true;
      },
    };

    const clientId = `test-client-dev-${Date.now()}`;
    realtimeEventBus.registerClient({
      clientId,
      workspaceId: workspace.id,
      userId: devUser.id,
      res: mockRes,
    });

    // Create direct in-app notification for Dev Budi
    await notificationService.createNotification({
      userId: devUser.id,
      workspaceId: workspace.id,
      taskId: task.id,
      actorId: fajar.id,
      type: 'assignment',
      title: 'Tugas Baru Diberikan',
      message: 'Fajar Pratama menugaskan task kepadamu',
      sendFcm: false,
    });

    const notifEvent = receivedEvents.find(
      (e) => e.event === 'notification:new' && e.payload?.data?.type === 'assignment'
    );

    assert.ok(notifEvent, 'Dev Budi must receive notification:new realtime event');
    assert.strictEqual(notifEvent.payload.data.title, 'Tugas Baru Diberikan');

    realtimeEventBus.removeClient(clientId);
  });
});
