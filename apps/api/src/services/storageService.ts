import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Readable } from 'node:stream';
import { google, drive_v3 } from 'googleapis';
import { env } from '../config/env.js';

const STORAGE_BASE_DIR = path.resolve(process.cwd(), 'data', 'evidence_storage');

export type AttachmentStorageProvider = 'local' | 'google_drive';

export interface StoreAttachmentInput {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  workspaceId: string;
  taskId: string;
}

export interface StoredAttachment {
  storageRef: string;
  provider: AttachmentStorageProvider;
  providerFileId: string | null;
  fileSize: number;
}

interface AttachmentStorageAdapter {
  readonly provider: AttachmentStorageProvider;
  store(input: StoreAttachmentInput): Promise<StoredAttachment>;
  open(storageRef: string, providerFileId: string | null): Promise<Readable>;
  delete(storageRef: string, providerFileId: string | null): Promise<void>;
}

class LocalAttachmentStorageAdapter implements AttachmentStorageAdapter {
  readonly provider = 'local' as const;

  private ensureStorageDir(dirPath: string) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  async store(input: StoreAttachmentInput): Promise<StoredAttachment> {
    const safeWorkspaceId = input.workspaceId.replace(/[^a-zA-Z0-9-]/g, '');
    const safeTaskId = input.taskId.replace(/[^a-zA-Z0-9-]/g, '');
    const targetDir = path.join(STORAGE_BASE_DIR, safeWorkspaceId, safeTaskId);
    this.ensureStorageDir(targetDir);

    const ext = path.extname(input.fileName).toLowerCase();
    const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    const fullPath = path.join(targetDir, uniqueName);
    await fs.promises.writeFile(fullPath, input.buffer);

    return {
      storageRef: path.join(safeWorkspaceId, safeTaskId, uniqueName),
      provider: this.provider,
      providerFileId: null,
      fileSize: input.buffer.length,
    };
  }

  async open(storageRef: string): Promise<Readable> {
    const filePath = this.getFilePath(storageRef);
    return fs.createReadStream(filePath);
  }

  async delete(storageRef: string): Promise<void> {
    try {
      const filePath = this.getFilePath(storageRef);
      await fs.promises.unlink(filePath);
    } catch {
      // Deletion is idempotent. A removed local file must not block record cleanup.
    }
  }

  private getFilePath(storageRef: string): string {
    const sanitizedRef = path.normalize(storageRef).replace(/^([.][.][/\\])+/, '');
    const fullPath = path.resolve(STORAGE_BASE_DIR, sanitizedRef);
    const relativePath = path.relative(STORAGE_BASE_DIR, fullPath);

    if (
      relativePath === '..' ||
      relativePath.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relativePath)
    ) {
      throw new Error('FORBIDDEN: Invalid file storage reference.');
    }
    if (!fs.existsSync(fullPath)) {
      throw new Error('NOT_FOUND: File not found in storage.');
    }
    return fullPath;
  }
}

class GoogleDriveAttachmentStorageAdapter implements AttachmentStorageAdapter {
  readonly provider = 'google_drive' as const;
  private readonly drive: drive_v3.Drive;
  private readonly rootFolderId: string;
  private readonly workspaceFolderIds = new Map<string, string>();

  constructor() {
    if (!env.GOOGLE_DRIVE_ROOT_FOLDER_ID) {
      throw new Error(
        'GOOGLE_DRIVE_ROOT_FOLDER_ID is required for Google Drive attachment storage.',
      );
    }

    let credentials: Record<string, unknown> | undefined;
    if (env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON) {
      try {
        credentials = JSON.parse(env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON) as Record<string, unknown>;
      } catch {
        throw new Error('GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON must contain valid JSON.');
      }
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    this.drive = google.drive({ version: 'v3', auth });
    this.rootFolderId = env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  }

  async store(input: StoreAttachmentInput): Promise<StoredAttachment> {
    const parentFolderId = await this.getWorkspaceFolderId(input.workspaceId);
    const name = `${input.taskId}-${input.fileName}`;
    const result = await this.drive.files.create({
      requestBody: {
        name,
        mimeType: input.mimeType,
        parents: [parentFolderId],
      },
      media: {
        mimeType: input.mimeType,
        body: Readable.from(input.buffer),
      },
      fields: 'id,size',
      supportsAllDrives: true,
    });

    const fileId = result.data.id;
    if (!fileId) {
      throw new Error('Google Drive did not return a file identifier.');
    }

    return {
      storageRef: fileId,
      provider: this.provider,
      providerFileId: fileId,
      fileSize: Number(result.data.size || input.buffer.length),
    };
  }

  async open(storageRef: string, providerFileId: string | null): Promise<Readable> {
    const fileId = providerFileId || storageRef;
    const result = await this.drive.files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'stream' },
    );
    return result.data as unknown as Readable;
  }

  async delete(storageRef: string, providerFileId: string | null): Promise<void> {
    const fileId = providerFileId || storageRef;
    try {
      await this.drive.files.update({
        fileId,
        requestBody: { trashed: true },
        fields: 'id,trashed',
        supportsAllDrives: true,
      });
    } catch (error: any) {
      if (error?.code !== 404) throw error;
    }
  }

  private async getWorkspaceFolderId(workspaceId: string): Promise<string> {
    const cached = this.workspaceFolderIds.get(workspaceId);
    if (cached) return cached;

    const folderName = `workspace-${workspaceId}`;
    const query = [
      `name = '${folderName.replace(/'/g, "\\'")}'`,
      `mimeType = 'application/vnd.google-apps.folder'`,
      `'${this.rootFolderId}' in parents`,
      'trashed = false',
    ].join(' and ');

    const existing = await this.drive.files.list({
      q: query,
      pageSize: 1,
      fields: 'files(id)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    const existingFolderId = existing.data.files?.[0]?.id;
    if (existingFolderId) {
      this.workspaceFolderIds.set(workspaceId, existingFolderId);
      return existingFolderId;
    }

    const created = await this.drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [this.rootFolderId],
      },
      fields: 'id',
      supportsAllDrives: true,
    });
    const folderId = created.data.id;
    if (!folderId) {
      throw new Error('Google Drive did not return a workspace folder identifier.');
    }
    this.workspaceFolderIds.set(workspaceId, folderId);
    return folderId;
  }
}

export class StorageService {
  private readonly adapters: Map<AttachmentStorageProvider, AttachmentStorageAdapter>;
  private readonly activeProvider: AttachmentStorageProvider;

  constructor() {
    this.activeProvider = env.ATTACHMENT_STORAGE_PROVIDER as AttachmentStorageProvider;
    this.adapters = new Map<AttachmentStorageProvider, AttachmentStorageAdapter>([
      ['local', new LocalAttachmentStorageAdapter()],
    ]);
    if (this.activeProvider === 'google_drive') {
      this.adapters.set('google_drive', new GoogleDriveAttachmentStorageAdapter());
    }
  }

  async saveFile(input: StoreAttachmentInput): Promise<StoredAttachment> {
    return this.getAdapter(this.activeProvider).store(input);
  }

  async openFile(input: {
    provider: AttachmentStorageProvider;
    storageRef: string;
    providerFileId: string | null;
  }): Promise<Readable> {
    return this.getAdapter(input.provider).open(input.storageRef, input.providerFileId);
  }

  async deleteFile(input: {
    provider: AttachmentStorageProvider;
    storageRef: string;
    providerFileId: string | null;
  }): Promise<void> {
    await this.getAdapter(input.provider).delete(input.storageRef, input.providerFileId);
  }

  private getAdapter(provider: AttachmentStorageProvider): AttachmentStorageAdapter {
    const adapter = this.adapters.get(provider);
    if (!adapter) {
      throw new Error(`Storage provider '${provider}' is not configured on this server.`);
    }
    return adapter;
  }
}

export const storageService = new StorageService();
