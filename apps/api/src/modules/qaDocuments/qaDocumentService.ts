import { sequelize } from '../../db/sequelize.js';
import {
  QaDocumentModel,
  QaDocumentVersionModel,
  TaskDocumentModel,
  TaskModel,
  TaskActivityModel,
  WorkFolderModel,
  WorkspaceMemberModel,
} from '../../db/models/index.js';
import {
  assertCanReadQaDocuments,
  assertCanCreateQaDocument,
  assertCanLinkQaDocument,
  assertCanManageProductBrief,
} from '../../policies/qaDocumentPolicy.js';
import {
  QaDocument,
  QaDocumentVersion,
  CreateQaDocumentInput,
  CreateQaDocumentVersionInput,
  TaskDocumentLink,
  ProductBrief,
  ProductBriefScopeItem,
  UpsertProductBriefInput,
} from '@qlick/contracts';
import { randomUUID } from 'node:crypto';

function formatDocument(d: QaDocumentModel | Record<string, any>): QaDocument {
  const json = typeof (d as any).toJSON === 'function' ? (d as any).toJSON() : d;
  return {
    id: json.id,
    workspaceId: json.workspaceId,
    folderId: json.folderId || null,
    title: json.title,
    docType: json.docType,
    status: json.status || 'draft',
    ownerId: json.ownerId || null,
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
    inScope: Array.isArray(json.inScope) ? json.inScope : [],
    outScope: Array.isArray(json.outScope) ? json.outScope : [],
    acceptanceCriteria: Array.isArray(json.acceptanceCriteria) ? json.acceptanceCriteria : [],
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
    linkType: json.linkType || 'reference',
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

function normalizeScopeItems(
  items: Array<{ id?: string; text: string; position: number }> | undefined
): ProductBriefScopeItem[] {
  return (items || []).map((item, index) => ({
    id: item.id || randomUUID(),
    text: item.text.trim(),
    position: item.position ?? index,
  }));
}

async function assertOwnerIsWorkspaceMember(workspaceId: string, ownerId: string): Promise<void> {
  const ownerMembership = await WorkspaceMemberModel.findOne({
    where: { workspaceId, userId: ownerId },
  });
  if (!ownerMembership) {
    throw new Error('BAD_REQUEST: Product Brief owner must be a member of this workspace.');
  }
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
    if (input.docType === 'product_brief') {
      throw new Error('BAD_REQUEST: Create a Product Brief through its task endpoint.');
    }
    const ownerId = input.ownerId || actorId;
    await assertOwnerIsWorkspaceMember(workspaceId, ownerId);

    return await sequelize.transaction(async (transaction) => {
      if (input.folderId) {
        const folder = await WorkFolderModel.findOne({
          where: { id: input.folderId, workspaceId },
          transaction,
        });

        if (!folder) {
          throw new Error('BAD_REQUEST: QA Document folder was not found in this workspace.');
        }
      }

      const doc = await QaDocumentModel.create(
        {
          workspaceId,
          folderId: input.folderId || null,
          title: input.title.trim(),
          docType: input.docType || 'test_plan',
          status: input.status || 'draft',
          ownerId,
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
          inScope: normalizeScopeItems(input.inScope),
          outScope: normalizeScopeItems(input.outScope),
          acceptanceCriteria: normalizeScopeItems(input.acceptanceCriteria),
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
      if (doc.docType === 'product_brief') {
        assertCanManageProductBrief(member.role);
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
          inScope: normalizeScopeItems(input.inScope),
          outScope: normalizeScopeItems(input.outScope),
          acceptanceCriteria: normalizeScopeItems(input.acceptanceCriteria),
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

  async getProductBrief(
    workspaceId: string,
    taskId: string,
    actorId: string
  ): Promise<ProductBrief | null> {
    const member = await getActorMembership(workspaceId, actorId);
    assertCanReadQaDocuments(member.role);

    const task = await TaskModel.findOne({ where: { id: taskId, workspaceId } });
    if (!task) {
      throw new Error('NOT_FOUND: Task not found in this workspace.');
    }

    const link = await TaskDocumentModel.findOne({
      where: { workspaceId, taskId, linkType: 'primary_prd' },
      include: [{ model: QaDocumentModel, as: 'document' }],
    });
    if (!link?.document) return null;

    const document = link.document as QaDocumentModel;
    if (document.docType !== 'product_brief') {
      throw new Error('BAD_REQUEST: The primary Product Brief link is invalid.');
    }

    const currentVersion = await QaDocumentVersionModel.findOne({
      where: {
        workspaceId,
        documentId: document.id,
        version: document.currentVersion,
      },
    });
    if (!currentVersion) {
      throw new Error('NOT_FOUND: Current Product Brief version was not found.');
    }

    return {
      document: formatDocument(document),
      currentVersion: formatVersion(currentVersion),
    };
  }

  async upsertProductBrief(
    workspaceId: string,
    taskId: string,
    actorId: string,
    input: Omit<UpsertProductBriefInput, 'workspaceId' | 'taskId'>
  ): Promise<ProductBrief> {
    const member = await getActorMembership(workspaceId, actorId);
    assertCanManageProductBrief(member.role);

    const task = await TaskModel.findOne({ where: { id: taskId, workspaceId } });
    if (!task) {
      throw new Error('NOT_FOUND: Task not found in this workspace.');
    }

    const ownerId = input.ownerId || task.reporterId || actorId;
    await assertOwnerIsWorkspaceMember(workspaceId, ownerId);
    const inScope = normalizeScopeItems(input.inScope);
    const outScope = normalizeScopeItems(input.outScope);
    const acceptanceCriteria = normalizeScopeItems(input.acceptanceCriteria);

    return sequelize.transaction(async (transaction) => {
      const existingLink = await TaskDocumentModel.findOne({
        where: { workspaceId, taskId, linkType: 'primary_prd' },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      const isNew = !existingLink;
      let document: QaDocumentModel;
      let versionNumber: number;
      let previousStatus: string | null = null;

      if (existingLink) {
        document = await QaDocumentModel.findOne({
          where: { id: existingLink.documentId, workspaceId, docType: 'product_brief' },
          transaction,
          lock: transaction.LOCK.UPDATE,
        }) as QaDocumentModel;
        if (!document) {
          throw new Error('BAD_REQUEST: The primary Product Brief link is invalid.');
        }

        previousStatus = document.status;
        versionNumber = document.currentVersion + 1;
        document.title = input.title.trim();
        document.ownerId = document.ownerId || ownerId;
        document.status = input.status;
        document.currentVersion = versionNumber;
        await document.save({ transaction });
      } else {
        document = await QaDocumentModel.create(
          {
            workspaceId,
            title: input.title.trim(),
            docType: 'product_brief',
            status: input.status,
            ownerId,
            currentVersion: 1,
            createdBy: actorId,
          },
          { transaction }
        );
        versionNumber = 1;

        await TaskDocumentModel.create(
          {
            workspaceId,
            taskId,
            documentId: document.id,
            linkType: 'primary_prd',
            linkedBy: actorId,
          },
          { transaction }
        );
      }

      const version = await QaDocumentVersionModel.create(
        {
          workspaceId,
          documentId: document.id,
          version: versionNumber,
          title: document.title,
          contentMarkdown: input.contentMarkdown,
          inScope,
          outScope,
          acceptanceCriteria,
          changelog: input.changelog || (isNew ? 'Initial Product Brief created' : `Updated to version ${versionNumber}`),
          createdBy: actorId,
        },
        { transaction }
      );

      const action = isNew
        ? 'product_brief_created'
        : previousStatus !== input.status && input.status === 'approved'
          ? 'product_brief_approved'
          : 'product_brief_version_created';

      await TaskActivityModel.create(
        {
          workspaceId,
          taskId,
          actorId,
          action,
          metadataJson: {
            documentId: document.id,
            version: version.version,
            title: document.title,
            status: document.status,
            inScopeCount: inScope.length,
            outScopeCount: outScope.length,
            acceptanceCriteriaCount: acceptanceCriteria.length,
          },
        },
        { transaction }
      );

      return {
        document: formatDocument(document),
        currentVersion: formatVersion(version),
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
    const task = await TaskModel.findOne({
      where: { id: taskId, workspaceId },
    });

    if (!task) {
      throw new Error('NOT_FOUND: Task not found in this workspace.');
    }

    assertCanLinkQaDocument(
      member.role,
      actorId,
      { parentTaskId: task.parentTaskId, assigneeId: task.assigneeId }
    );

    const doc = await QaDocumentModel.findOne({
      where: { id: documentId, workspaceId },
    });

    if (!doc) {
      throw new Error('BAD_REQUEST: QA Document not found or belongs to a different workspace.');
    }
    if (doc.docType === 'product_brief') {
      throw new Error('BAD_REQUEST: Product Briefs are managed through their task endpoint.');
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
    const task = await TaskModel.findOne({
      where: { id: taskId, workspaceId },
    });

    if (!task) {
      throw new Error('NOT_FOUND: Task not found in this workspace.');
    }

    assertCanLinkQaDocument(
      member.role,
      actorId,
      { parentTaskId: task.parentTaskId, assigneeId: task.assigneeId }
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
