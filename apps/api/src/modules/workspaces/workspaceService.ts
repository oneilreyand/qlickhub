import {
  AddWorkspaceMemberInput,
  AssignableWorkspaceRole,
  CreateWorkspaceInput,
  UpdateMemberRoleInput,
  UpdateWorkspaceInput,
  WorkspaceActivityQuery,
  WorkspaceActivityListResponse,
} from '@qlick/contracts';
import {
  createWorkspace,
  getUserWorkspaces,
  getWorkspaceById,
  setWorkspaceArchived,
  updateWorkspace,
} from './internal/workspaceLifecycle.js';
import {
  getWorkspaceMembers,
  addWorkspaceMember,
  updateMemberRole,
  removeWorkspaceMember,
} from './internal/workspaceMembership.js';
import {
  listTaskCreationPermissions,
  grantTaskCreationPermission,
  revokeTaskCreationPermission,
} from './internal/workspacePermissions.js';
import { listWorkspaceActivities } from './internal/workspaceActivity.js';

export class WorkspaceService {
  async createWorkspace(userId: string, input: CreateWorkspaceInput) {
    return createWorkspace(userId, input);
  }

  async getUserWorkspaces(userId: string) {
    return getUserWorkspaces(userId);
  }

  async getWorkspaceById(workspaceId: string, userId: string) {
    return getWorkspaceById(workspaceId, userId);
  }

  async setWorkspaceArchived(workspaceId: string, actorId: string, archived: boolean) {
    return setWorkspaceArchived(workspaceId, actorId, archived);
  }

  async updateWorkspace(workspaceId: string, input: UpdateWorkspaceInput) {
    return updateWorkspace(workspaceId, input);
  }

  async getWorkspaceMembers(workspaceId: string) {
    return getWorkspaceMembers(workspaceId);
  }

  async addWorkspaceMember(workspaceId: string, input: AddWorkspaceMemberInput, actorId?: string) {
    return addWorkspaceMember(workspaceId, input, actorId);
  }

  async updateMemberRole(
    workspaceId: string,
    targetUserId: string,
    input: AssignableWorkspaceRole | UpdateMemberRoleInput,
    actorId?: string,
  ) {
    return updateMemberRole(workspaceId, targetUserId, input, actorId);
  }

  async removeWorkspaceMember(workspaceId: string, targetUserId: string, actorId: string) {
    return removeWorkspaceMember(workspaceId, targetUserId, actorId);
  }

  async listTaskCreationPermissions(workspaceId: string) {
    return listTaskCreationPermissions(workspaceId);
  }

  async grantTaskCreationPermission(
    workspaceId: string,
    grantedBy: string,
    input: { userId: string; expiresAt?: string | null },
  ) {
    return grantTaskCreationPermission(workspaceId, grantedBy, input);
  }

  async revokeTaskCreationPermission(workspaceId: string, targetUserId: string) {
    return revokeTaskCreationPermission(workspaceId, targetUserId);
  }

  async listWorkspaceActivities(
    workspaceId: string,
    query: WorkspaceActivityQuery,
    actorId: string,
  ): Promise<WorkspaceActivityListResponse> {
    return listWorkspaceActivities(workspaceId, query, actorId);
  }
}

export const workspaceService = new WorkspaceService();
