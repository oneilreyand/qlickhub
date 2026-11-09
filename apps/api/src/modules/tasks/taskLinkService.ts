import { TaskModel, TaskLinkModel } from '../../db/models/index.js';
import { sequelize } from '../../db/sequelize.js';
import type { CreateTaskLinkInput, TaskLink, UpdateTaskLinkInput } from '@qlick/contracts';

export class TaskLinkNotFoundError extends Error {
  readonly status = 404;
  constructor(message: string = 'Tautan referensi tidak ditemukan.') {
    super(message);
    this.name = 'TaskLinkNotFoundError';
  }
}

export class TaskNotFoundError extends Error {
  readonly status = 404;
  constructor(message: string = 'Task tidak ditemukan pada workspace ini.') {
    super(message);
    this.name = 'TaskNotFoundError';
  }
}

function toContract(row: TaskLinkModel): TaskLink {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    taskId: row.taskId,
    title: row.title,
    url: row.url,
    linkType: row.linkType,
    sortOrder: row.sortOrder,
    createdBy: row.createdBy ?? null,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

export const taskLinkService = {
  async listTaskLinks(workspaceId: string, taskId: string): Promise<TaskLink[]> {
    const task = await TaskModel.findOne({ where: { id: taskId, workspaceId } });
    if (!task) throw new TaskNotFoundError();

    const rows = await TaskLinkModel.findAll({
      where: { workspaceId, taskId },
      order: [
        ['sortOrder', 'ASC'],
        ['createdAt', 'ASC'],
      ],
    });

    return rows.map(toContract);
  },

  async createTaskLink(
    workspaceId: string,
    taskId: string,
    input: CreateTaskLinkInput,
    createdBy?: string | null,
  ): Promise<TaskLink> {
    const task = await TaskModel.findOne({ where: { id: taskId, workspaceId } });
    if (!task) throw new TaskNotFoundError();

    let sortOrder = input.sortOrder;
    if (sortOrder === undefined) {
      const maxOrder = (await TaskLinkModel.max('sortOrder', {
        where: { workspaceId, taskId },
      })) as number | null;
      sortOrder = typeof maxOrder === 'number' ? maxOrder + 10 : 0;
    }

    const created = await TaskLinkModel.create({
      workspaceId,
      taskId,
      title: input.title,
      url: input.url,
      linkType: input.linkType ?? 'other',
      sortOrder,
      createdBy: createdBy ?? null,
    });

    return toContract(created);
  },

  async updateTaskLink(
    workspaceId: string,
    taskId: string,
    linkId: string,
    input: UpdateTaskLinkInput,
  ): Promise<TaskLink> {
    const link = await TaskLinkModel.findOne({
      where: { id: linkId, workspaceId, taskId },
    });
    if (!link) throw new TaskLinkNotFoundError();

    if (input.title !== undefined) link.title = input.title;
    if (input.url !== undefined) link.url = input.url;
    if (input.linkType !== undefined) link.linkType = input.linkType;
    if (input.sortOrder !== undefined) link.sortOrder = input.sortOrder;

    await link.save();
    return toContract(link);
  },

  async deleteTaskLink(workspaceId: string, taskId: string, linkId: string): Promise<void> {
    const link = await TaskLinkModel.findOne({
      where: { id: linkId, workspaceId, taskId },
    });
    if (!link) throw new TaskLinkNotFoundError();

    await link.destroy();
  },

  async reorderTaskLinks(
    workspaceId: string,
    taskId: string,
    linkIds: string[],
  ): Promise<TaskLink[]> {
    const task = await TaskModel.findOne({ where: { id: taskId, workspaceId } });
    if (!task) throw new TaskNotFoundError();

    await sequelize.transaction(async (transaction) => {
      for (let i = 0; i < linkIds.length; i++) {
        await TaskLinkModel.update(
          { sortOrder: i * 10 },
          {
            where: { id: linkIds[i], workspaceId, taskId },
            transaction,
          },
        );
      }
    });

    return this.listTaskLinks(workspaceId, taskId);
  },
};
