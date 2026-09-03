import { sequelize } from '../../db/sequelize.js';
import {
  TaskAttachmentModel,
  TaskModel,
  TaskActivityModel,
  TestResultEvidenceModel,
  WorkspaceModel,
} from '../../db/models/index.js';
import { storageService } from '../../services/storageService.js';
import {
  assertCanReadAttachments,
  assertCanUploadAttachment,
  assertCanDeleteAttachment,
} from '../../policies/attachmentPolicy.js';
import { requireActiveMember } from '../../db/repositories/workspaceMemberRepository.js';
import { AttachmentCategory, TaskAttachment } from '@qlick/contracts';

function formatAttachment(a: TaskAttachmentModel): TaskAttachment {
  const json = a.toJSON();
  return {
    id: json.id,
    workspaceId: json.workspaceId,
    taskId: json.taskId,
    fileName: json.fileName,
    fileSize: json.fileSize,
    mimeType: json.mimeType,
    storageProvider: json.storageProvider,
    category: json.category,
    caption: json.caption || null,
    uploaderId: json.uploaderId,
    createdAt: json.createdAt ? new Date(json.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: json.updatedAt ? new Date(json.updatedAt).toISOString() : new Date().toISOString(),
  };
}

export class AttachmentService {
  async listTaskAttachments(
    workspaceId: string,
    taskId: string,
    actorId: string,
  ): Promise<TaskAttachment[]> {
    const member = await requireActiveMember(workspaceId, actorId);
    assertCanReadAttachments(member.role);

    const task = await TaskModel.findOne({
      where: { id: taskId, workspaceId },
    });
    if (!task) {
      throw new Error('NOT_FOUND: Task not found in this workspace.');
    }

    const attachments = await TaskAttachmentModel.findAll({
      where: { workspaceId, taskId },
      order: [['createdAt', 'ASC']],
    });

    return attachments.map(formatAttachment);
  }

  async uploadAttachment(
    workspaceId: string,
    taskId: string,
    actorId: string,
    file: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
      category: AttachmentCategory;
      caption?: string;
    },
  ): Promise<TaskAttachment> {
    const member = await requireActiveMember(workspaceId, actorId);
    const workspace = await WorkspaceModel.findByPk(workspaceId);
    const task = await TaskModel.findOne({
      where: { id: taskId, workspaceId },
    });

    if (!task) {
      throw new Error('NOT_FOUND: Task not found in this workspace.');
    }

    assertCanUploadAttachment(
      member.role,
      actorId,
      { parentTaskId: task.parentTaskId, assigneeId: task.assigneeId },
      workspace?.allowQaTaskCreation ?? true,
    );

    const stored = await storageService.saveFile({
      buffer: file.buffer,
      fileName: file.originalname,
      mimeType: file.mimetype || 'application/octet-stream',
      workspaceId,
      taskId,
    });

    try {
      return await sequelize.transaction(async (transaction) => {
        const attachment = await TaskAttachmentModel.create(
          {
            workspaceId,
            taskId,
            fileName: file.originalname.trim(),
            fileSize: stored.fileSize,
            mimeType: file.mimetype || 'application/octet-stream',
            storageRef: stored.storageRef,
            storageProvider: stored.provider,
            providerFileId: stored.providerFileId,
            category: file.category,
            caption: file.caption || null,
            uploaderId: actorId,
          },
          { transaction },
        );

        await TaskActivityModel.create(
          {
            workspaceId,
            taskId,
            actorId,
            action: 'attachment_created',
            metadataJson: {
              attachmentId: attachment.id,
              fileName: attachment.fileName,
              fileSize: attachment.fileSize,
              mimeType: attachment.mimeType,
              category: attachment.category,
              storageProvider: attachment.storageProvider,
            },
          },
          { transaction },
        );

        return formatAttachment(attachment);
      });
    } catch (error) {
      await storageService.deleteFile({
        provider: stored.provider,
        storageRef: stored.storageRef,
        providerFileId: stored.providerFileId,
      });
      throw error;
    }
  }

  async getAttachmentForDownload(
    workspaceId: string,
    taskId: string,
    attachmentId: string,
    actorId: string,
  ): Promise<{ attachment: TaskAttachment; stream: import('node:stream').Readable }> {
    const member = await requireActiveMember(workspaceId, actorId);
    assertCanReadAttachments(member.role);

    const attachment = await TaskAttachmentModel.findOne({
      where: { id: attachmentId, workspaceId, taskId },
    });

    if (!attachment) {
      throw new Error('NOT_FOUND: Attachment evidence not found.');
    }

    const stream = await storageService.openFile({
      provider: attachment.storageProvider,
      storageRef: attachment.storageRef,
      providerFileId: attachment.providerFileId,
    });

    return {
      attachment: formatAttachment(attachment),
      stream,
    };
  }

  async deleteAttachment(
    workspaceId: string,
    taskId: string,
    attachmentId: string,
    actorId: string,
  ): Promise<{ success: boolean; storageCleanupPending: boolean }> {
    const member = await requireActiveMember(workspaceId, actorId);
    const storageTarget = await sequelize.transaction(async (transaction) => {
      const attachment = await TaskAttachmentModel.findOne({
        where: { id: attachmentId, workspaceId, taskId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!attachment) {
        throw new Error('NOT_FOUND: Attachment evidence not found.');
      }

      const evidenceLink = await TestResultEvidenceModel.findOne({
        where: { workspaceId, attachmentId },
        attributes: ['attachmentId'],
        transaction,
      });

      assertCanDeleteAttachment(member.role, actorId, {
        uploaderId: attachment.uploaderId,
        category: attachment.category,
        isLinkedToTestResult: Boolean(evidenceLink),
      });

      await attachment.destroy({ transaction });

      await TaskActivityModel.create(
        {
          workspaceId,
          taskId,
          actorId,
          action: 'attachment_deleted',
          metadataJson: {
            attachmentId,
            fileName: attachment.fileName,
            category: attachment.category,
          },
        },
        { transaction },
      );

      return {
        provider: attachment.storageProvider,
        storageRef: attachment.storageRef,
        providerFileId: attachment.providerFileId,
      };
    });

    let storageCleanupPending = false;
    try {
      await storageService.deleteFile(storageTarget);
    } catch (error) {
      storageCleanupPending = true;
      console.error('Attachment metadata deleted but storage cleanup is pending.', {
        workspaceId,
        taskId,
        attachmentId,
        provider: storageTarget.provider,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return { success: true, storageCleanupPending };
  }
}

export const attachmentService = new AttachmentService();
