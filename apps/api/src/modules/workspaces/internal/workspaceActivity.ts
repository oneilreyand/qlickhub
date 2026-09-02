import { UserModel } from '../../../db/models/user.js';
import { TaskModel } from '../../../db/models/task.js';
import { TaskActivityModel } from '../../../db/models/taskActivity.js';
import { BugModel } from '../../../db/models/bug.js';
import { BugActivityModel } from '../../../db/models/bugActivity.js';
import { TestCaseModel } from '../../../db/models/testCase.js';
import { TestCaseActivityModel } from '../../../db/models/testCaseActivity.js';
import { WorkFolderModel } from '../../../db/models/workFolder.js';
import { FolderActivityModel } from '../../../db/models/folderActivity.js';
import { WorkspaceMembershipActivityModel } from '../../../db/models/workspaceMembershipActivity.js';
import { Op } from 'sequelize';
import {
  WorkspaceActivityQuery,
  WorkspaceActivityListResponse,
  WorkspaceActivityItem,
} from '@qlick/contracts';

export async function listWorkspaceActivities(
  workspaceId: string,
  query: WorkspaceActivityQuery,
  _actorId: string,
): Promise<WorkspaceActivityListResponse> {
  const page = query.page || 1;
  const limit = query.limit || 50;
  const offset = (page - 1) * limit;

  const items: WorkspaceActivityItem[] = [];

  const dateWhere: Record<string, unknown> = {};
  if (query.startDate && query.endDate) {
    dateWhere.createdAt = { [Op.between]: [new Date(query.startDate), new Date(query.endDate)] };
  } else if (query.startDate) {
    dateWhere.createdAt = { [Op.gte]: new Date(query.startDate) };
  } else if (query.endDate) {
    dateWhere.createdAt = { [Op.lte]: new Date(query.endDate) };
  }

  const actorFilter = query.actorId ? { actorId: query.actorId } : {};

  // 1. Task activities
  if (!query.entityType || query.entityType === 'task') {
    const taskActivities = await TaskActivityModel.findAll({
      where: { workspaceId, ...actorFilter, ...dateWhere },
      include: [
        { model: UserModel, as: 'actor', attributes: ['id', 'name', 'email'] },
        { model: TaskModel, as: 'task', attributes: ['id', 'title'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: limit * page,
    });

    for (const act of taskActivities) {
      const json = act.toJSON() as any;
      items.push({
        id: json.id,
        workspaceId: json.workspaceId,
        entityType: 'task',
        entityId: json.taskId,
        entityTitle: json.task?.title || null,
        actorId: json.actorId || null,
        actorName: json.actor?.name || json.actor?.email || null,
        action: json.action,
        metadataJson: json.metadataJson || null,
        createdAt: new Date(json.createdAt).toISOString(),
      });
    }
  }

  // 2. Bug activities
  if (!query.entityType || query.entityType === 'bug') {
    const bugActivities = await BugActivityModel.findAll({
      where: { workspaceId, ...actorFilter, ...dateWhere },
      include: [
        { model: UserModel, as: 'actor', attributes: ['id', 'name', 'email'] },
        { model: BugModel, as: 'bug', attributes: ['id', 'title'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: limit * page,
    });

    for (const act of bugActivities) {
      const json = act.toJSON() as any;
      items.push({
        id: json.id,
        workspaceId: json.workspaceId,
        entityType: 'bug',
        entityId: json.bugId,
        entityTitle: json.bug?.title || null,
        actorId: json.actorId || null,
        actorName: json.actor?.name || json.actor?.email || null,
        action: json.action,
        metadataJson: json.metadata || null,
        createdAt: new Date(json.createdAt).toISOString(),
      });
    }
  }

  // 3. TestCase activities
  if (!query.entityType || query.entityType === 'test_case') {
    const testActivities = await TestCaseActivityModel.findAll({
      where: { workspaceId, ...actorFilter, ...dateWhere },
      include: [
        { model: UserModel, as: 'actor', attributes: ['id', 'name', 'email'] },
        { model: TestCaseModel, as: 'testCase', attributes: ['id', 'title'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: limit * page,
    });

    for (const act of testActivities) {
      const json = act.toJSON() as any;
      items.push({
        id: json.id,
        workspaceId: json.workspaceId,
        entityType: 'test_case',
        entityId: json.testCaseId,
        entityTitle: json.testCase?.title || null,
        actorId: json.actorId || null,
        actorName: json.actor?.name || json.actor?.email || null,
        action: json.action,
        metadataJson: json.metadata || null,
        createdAt: new Date(json.createdAt).toISOString(),
      });
    }
  }

  // 4. Folder activities
  if (!query.entityType || query.entityType === 'folder') {
    const folderActivities = await FolderActivityModel.findAll({
      where: { workspaceId, ...actorFilter, ...dateWhere },
      include: [
        { model: UserModel, as: 'actor', attributes: ['id', 'name', 'email'] },
        { model: WorkFolderModel, as: 'folder', attributes: ['id', 'name'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: limit * page,
    });

    for (const act of folderActivities) {
      const json = act.toJSON() as any;
      items.push({
        id: json.id,
        workspaceId: json.workspaceId,
        entityType: 'folder',
        entityId: json.folderId,
        entityTitle: json.folder?.name || null,
        actorId: json.actorId || null,
        actorName: json.actor?.name || json.actor?.email || null,
        action: json.action,
        metadataJson: json.metadataJson || null,
        createdAt: new Date(json.createdAt).toISOString(),
      });
    }
  }

  // 5. Membership activities
  if (!query.entityType || query.entityType === 'workspace_membership') {
    const memberActivities = await WorkspaceMembershipActivityModel.findAll({
      where: { workspaceId, ...actorFilter, ...dateWhere },
      include: [
        { model: UserModel, as: 'actor', attributes: ['id', 'name', 'email'] },
        { model: UserModel, as: 'targetUser', attributes: ['id', 'name', 'email'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: limit * page,
    });

    for (const act of memberActivities) {
      const json = act.toJSON() as any;
      items.push({
        id: json.id,
        workspaceId: json.workspaceId,
        entityType: 'workspace_membership',
        entityId: json.targetUserId,
        entityTitle: json.targetUser?.name || json.targetUser?.email || null,
        actorId: json.actorId || null,
        actorName: json.actor?.name || json.actor?.email || null,
        action: json.action,
        metadataJson: json.metadata || null,
        createdAt: new Date(json.createdAt).toISOString(),
      });
    }
  }

  // Sort all merged activities by createdAt DESC
  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = items.length;
  const paginated = items.slice(offset, offset + limit);

  return {
    activities: paginated,
    total,
    page,
    limit,
  };
}
