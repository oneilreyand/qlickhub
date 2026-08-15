import { sequelize } from '../../db/sequelize.js';
import {
  TaskAttachmentModel,
  TaskModel,
  TaskActivityModel,
  WorkspaceMemberModel,
  WorkspaceModel,
} from '../../db/models/index.js';
import { storageService } from '../../services/storageService.js';
import {
  assertCanReadAttachments,
  assertCanUploadAttachment,
  assertCanDeleteAttachment,
} from '../../policies/attachmentPolicy.js';
import { TaskAttachment } from '@qa/contracts';

function formatAttachment(a: TaskAttachmentModel): TaskAttachment {
  const json = a.toJSON();
  return {
    id: json.id,
    workspaceId: json.workspaceId,
    taskId: json.taskId,
    fileName: json.fileName,
    fileSize: json.fileSize,
    mimeType: json.mimeType,
    storageRef: json.storageRef,
    uploaderId: json.uploaderId,
    createdAt: json.createdAt ? new Date(json.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: json.updatedAt ? new Date(json.updatedAt).toISOString() : new Date().toISOString(),
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

export class AttachmentService {
  async listTaskAttachments(
    workspaceId: string,
    taskId: string,
    actorId: string
  ): Promise<TaskAttachment[]> {
    const member = await getActorMembership(workspaceId, actorId);
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
    }
  ): Promise<TaskAttachment> {
    const member = await getActorMembership(workspaceId, actorId);
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
      workspace?.allowQaTaskCreation ?? true
    );

    const { storageRef, fileSize } = await storageService.saveFile(
      file.buffer,
      file.originalname,
      workspaceId,
      taskId
    );

    return await sequelize.transaction(async (transaction) => {
      const attachment = await TaskAttachmentModel.create(
        {
          workspaceId,
          taskId,
          fileName: file.originalname.trim(),
          fileSize,
          mimeType: file.mimetype || 'application/octet-stream',
          storageRef,
          uploaderId: actorId,
        },
        { transaction }
      );

      // Record Activity audit log in transaction
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
          },
        },
        { transaction }
      );

      return formatAttachment(attachment);
    });
  }

  async getAttachmentForDownload(
    workspaceId: string,
    taskId: string,
    attachmentId: string,
    actorId: string
  ): Promise<{ attachment: TaskAttachment; filePath: string }> {
    const member = await getActorMembership(workspaceId, actorId);
    assertCanReadAttachments(member.role);

    const attachment = await TaskAttachmentModel.findOne({
      where: { id: attachmentId, workspaceId, taskId },
    });

    if (!attachment) {
      throw new Error('NOT_FOUND: Attachment evidence not found.');
    }

    const filePath = storageService.getFilePath(attachment.storageRef);

    return {
      attachment: formatAttachment(attachment),
      filePath,
    };
  }

  async deleteAttachment(
    workspaceId: string,
    taskId: string,
    attachmentId: string,
    actorId: string
  ): Promise<{ success: boolean }> {
    const member = await getActorMembership(workspaceId, actorId);
    const attachment = await TaskAttachmentModel.findOne({
      where: { id: attachmentId, workspaceId, taskId },
    });

    if (!attachment) {
      throw new Error('NOT_FOUND: Attachment evidence not found.');
    }

    assertCanDeleteAttachment(member.role, actorId, { uploaderId: attachment.uploaderId });

    await sequelize.transaction(async (transaction) => {
      await attachment.destroy({ transaction });

      // Record Activity audit log in transaction
      await TaskActivityModel.create(
        {
          workspaceId,
          taskId,
          actorId,
          action: 'attachment_deleted',
          metadataJson: {
            attachmentId,
            fileName: attachment.fileName,
          },
        },
        { transaction }
      );
    });

    await storageService.deleteFile(attachment.storageRef);
    return { success: true };
  }
}

export const attachmentService = new AttachmentService();
