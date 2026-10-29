import { Op } from 'sequelize';
import type { FeatureHandoffPage, FeatureHandoffQuery } from '@qlick/contracts';
import { sequelize } from '../../db/sequelize.js';
import {
  TaskCommentMentionModel,
  TaskCommentModel,
  TaskModel,
  UserModel,
} from '../../db/models/index.js';
import { requireActiveMember } from '../../db/repositories/workspaceMemberRepository.js';
import { iso } from '../../utils/dateUtils.js';

/**
 * Handoff history of one Feature (P4d, AC-4.5): handoff-marked comments on the Feature and its
 * subtasks, newest first. Readable by any active workspace member, like task comments. `forYou`
 * is a label only and grants nothing.
 */
export class FeatureHandoffService {
  async list(
    workspaceId: string,
    featureTaskId: string,
    actorId: string,
    query: FeatureHandoffQuery,
  ): Promise<FeatureHandoffPage> {
    return sequelize.transaction(async (transaction) => {
      await requireActiveMember(workspaceId, actorId, transaction);

      const feature = await TaskModel.findOne({
        where: { id: featureTaskId, workspaceId, parentTaskId: null },
        attributes: ['id'],
        transaction,
      });
      if (!feature) throw new Error('NOT_FOUND: Feature not found in this workspace.');

      const familyTasks = await TaskModel.findAll({
        where: {
          workspaceId,
          [Op.or]: [{ id: featureTaskId }, { parentTaskId: featureTaskId }],
        },
        attributes: ['id', 'title', 'assigneeId'],
        transaction,
      });
      const taskById = new Map(familyTasks.map((task) => [task.id, task]));

      const { rows, count } = await TaskCommentModel.findAndCountAll({
        where: {
          workspaceId,
          taskId: { [Op.in]: [...taskById.keys()] },
          handoffKind: { [Op.ne]: null },
          deletedAt: null,
        },
        order: [
          ['createdAt', 'DESC'],
          ['id', 'DESC'],
        ],
        limit: query.limit,
        offset: (query.page - 1) * query.limit,
        transaction,
      });

      const commentIds = rows.map((row) => row.id);
      const parentIds = [
        ...new Set(rows.map((row) => row.parentCommentId).filter((id): id is string => !!id)),
      ];
      const authorIds = [...new Set(rows.map((row) => row.authorId))];
      const [mentions, parents, users] = await Promise.all([
        commentIds.length > 0
          ? TaskCommentMentionModel.findAll({
              where: { commentId: { [Op.in]: commentIds }, userId: actorId },
              attributes: ['commentId'],
              transaction,
            })
          : [],
        parentIds.length > 0
          ? TaskCommentModel.findAll({
              where: { id: { [Op.in]: parentIds }, workspaceId },
              attributes: ['id', 'authorId'],
              transaction,
            })
          : [],
        authorIds.length > 0
          ? UserModel.findAll({
              where: { id: { [Op.in]: authorIds } },
              attributes: ['id', 'name', 'email'],
              transaction,
            })
          : [],
      ]);
      const mentionedIds = new Set(mentions.map((mention) => mention.commentId));
      const parentAuthorById = new Map(parents.map((parent) => [parent.id, parent.authorId]));
      const nameById = new Map(users.map((user) => [user.id, user.name?.trim() || user.email]));

      return {
        items: rows.map((row) => {
          const task = taskById.get(row.taskId);
          const forYou =
            row.authorId !== actorId &&
            (mentionedIds.has(row.id) ||
              task?.assigneeId === actorId ||
              (!!row.parentCommentId && parentAuthorById.get(row.parentCommentId) === actorId));
          return {
            id: row.id,
            taskId: row.taskId,
            taskTitle: task?.title ?? '',
            kind: row.handoffKind!,
            body: row.body,
            author: { id: row.authorId, name: nameById.get(row.authorId) || 'Anggota tim' },
            parentCommentId: row.parentCommentId,
            forYou,
            createdAt: iso(row.createdAt),
          };
        }),
        page: query.page,
        limit: query.limit,
        total: count,
      };
    });
  }
}

export const featureHandoffService = new FeatureHandoffService();
