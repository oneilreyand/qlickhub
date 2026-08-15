import { sequelize } from '../../db/sequelize.js';
import {
  QaDocumentModel,
  QaDocumentVersionModel,
  TaskDocumentModel,
  TaskModel,
  TaskActivityModel,
  WorkspaceMemberModel,
  WorkspaceModel,
} from '../../db/models/index.js';
import {
  assertCanReadQaDocuments,
  assertCanCreateQaDocument,
  assertCanLinkQaDocument,
} from '../../policies/qaDocumentPolicy.js';
import {
  QaDocument,
  QaDocumentVersion,
  CreateQaDocumentInput,
  CreateQaDocumentVersionInput,
  TaskDocumentLink,
} from '@qa/contracts';

function formatDocument(d: QaDocumentModel | Record<string, any>): QaDocument {
  const json = typeof (d as any).toJSON === 'function' ? (d as any).toJSON() : d;
  return {
    id: json.id,
    workspaceId: json.workspaceId,
    folderId: json.folderId || null,
    title: json.title,
    docType: json.docType,
    currentVersion: json.currentVersion,
    createdBy: json.createdBy,
    createdAt: json.createdAt ? new Date(json.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: json.updatedAt ? new Date(json.updatedAt).toISOString() : new Date().toISOString(),
  };
}

function formatVersion(v: QaDocumentVersionModel | Record<string, any>): QaDocumentVersion {
  const json = typeof (v as any).toJSON === 'function' ? (v as any).toJSON() : v;
  return {
    id: json.id,
    workspaceId: json.workspaceId,
    documentId: json.documentId,
    version: json.version,
    title: json.title,
    contentMarkdown: json.contentMarkdown,
    changelog: json.changelog || null,
    createdBy: json.createdBy,
    createdAt: json.createdAt ? new Date(json.createdAt).toISOString() : new Date().toISOString(),
  };
}

function formatTaskDocumentLink(l: TaskDocumentModel): TaskDocumentLink {
  const json: any = l.toJSON();
  const docObj = l.document || json.document;
  return {
    id: json.id,
    workspaceId: json.workspaceId,
    taskId: json.taskId,
    documentId: json.documentId,
    linkedBy: json.linkedBy,
    createdAt: json.createdAt ? new Date(json.createdAt).toISOString() : new Date().toISOString(),
    document: docObj ? formatDocument(docObj) : undefined,
  };
}

async function getActorMembership(workspaceId: string, actorId: string) {
  const member = await WorkspaceMemberModel.findOne({
    where: { workspaceId, userId: actorId },
  });
  if (!member) {
    throw new Error('FORBIDDEN: You are not a member of this workspace.');
  }
  return member;
}

export class QaDocumentService {
  async listWorkspaceDocuments(
    workspaceId: string,
    folderId: string | undefined,
    actorId: string
  ): Promise<QaDocument[]> {
    const member = await getActorMembership(workspaceId, actorId);
    assertCanReadQaDocuments(member.role);

    const where: Record<string, any> = { workspaceId };
    if (folderId) {
      where.folderId = folderId;
    }

    const docs = await QaDocumentModel.findAll({
      where,
      order: [['updatedAt', 'DESC']],
    });

    return docs.map(formatDocument);
  }

  async getDocumentWithVersions(
    workspaceId: string,
    documentId: string,
    actorId: string
  ): Promise<{ document: QaDocument; versions: QaDocumentVersion[]; currentVersion: QaDocumentVersion }> {
    const member = await getActorMembership(workspaceId, actorId);
    assertCanReadQaDocuments(member.role);

    const doc = await QaDocumentModel.findOne({
      where: { id: documentId, workspaceId },
    });
    if (!doc) {
      throw new Error('NOT_FOUND: QA Document not found in this workspace.');
    }

    const versions = await QaDocumentVersionModel.findAll({
      where: { workspaceId, documentId },
      order: [['version', 'DESC']],
    });

    const formattedVersions = versions.map(formatVersion);
    const current = formattedVersions.find((v) => v.version === doc.currentVersion) || formattedVersions[0];

    return {
      document: formatDocument(doc),
      versions: formattedVersions,
      currentVersion: current,
    };
  }

  async createDocument(
    workspaceId: string,
    actorId: string,
    input: Omit<CreateQaDocumentInput, 'workspaceId'>
  ): Promise<{ document: QaDocument; version: QaDocumentVersion }> {
    const member = await getActorMembership(workspaceId, actorId);
    assertCanCreateQaDocument(member.role);

    return await sequelize.transaction(async (transaction) => {
      const doc = await QaDocumentModel.create(
        {
          workspaceId,
          folderId: input.folderId || null,
          title: input.title.trim(),
          docType: input.docType || 'test_plan',
          currentVersion: 1,
          createdBy: actorId,
        },
        { transaction }
      );

      const ver = await QaDocumentVersionModel.create(
        {
          workspaceId,
          documentId: doc.id,
          version: 1,
          title: input.title.trim(),
          contentMarkdown: input.contentMarkdown,
          changelog: input.changelog || 'Initial document creation',
          createdBy: actorId,
        },
        { transaction }
      );

      return {
        document: formatDocument(doc),
        version: formatVersion(ver),
      };
    });
  }

  async createDocumentVersion(
    workspaceId: string,
    documentId: string,
    actorId: string,
    input: Omit<CreateQaDocumentVersionInput, 'workspaceId' | 'documentId'>
  ): Promise<{ document: QaDocument; version: QaDocumentVersion }> {
    const member = await getActorMembership(workspaceId, actorId);
    assertCanCreateQaDocument(member.role);

    return await sequelize.transaction(async (transaction) => {
      const doc = await QaDocumentModel.findOne({
        where: { id: documentId, workspaceId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!doc) {
        throw new Error('NOT_FOUND: QA Document not found in this workspace.');
      }

      const nextVersionNumber = doc.currentVersion + 1;
      const newTitle = input.title?.trim() || doc.title;

      doc.currentVersion = nextVersionNumber;
      doc.title = newTitle;
      await doc.save({ transaction });

      const ver = await QaDocumentVersionModel.create(
        {
          workspaceId,
          documentId: doc.id,
          version: nextVersionNumber,
          title: newTitle,
          contentMarkdown: input.contentMarkdown,
          changelog: input.changelog || `Updated to version ${nextVersionNumber}`,
          createdBy: actorId,
        },
        { transaction }
      );

      return {
        document: formatDocument(doc),
        version: formatVersion(ver),
      };
    });
  }

  async listTaskDocumentLinks(
    workspaceId: string,
    taskId: string,
    actorId: string
  ): Promise<TaskDocumentLink[]> {
    const member = await getActorMembership(workspaceId, actorId);
    assertCanReadQaDocuments(member.role);

    const task = await TaskModel.findOne({
      where: { id: taskId, workspaceId },
    });
    if (!task) {
      throw new Error('NOT_FOUND: Task not found in this workspace.');
    }

    const links = await TaskDocumentModel.findAll({
      where: { workspaceId, taskId },
      include: [{ model: QaDocumentModel, as: 'document' }],
      order: [['createdAt', 'ASC']],
    });

    return links.map(formatTaskDocumentLink);
  }

  async linkDocumentToTask(
    workspaceId: string,
    taskId: string,
    actorId: string,
    documentId: string
  ): Promise<TaskDocumentLink> {
    const member = await getActorMembership(workspaceId, actorId);
    const workspace = await WorkspaceModel.findByPk(workspaceId);
    const task = await TaskModel.findOne({
      where: { id: taskId, workspaceId },
    });

    if (!task) {
      throw new Error('NOT_FOUND: Task not found in this workspace.');
    }

    assertCanLinkQaDocument(
      member.role,
      actorId,
      { parentTaskId: task.parentTaskId, assigneeId: task.assigneeId },
      workspace?.allowQaTaskCreation ?? true
    );

    const doc = await QaDocumentModel.findOne({
      where: { id: documentId, workspaceId },
    });

    if (!doc) {
      throw new Error('BAD_REQUEST: QA Document not found or belongs to a different workspace.');
    }

    const existingLink = await TaskDocumentModel.findOne({
      where: { taskId, documentId },
    });
    if (existingLink) {
      throw new Error('BAD_REQUEST: Document is already linked to this task.');
    }

    return await sequelize.transaction(async (transaction) => {
      const link = await TaskDocumentModel.create(
        {
          workspaceId,
          taskId,
          documentId,
          linkedBy: actorId,
        },
        { transaction }
      );

      // Record Activity audit log in transaction
      await TaskActivityModel.create(
        {
          workspaceId,
          taskId,
          actorId,
          action: 'document_linked',
          metadataJson: {
            documentId: doc.id,
            title: doc.title,
            docType: doc.docType,
            currentVersion: doc.currentVersion,
          },
        },
        { transaction }
      );

      const loaded = await TaskDocumentModel.findByPk(link.id, {
        include: [{ model: QaDocumentModel, as: 'document' }],
        transaction,
      });

      return formatTaskDocumentLink(loaded!);
    });
  }

  async unlinkDocumentFromTask(
    workspaceId: string,
    taskId: string,
    actorId: string,
    documentId: string
  ): Promise<{ success: boolean }> {
    const member = await getActorMembership(workspaceId, actorId);
    const workspace = await WorkspaceModel.findByPk(workspaceId);
    const task = await TaskModel.findOne({
      where: { id: taskId, workspaceId },
    });

    if (!task) {
      throw new Error('NOT_FOUND: Task not found in this workspace.');
    }

    assertCanLinkQaDocument(
      member.role,
      actorId,
      { parentTaskId: task.parentTaskId, assigneeId: task.assigneeId },
      workspace?.allowQaTaskCreation ?? true
    );

    const link = await TaskDocumentModel.findOne({
      where: { taskId, documentId, workspaceId },
      include: [{ model: QaDocumentModel, as: 'document' }],
    });

    if (!link) {
      throw new Error('NOT_FOUND: Document link not found.');
    }

    await sequelize.transaction(async (transaction) => {
      await link.destroy({ transaction });

      // Record Activity audit log in transaction
      await TaskActivityModel.create(
        {
          workspaceId,
          taskId,
          actorId,
          action: 'document_unlinked',
          metadataJson: {
            documentId,
            title: link.document?.title || '',
          },
        },
        { transaction }
      );
    });

    return { success: true };
  }
}

export const qaDocumentService = new QaDocumentService();
