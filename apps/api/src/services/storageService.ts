import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const STORAGE_BASE_DIR = path.resolve(process.cwd(), 'data', 'evidence_storage');

export class StorageService {
  private ensureStorageDir(dirPath: string) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  async saveFile(
    buffer: Buffer,
    fileName: string,
    workspaceId: string,
    taskId: string
  ): Promise<{ storageRef: string; fileSize: number }> {
    const safeWorkspaceId = workspaceId.replace(/[^a-zA-Z0-9-]/g, '');
    const safeTaskId = taskId.replace(/[^a-zA-Z0-9-]/g, '');
    const targetDir = path.join(STORAGE_BASE_DIR, safeWorkspaceId, safeTaskId);
    this.ensureStorageDir(targetDir);

    const ext = path.extname(fileName).toLowerCase();
    const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    const fullPath = path.join(targetDir, uniqueName);

    await fs.promises.writeFile(fullPath, buffer);

    const relativeRef = path.join(safeWorkspaceId, safeTaskId, uniqueName);
    return {
      storageRef: relativeRef,
      fileSize: buffer.length,
    };
  }

  getFilePath(storageRef: string): string {
    const sanitizedRef = path.normalize(storageRef).replace(/^(\.\.[\/\\])+/, '');
    const fullPath = path.join(STORAGE_BASE_DIR, sanitizedRef);

    if (!fullPath.startsWith(STORAGE_BASE_DIR)) {
      throw new Error('FORBIDDEN: Invalid file storage reference.');
    }

    if (!fs.existsSync(fullPath)) {
      throw new Error('NOT_FOUND: File not found in storage.');
    }

    return fullPath;
  }

  async deleteFile(storageRef: string): Promise<void> {
    try {
      const fullPath = this.getFilePath(storageRef);
      if (fs.existsSync(fullPath)) {
        await fs.promises.unlink(fullPath);
      }
    } catch {
      // Ignore if file was already deleted
    }
  }
}

export const storageService = new StorageService();
