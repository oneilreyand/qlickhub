import assert from 'node:assert';
import { test, describe, before, after } from 'node:test';
import { taskService } from '../taskService.js';
import { taskDiscussionService } from '../taskDiscussionService.js';
import {
  TaskModel,
  TaskCommentModel,
  TaskCommentMentionModel,
  WorkspaceModel,
  WorkspaceMemberModel,
  UserModel,
} from '../../../db/models/index.js';
import { CreateTaskSchema, CreateTaskCommentSchema, TaskCommentQuerySchema } from '@qlick/contracts';

describe('Persisted Task Discussion Integration Tests (ST4)', () => {
  let owner: UserModel;
  let devMember: UserModel;
  let qaMember: UserModel;
  let nonMember: UserModel;
  let workspace: WorkspaceModel;
  let otherWorkspace: WorkspaceModel;
  let task: TaskModel;

  before(async () => {
    owner = await UserModel.create({
      email: `st4-owner-${Date.now()}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Workspace Owner',
      role: 'admin',
    });

    devMember = await UserModel.create({
      email: `st4-dev-${Date.now()}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Dev Member',
      role: 'dev',
    });

    qaMember = await UserModel.create({
      email: `st4-qa-${Date.now()}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'QA Member',
      role: 'qa',
    });

    nonMember = await UserModel.create({
      email: `st4-nonmember-${Date.now()}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Outsider',
      role: 'dev',
    });

    workspace = await WorkspaceModel.create({
      name: 'ST4 Discussion Workspace',
      slug: `st4-ws-${Date.now()}`,
      ownerId: owner.id,
    });

    otherWorkspace = await WorkspaceModel.create({
      name: 'ST4 Other Workspace',
      slug: `st4-other-${Date.now()}`,
      ownerId: nonMember.id,
    });

    await WorkspaceMemberModel.create({
      workspaceId: workspace.id,
      userId: owner.id,
      role: 'owner',
    });

    await WorkspaceMemberModel.create({
      workspaceId: workspace.id,
      userId: devMember.id,
      role: 'dev',
    });

    await WorkspaceMemberModel.create({
      workspaceId: workspace.id,
      userId: qaMember.id,
      role: 'qa',
    });

    await WorkspaceMemberModel.create({
      workspaceId: otherWorkspace.id,
      userId: nonMember.id,
      role: 'owner',
    });

    const createdTask = await taskService.createTask(
      owner.id,
      CreateTaskSchema.parse({
        workspaceId: workspace.id,
        title: 'Discussion Feature Test Task',
      })
    );

    task = (await TaskModel.findByPk(createdTask.id))!;
  });

  after(async () => {
    await TaskCommentMentionModel.destroy({ where: { workspaceId: workspace.id } });
    await TaskCommentModel.destroy({ where: { workspaceId: workspace.id } });
    await TaskModel.destroy({ where: { workspaceId: workspace.id }, force: true });
    await WorkspaceModel.destroy({ where: { id: workspace.id }, force: true });
    await WorkspaceModel.destroy({ where: { id: otherWorkspace.id }, force: true });
    await UserModel.destroy({ where: { id: owner.id }, force: true });
    await UserModel.destroy({ where: { id: devMember.id }, force: true });
    await UserModel.destroy({ where: { id: qaMember.id }, force: true });
    await UserModel.destroy({ where: { id: nonMember.id }, force: true });
  });

  test('Every workspace member can post a discussion message and reply once', async () => {
    const rootComment = await taskDiscussionService.createTaskComment(
      devMember.id,
      workspace.id,
      task.id,
      CreateTaskCommentSchema.parse({
        body: 'Hello team, initial FE setup is complete.',
        mentionedUserIds: [qaMember.id],
      })
    );

    assert.ok(rootComment.id);
    assert.strictEqual(rootComment.authorId, devMember.id);
    assert.strictEqual(rootComment.mentions?.length, 1);
    assert.strictEqual(rootComment.mentions?.[0].userId, qaMember.id);

    // QA replies to dev's message
    const replyComment = await taskDiscussionService.createTaskComment(
      qaMember.id,
      workspace.id,
      task.id,
      CreateTaskCommentSchema.parse({
        parentCommentId: rootComment.id,
        body: 'Thanks! Starting test plan generation now.',
      })
    );

    assert.strictEqual(replyComment.parentCommentId, rootComment.id);
    assert.strictEqual(replyComment.authorId, qaMember.id);

    // List discussion thread
    const thread = await taskDiscussionService.listTaskComments(
      owner.id,
      workspace.id,
      task.id,
      TaskCommentQuerySchema.parse({
        workspaceId: workspace.id,
        taskId: task.id,
      })
    );
    assert.strictEqual(thread.comments.length, 1);
    assert.strictEqual(thread.comments[0].replies?.length, 1);
    assert.strictEqual(thread.comments[0].replies?.[0].id, replyComment.id);
  });

  test('Rejects nested reply (reply to a reply)', async () => {
    const root = await taskDiscussionService.createTaskComment(
      devMember.id,
      workspace.id,
      task.id,
      CreateTaskCommentSchema.parse({
        body: 'Root message for reply check',
      })
    );

    const reply1 = await taskDiscussionService.createTaskComment(
      qaMember.id,
      workspace.id,
      task.id,
      CreateTaskCommentSchema.parse({
        parentCommentId: root.id,
        body: 'First level reply',
      })
    );

    await assert.rejects(
      async () => {
        await taskDiscussionService.createTaskComment(
          devMember.id,
          workspace.id,
          task.id,
          CreateTaskCommentSchema.parse({
            parentCommentId: reply1.id,
            body: 'Attempted nested reply',
          })
        );
      },
      (err: any) => {
        assert.ok(String(err.message).includes('BAD_REQUEST'));
        return true;
      }
    );
  });

  test('Rejects mentioning non-workspace members', async () => {
    await assert.rejects(
      async () => {
        await taskDiscussionService.createTaskComment(
          devMember.id,
          workspace.id,
          task.id,
          CreateTaskCommentSchema.parse({
            body: 'Hey @Outsider check this',
            mentionedUserIds: [nonMember.id],
          })
        );
      },
      (err: any) => {
        assert.ok(String(err.message).includes('BAD_REQUEST'));
        return true;
      }
    );
  });

  test('Author can edit and soft-delete own message; deleted message retains tombstone', async () => {
    const comment = await taskDiscussionService.createTaskComment(
      devMember.id,
      workspace.id,
      task.id,
      CreateTaskCommentSchema.parse({
        body: 'Original draft message',
      })
    );

    // Author edits message
    const edited = await taskDiscussionService.updateTaskComment(devMember.id, workspace.id, task.id, comment.id, {
      body: 'Updated message content',
    });

    assert.strictEqual(edited.body, 'Updated message content');
    assert.ok(edited.editedAt);

    // Author soft deletes message
    const deleted = await taskDiscussionService.deleteTaskComment(devMember.id, workspace.id, task.id, comment.id);
    assert.strictEqual(deleted.body, '[This comment has been deleted]');
    assert.ok(deleted.deletedAt);

    // Attempting to edit deleted message -> Rejected
    await assert.rejects(
      async () => {
        await taskDiscussionService.updateTaskComment(devMember.id, workspace.id, task.id, comment.id, {
          body: 'Editing deleted message',
        });
      },
      (err: any) => {
        assert.ok(String(err.message).includes('BAD_REQUEST'));
        return true;
      }
    );
  });

  test('Non-author cannot edit or delete another user message, but Owner/Admin can moderate', async () => {
    const devComment = await taskDiscussionService.createTaskComment(
      devMember.id,
      workspace.id,
      task.id,
      CreateTaskCommentSchema.parse({
        body: 'Dev comment for moderation test',
      })
    );

    // QA attempts to edit Dev's comment -> Forbidden
    await assert.rejects(
      async () => {
        await taskDiscussionService.updateTaskComment(qaMember.id, workspace.id, task.id, devComment.id, {
          body: 'Unpermitted edit',
        });
      },
      (err: any) => {
        assert.ok(String(err.message).includes('FORBIDDEN'));
        return true;
      }
    );

    // Workspace Owner moderates (soft deletes) Dev's comment -> Allowed
    const moderated = await taskDiscussionService.deleteTaskComment(owner.id, workspace.id, task.id, devComment.id);
    assert.strictEqual(moderated.body, '[This comment has been deleted]');
    assert.ok(moderated.deletedAt);
  });

  test('Non-workspace member cannot read or post in discussion thread', async () => {
    await assert.rejects(
      async () => {
        await taskDiscussionService.listTaskComments(
          nonMember.id,
          workspace.id,
          task.id,
          TaskCommentQuerySchema.parse({
            workspaceId: workspace.id,
            taskId: task.id,
          })
        );
      },
      (err: any) => {
        assert.ok(String(err.message).includes('FORBIDDEN'));
        return true;
      }
    );

    await assert.rejects(
      async () => {
        await taskDiscussionService.createTaskComment(
          nonMember.id,
          workspace.id,
          task.id,
          CreateTaskCommentSchema.parse({
            body: 'Outsider post attempt',
          })
        );
      },
      (err: any) => {
        assert.ok(String(err.message).includes('FORBIDDEN'));
        return true;
      }
    );
  });
});
