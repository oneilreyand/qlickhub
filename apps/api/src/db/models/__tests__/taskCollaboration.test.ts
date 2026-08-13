import assert from 'node:assert';
import { test, describe, before, after } from 'node:test';
import { TaskModel } from '../task.js';
import { TaskActivityModel } from '../taskActivity.js';
import { TaskCommentModel } from '../taskComment.js';
import { TaskCommentMentionModel } from '../taskCommentMention.js';
import { WorkFolderModel } from '../workFolder.js';
import { WorkspaceModel } from '../workspace.js';
import { WorkspaceMemberModel } from '../workspaceMember.js';
import { UserModel } from '../user.js';

describe('Task Collaboration Integrity Tests (ST1)', () => {
  let userA: UserModel;
  let userB: UserModel;
  let workspace1: WorkspaceModel;
  let workspace2: WorkspaceModel;
  let folder1: WorkFolderModel;
  let folder2: WorkFolderModel;
  let parentTask1: TaskModel;

  before(async () => {
    userA = await UserModel.create({
      email: `st1-usera-${Date.now()}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'User A',
      role: 'dev',
    });

    userB = await UserModel.create({
      email: `st1-userb-${Date.now()}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'User B',
      role: 'qa_member',
    });

    workspace1 = await WorkspaceModel.create({
      name: 'ST1 Workspace 1',
      slug: `st1-ws1-${Date.now()}`,
      ownerId: userA.id,
    });

    workspace2 = await WorkspaceModel.create({
      name: 'ST1 Workspace 2',
      slug: `st1-ws2-${Date.now()}`,
      ownerId: userB.id,
    });

    await WorkspaceMemberModel.create({
      workspaceId: workspace1.id,
      userId: userA.id,
      role: 'owner',
    });

    await WorkspaceMemberModel.create({
      workspaceId: workspace1.id,
      userId: userB.id,
      role: 'qa',
    });

    await WorkspaceMemberModel.create({
      workspaceId: workspace2.id,
      userId: userB.id,
      role: 'owner',
    });

    folder1 = await WorkFolderModel.create({
      workspaceId: workspace1.id,
      name: 'Folder 1',
      position: 0,
      createdBy: userA.id,
    });

    folder2 = await WorkFolderModel.create({
      workspaceId: workspace1.id,
      name: 'Folder 2',
      position: 1,
      createdBy: userA.id,
    });

    parentTask1 = await TaskModel.create({
      workspaceId: workspace1.id,
      folderId: folder1.id,
      title: 'Parent Task 1',
      status: 'todo',
      priority: 'high',
      reporterId: userA.id,
    });
  });

  after(async () => {
    await TaskCommentMentionModel.destroy({ where: { workspaceId: workspace1.id } });
    await TaskCommentModel.destroy({ where: { workspaceId: workspace1.id } });
    await TaskActivityModel.destroy({ where: { workspaceId: workspace1.id } });
    await TaskModel.destroy({ where: { workspaceId: workspace1.id }, force: true });
    await TaskModel.destroy({ where: { workspaceId: workspace2.id }, force: true });
    await WorkFolderModel.destroy({ where: { workspaceId: workspace1.id }, force: true });
    await WorkspaceModel.destroy({ where: { id: workspace1.id }, force: true });
    await WorkspaceModel.destroy({ where: { id: workspace2.id }, force: true });
    await UserModel.destroy({ where: { id: userA.id }, force: true });
    await UserModel.destroy({ where: { id: userB.id }, force: true });
  });

  test('Creates a valid subtask with deliveryArea matching parent workspace and folder', async () => {
    const subtask = await TaskModel.create({
      workspaceId: workspace1.id,
      folderId: folder1.id,
      parentTaskId: parentTask1.id,
      deliveryArea: 'frontend',
      title: 'FE Implementation Subtask',
      status: 'todo',
      priority: 'medium',
      reporterId: userA.id,
      assigneeId: userB.id,
    });

    assert.ok(subtask.id);
    assert.strictEqual(subtask.parentTaskId, parentTask1.id);
    assert.strictEqual(subtask.deliveryArea, 'frontend');
  });

  test('Rejects cross-workspace parent task foreign key / trigger', async () => {
    // Attempt to create a subtask in workspace2 pointing to parentTask1 (workspace1)
    await assert.rejects(
      async () => {
        await TaskModel.create({
          workspaceId: workspace2.id,
          parentTaskId: parentTask1.id,
          deliveryArea: 'backend',
          title: 'Cross workspace subtask',
          status: 'todo',
          priority: 'medium',
          reporterId: userB.id,
        });
      },
      (err: any) => {
        assert.ok(
          err.name === 'SequelizeForeignKeyConstraintError' ||
          err.name === 'SequelizeDatabaseError' ||
          String(err.message).includes('workspace')
        );
        return true;
      }
    );
  });

  test('Rejects self-parenting task', async () => {
    await assert.rejects(
      async () => {
        await TaskModel.create({
          id: '11111111-1111-4111-a111-111111111111',
          workspaceId: workspace1.id,
          parentTaskId: '11111111-1111-4111-a111-111111111111',
          deliveryArea: 'qa',
          title: 'Self parenting task',
          status: 'todo',
          priority: 'low',
          reporterId: userA.id,
        });
      },
      (err: any) => {
        assert.ok(
          err.name === 'SequelizeCheckConstraintError' ||
          err.name === 'SequelizeDatabaseError' ||
          String(err.message).includes('own parent')
        );
        return true;
      }
    );
  });

  test('Rejects nested subtask (subtask of a subtask)', async () => {
    const directSubtask = await TaskModel.create({
      workspaceId: workspace1.id,
      folderId: folder1.id,
      parentTaskId: parentTask1.id,
      deliveryArea: 'backend',
      title: 'BE Direct Subtask',
      status: 'todo',
      priority: 'high',
      reporterId: userA.id,
    });

    await assert.rejects(
      async () => {
        await TaskModel.create({
          workspaceId: workspace1.id,
          folderId: folder1.id,
          parentTaskId: directSubtask.id,
          deliveryArea: 'qa',
          title: 'Nested Subtask',
          status: 'todo',
          priority: 'low',
          reporterId: userA.id,
        });
      },
      (err: any) => {
        assert.ok(
          err.name === 'SequelizeDatabaseError' &&
          String(err.message).includes('Nested subtasks are not allowed')
        );
        return true;
      }
    );
  });

  test('Rejects subtask with folder different from parent folder', async () => {
    await assert.rejects(
      async () => {
        await TaskModel.create({
          workspaceId: workspace1.id,
          folderId: folder2.id, // folder1 is parent's folder
          parentTaskId: parentTask1.id,
          deliveryArea: 'qa',
          title: 'Mismatched Folder Subtask',
          status: 'todo',
          priority: 'medium',
          reporterId: userA.id,
        });
      },
      (err: any) => {
        assert.ok(
          err.name === 'SequelizeDatabaseError' &&
          String(err.message).includes('folder must match parent')
        );
        return true;
      }
    );
  });

  test('Rejects subtask missing deliveryArea or parent task with deliveryArea', async () => {
    // Subtask without deliveryArea
    await assert.rejects(
      async () => {
        await TaskModel.create({
          workspaceId: workspace1.id,
          folderId: folder1.id,
          parentTaskId: parentTask1.id,
          title: 'Subtask without area',
          status: 'todo',
          priority: 'low',
          reporterId: userA.id,
        });
      },
      (err: any) => {
        assert.ok(
          err.name === 'SequelizeDatabaseError' &&
          String(err.message).includes('delivery_area is required')
        );
        return true;
      }
    );

    // Parent task with deliveryArea
    await assert.rejects(
      async () => {
        await TaskModel.create({
          workspaceId: workspace1.id,
          deliveryArea: 'frontend',
          title: 'Parent with area',
          status: 'todo',
          priority: 'low',
          reporterId: userA.id,
        });
      },
      (err: any) => {
        assert.ok(
          err.name === 'SequelizeDatabaseError' &&
          String(err.message).includes('delivery_area is allowed only for subtasks')
        );
        return true;
      }
    );
  });

  test('Creates and links workspace-scoped Activity, Comment, and CommentMention', async () => {
    const activity = await TaskActivityModel.create({
      workspaceId: workspace1.id,
      taskId: parentTask1.id,
      actorId: userA.id,
      action: 'subtask.created',
      metadataJson: { deliveryArea: 'frontend' },
    });

    assert.ok(activity.id);
    assert.strictEqual(activity.action, 'subtask.created');

    const comment = await TaskCommentModel.create({
      workspaceId: workspace1.id,
      taskId: parentTask1.id,
      authorId: userA.id,
      body: 'Please review the FE implementation @User B',
    });

    assert.ok(comment.id);

    const mention = await TaskCommentMentionModel.create({
      commentId: comment.id,
      userId: userB.id,
      workspaceId: workspace1.id,
    });

    assert.strictEqual(mention.commentId, comment.id);
    assert.strictEqual(mention.userId, userB.id);

    // Reply comment
    const reply = await TaskCommentModel.create({
      workspaceId: workspace1.id,
      taskId: parentTask1.id,
      authorId: userB.id,
      parentCommentId: comment.id,
      body: 'Looking into it now',
    });

    assert.strictEqual(reply.parentCommentId, comment.id);

    // Rejects nested reply (reply to reply)
    await assert.rejects(
      async () => {
        await TaskCommentModel.create({
          workspaceId: workspace1.id,
          taskId: parentTask1.id,
          authorId: userA.id,
          parentCommentId: reply.id,
          body: 'Nested reply attempt',
        });
      },
      (err: any) => {
        assert.ok(
          err.name === 'SequelizeDatabaseError' &&
          String(err.message).includes('Replies are limited to one level')
        );
        return true;
      }
    );
  });

  test('Preserves collaboration history when a mentioned member leaves the workspace', async () => {
    const activity = await TaskActivityModel.create({
      workspaceId: workspace1.id,
      taskId: parentTask1.id,
      actorId: userB.id,
      action: 'task.viewed',
    });
    const comment = await TaskCommentModel.create({
      workspaceId: workspace1.id,
      taskId: parentTask1.id,
      authorId: userB.id,
      body: 'Leaving a final implementation note.',
    });
    const mention = await TaskCommentMentionModel.create({
      commentId: comment.id,
      userId: userB.id,
      workspaceId: workspace1.id,
    });

    await WorkspaceMemberModel.destroy({
      where: { workspaceId: workspace1.id, userId: userB.id },
    });

    const [storedActivity, storedComment, storedMention] = await Promise.all([
      TaskActivityModel.findByPk(activity.id),
      TaskCommentModel.findByPk(comment.id),
      TaskCommentMentionModel.findOne({
        where: { commentId: mention.commentId, userId: mention.userId },
      }),
    ]);

    assert.strictEqual(storedActivity?.actorId, userB.id);
    assert.strictEqual(storedComment?.authorId, userB.id);
    assert.strictEqual(storedMention?.userId, userB.id);
  });
});
