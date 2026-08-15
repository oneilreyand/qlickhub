import { Response } from 'express';
import { AuthenticatedRequest } from '../../http/middleware/authenticate.js';
import { attachmentService } from './attachmentService.js';

function handleError(res: Response, error: unknown) {
  const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
  if (message.startsWith('NOT_FOUND:')) {
    return res.status(404).json({
      type: 'https://api.qa-hub.com/errors/not-found',
      title: 'Not Found',
      status: 404,
      detail: message.replace('NOT_FOUND:', '').trim(),
      code: 'NOT_FOUND',
    });
  }
  if (message.startsWith('FORBIDDEN:')) {
    return res.status(403).json({
      type: 'https://api.qa-hub.com/errors/forbidden',
      title: 'Forbidden',
      status: 403,
      detail: message.replace('FORBIDDEN:', '').trim(),
      code: 'FORBIDDEN',
    });
  }
  return res.status(500).json({
    type: 'https://api.qa-hub.com/errors/internal-error',
    title: 'Internal Server Error',
    status: 500,
    detail: message,
    code: 'INTERNAL_SERVER_ERROR',
  });
}

export const listTaskAttachments = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId, taskId } = req.params;
    const actorId = req.user!.userId;
    const attachments = await attachmentService.listTaskAttachments(workspaceId, taskId, actorId);
    return res.status(200).json({ attachments });
  } catch (error) {
    return handleError(res, error);
  }
};

export const uploadAttachment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId, taskId } = req.params;
    const actorId = req.user!.userId;

    let fileName = (req.headers['x-file-name'] as string) || (req.query.fileName as string);
    if (!fileName && typeof req.body === 'object' && req.body.fileName) {
      fileName = req.body.fileName;
    }

    if (!fileName) {
      fileName = `evidence-${Date.now()}.png`;
    }

    fileName = decodeURIComponent(fileName);

    let buffer: Buffer;
    if (Buffer.isBuffer(req.body)) {
      buffer = req.body;
    } else if (typeof req.body === 'string') {
      buffer = Buffer.from(req.body, 'base64');
    } else if (req.body && typeof req.body === 'object' && req.body.fileBufferBase64) {
      buffer = Buffer.from(req.body.fileBufferBase64, 'base64');
    } else {
      return res.status(400).json({
        type: 'https://api.qa-hub.com/errors/bad-request',
        title: 'Bad Request',
        status: 400,
        detail: 'File content payload is required.',
        code: 'BAD_REQUEST',
      });
    }

    const mimeType = (req.headers['content-type'] as string) || 'application/octet-stream';

    const attachment = await attachmentService.uploadAttachment(workspaceId, taskId, actorId, {
      buffer,
      originalname: fileName,
      mimetype: mimeType.split(';')[0],
      size: buffer.length,
    });

    return res.status(201).json({ attachment });
  } catch (error) {
    return handleError(res, error);
  }
};

export const downloadAttachment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId, taskId, attachmentId } = req.params;
    const actorId = req.user!.userId;

    const { attachment, filePath } = await attachmentService.getAttachmentForDownload(
      workspaceId,
      taskId,
      attachmentId,
      actorId
    );

    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(attachment.fileName)}"`);

    return res.sendFile(filePath);
  } catch (error) {
    return handleError(res, error);
  }
};

export const deleteAttachment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId, taskId, attachmentId } = req.params;
    const actorId = req.user!.userId;

    await attachmentService.deleteAttachment(workspaceId, taskId, attachmentId, actorId);
    return res.status(200).json({ success: true });
  } catch (error) {
    return handleError(res, error);
  }
};
