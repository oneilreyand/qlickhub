import { Op, Transaction } from 'sequelize';
import { sequelize } from '../../db/sequelize.js';
import {
  TaskModel,
  TaskCommentModel,
  TaskCommentMentionModel,
  WorkspaceMemberModel,
  UserModel,
} from '../../db/models/index.js';
import {
  CreateTaskCommentInput,
  UpdateTaskCommentInput,
  TaskCommentQuery,
  TaskComment,
  TaskCommentListResponse,
} from '@qa/contracts';

async function getActorMembership(
  workspaceId: string,
  actorId: string,
  transaction?: Transaction
): Promise<WorkspaceMemberModel> {
  const membership = await WorkspaceMemberModel.findOne({
    where: { workspaceId, userId: actorId },
    transaction,
  });

  if (!membership) {
    throw new Error('FORBIDDEN: You are not a member of this workspace.');
  }

  return membership;
}

function formatComment(commentInstance: TaskCommentModel): TaskComment {
  const json = commentInstance.toJSON() as any;
  const isDeleted = Boolean(json.deletedAt);

  const author = json.author;
  const mentions = (json.mentions || []).map((m: any) => ({
    userId: m.userId,
    userName: m.user?.name || m.user?.email || 'Workspace Member',
  }));

  const replies = (json.replies || []).map((r: any) => formatCommentFromObject(r));

  return {
    id: json.id,
    workspaceId: json.workspaceId,
    taskId: json.taskId,
    authorId: json.authorId,
    authorName: author?.name || author?.email || 'Workspace Member',
    parentCommentId: json.parentCommentId || null,
    body: isDeleted ? '[This comment has been deleted]' : json.body,
    editedAt: json.editedAt ? new Date(json.editedAt).toISOString() : null,
    deletedAt: json.deletedAt ? new Date(json.deletedAt).toISOString() : null,
    createdAt: json.createdAt ? new Date(json.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: json.updatedAt ? new Date(json.updatedAt).toISOString() : new Date().toISOString(),
    mentions,
    replies,
  };
}

function formatCommentFromObject(json: any): TaskComment {
  const isDeleted = Boolean(json.deletedAt);
  const author = json.author;
  const mentions = (json.mentions || []).map((m: any) => ({
    userId: m.userId,
    userName: m.user?.name || m.user?.email || 'Workspace Member',
  }));

  return {
    id: json.id,
    workspaceId: json.workspaceId,
    taskId: json.taskId,
    authorId: json.authorId,
    authorName: author?.name || author?.email || 'Workspace Member',
    parentCommentId: json.parentCommentId || null,
    body: isDeleted ? '[This comment has been deleted]' : json.body,
    editedAt: json.editedAt ? new Date(json.editedAt).toISOString() : null,
    deletedAt: json.deletedAt ? new Date(json.deletedAt).toISOString() : null,
    createdAt: json.createdAt ? new Date(json.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: json.updatedAt ? new Date(json.updatedAt).toISOString() : new Date().toISOString(),
    mentions,
  };
}

export class TaskDiscussionService {
  /**
   * Lists paginated task discussion comments (root messages with replies and mentions).
   */
  async listTaskComments(
    actorId: string,
    workspaceId: string,
    taskId: string,
    query: TaskCommentQuery
  ): Promise<TaskCommentListResponse> {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const offset = (page - 1) * limit;

    return await sequelize.transaction(async (transaction) => {
      await getActorMembership(workspaceId, actorId, transaction);

      const task = await TaskModel.findOne({
        where: { id: taskId, workspaceId },
        transaction,
      });

      if (!task) {
        throw new Error('NOT_FOUND: Task not found in this workspace.');
      }

      const { rows, count } = await TaskCommentModel.findAndCountAll({
        where: {
          workspaceId,
          taskId,
          parentCommentId: null,
        },
        include: [
          {
            model: UserModel,
            as: 'author',
            attributes: ['id', 'name', 'email'],
          },
          {
            model: TaskCommentMentionModel,
            as: 'mentions',
            include: [
              {
                model: UserModel,
                as: 'user',
                attributes: ['id', 'name', 'email'],
              },
            ],
          },
          {
            model: TaskCommentModel,
            as: 'replies',
            include: [
              {
                model: UserModel,
                as: 'author',
                attributes: ['id', 'name', 'email'],
              },
              {
                model: TaskCommentMentionModel,
                as: 'mentions',
                include: [
                  {
                    model: UserModel,
                    as: 'user',
                    attributes: ['id', 'name', 'email'],
                  },
                ],
              },
            ],
          },
        ],
        order: [
          ['createdAt', 'ASC'],
          [{ model: TaskCommentModel, as: 'replies' }, 'createdAt', 'ASC'],
        ],
        limit,
        offset,
        transaction,
      });

      const comments = rows.map((r) => formatComment(r));

      return {
        comments,
        total: count,
        page,
        limit,
      };
    });
  }

  /**
   * Creates a new comment message or reply with workspace-validated mentions.
   */
  async createTaskComment(
    actorId: string,
    workspaceId: string,
    taskId: string,
    input: CreateTaskCommentInput
  ): Promise<TaskComment> {
    return await sequelize.transaction(async (transaction) => {
      await getActorMembership(workspaceId, actorId, transaction);

      const task = await TaskModel.findOne({
        where: { id: taskId, workspaceId },
        transaction,
      });

      if (!task) {
        throw new Error('NOT_FOUND: Task not found in this workspace.');
      }

      if (input.parentCommentId) {
        const parentComment = await TaskCommentModel.findOne({
          where: { id: input.parentCommentId, workspaceId },
          transaction,
        });

        if (!parentComment) {
          throw new Error('NOT_FOUND: Parent comment not found in this workspace.');
        }

        if (parentComment.taskId !== taskId) {
          throw new Error('BAD_REQUEST: Reply must belong to the same task as the parent comment.');
        }

        if (parentComment.parentCommentId) {
          throw new Error('BAD_REQUEST: Replies are limited to one level.');
        }
      }

      const mentionedUserIds = input.mentionedUserIds || [];
      if (mentionedUserIds.length > 0) {
        const memberships = await WorkspaceMemberModel.findAll({
          where: {
            workspaceId,
            userId: { [Op.in]: mentionedUserIds },
          },
          transaction,
        });

        if (memberships.length !== new Set(mentionedUserIds).size) {
          throw new Error('BAD_REQUEST: All mentioned users must be active members of this workspace.');
        }
      }

      const comment = await TaskCommentModel.create(
        {
          workspaceId,
          taskId,
          authorId: actorId,
          parentCommentId: input.parentCommentId || null,
          body: input.body,
        },
        { transaction }
      );

      if (mentionedUserIds.length > 0) {
        await TaskCommentMentionModel.bulkCreate(
          mentionedUserIds.map((uId) => ({
            commentId: comment.id,
            userId: uId,
            workspaceId,
          })),
          { transaction }
        );
      }

      const createdComment = await TaskCommentModel.findOne({
        where: { id: comment.id, workspaceId },
        include: [
          {
            model: UserModel,
            as: 'author',
            attributes: ['id', 'name', 'email'],
          },
          {
            model: TaskCommentMentionModel,
            as: 'mentions',
            include: [
              {
                model: UserModel,
                as: 'user',
                attributes: ['id', 'name', 'email'],
              },
            ],
          },
        ],
        transaction,
      });

      return formatComment(createdComment!);
    });
  }

  /**
   * Updates an existing comment message body (author or owner/admin moderation).
   */
  async updateTaskComment(
    actorId: string,
    workspaceId: string,
    taskId: string,
    commentId: string,
    input: UpdateTaskCommentInput
  ): Promise<TaskComment> {
    return await sequelize.transaction(async (transaction) => {
      const membership = await getActorMembership(workspaceId, actorId, transaction);

      const comment = await TaskCommentModel.findOne({
        where: { id: commentId, taskId, workspaceId },
        include: [
          {
            model: UserModel,
            as: 'author',
            attributes: ['id', 'name', 'email'],
          },
          {
            model: TaskCommentMentionModel,
            as: 'mentions',
            include: [
              {
                model: UserModel,
                as: 'user',
                attributes: ['id', 'name', 'email'],
              },
            ],
          },
        ],
        transaction,
      });

      if (!comment) {
        throw new Error('NOT_FOUND: Comment not found on this task.');
      }

      if (comment.deletedAt) {
        throw new Error('BAD_REQUEST: Cannot edit a deleted comment.');
      }

      const isAuthor = comment.authorId === actorId;
      const isModerator = membership.role === 'owner' || membership.role === 'admin';

      if (!isAuthor && !isModerator) {
        throw new Error('FORBIDDEN: You can edit only your own comments.');
      }

      comment.body = input.body;
      comment.editedAt = new Date();
      await comment.save({ transaction });

      return formatComment(comment);
    });
  }

  /**
   * Soft deletes a comment message (author or owner/admin moderation).
   */
  async deleteTaskComment(
    actorId: string,
    workspaceId: string,
    taskId: string,
    commentId: string
  ): Promise<TaskComment> {
    return await sequelize.transaction(async (transaction) => {
      const membership = await getActorMembership(workspaceId, actorId, transaction);

      const comment = await TaskCommentModel.findOne({
        where: { id: commentId, taskId, workspaceId },
        include: [
          {
            model: UserModel,
            as: 'author',
            attributes: ['id', 'name', 'email'],
          },
          {
            model: TaskCommentMentionModel,
            as: 'mentions',
            include: [
              {
                model: UserModel,
                as: 'user',
                attributes: ['id', 'name', 'email'],
              },
            ],
          },
        ],
        transaction,
      });

      if (!comment) {
        throw new Error('NOT_FOUND: Comment not found on this task.');
      }

      const isAuthor = comment.authorId === actorId;
      const isModerator = membership.role === 'owner' || membership.role === 'admin';

      if (!isAuthor && !isModerator) {
        throw new Error('FORBIDDEN: You can delete only your own comments.');
      }

      comment.deletedAt = new Date();
      comment.body = '[This comment has been deleted]';
      await comment.save({ transaction });

      return formatComment(comment);
    });
  }
}

export const taskDiscussionService = new TaskDiscussionService();
