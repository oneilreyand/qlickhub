import { Router } from 'express';
import { authenticate } from '../../http/middleware/authenticate.js';
import { requireWorkspaceMember } from '../../policies/workspacePolicy.js';
import {
  getFolderTree,
  createFolder,
  updateFolder,
  moveFolder,
  archiveFolder,
} from './folderController.js';

// Router with mergeParams so :workspaceId or :projectId from parent router is available
export const folderRoutes = Router({ mergeParams: true });

folderRoutes.use(authenticate);

// Folder Tree listing (requires workspace membership)
folderRoutes.get('/', requireWorkspaceMember(), getFolderTree);
folderRoutes.get('/tree', requireWorkspaceMember(), getFolderTree);

// Folder mutations (requires owner, admin, or po role)
const requireFolderAdmin = requireWorkspaceMember(['owner', 'admin', 'po']);

folderRoutes.post('/', requireFolderAdmin, createFolder);
folderRoutes.patch('/:folderId', requireFolderAdmin, updateFolder);
folderRoutes.put('/:folderId/move', requireFolderAdmin, moveFolder);
folderRoutes.patch('/:folderId/move', requireFolderAdmin, moveFolder);
folderRoutes.post('/:folderId/archive', requireFolderAdmin, archiveFolder);
folderRoutes.delete('/:folderId', requireFolderAdmin, archiveFolder);
