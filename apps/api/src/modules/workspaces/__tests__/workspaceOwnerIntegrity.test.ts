import assert from 'node:assert';
import { after, before, describe, test } from 'node:test';
import { WorkspaceMemberModel } from '../../../db/models/workspaceMember.js';
import { WorkspaceModel } from '../../../db/models/workspace.js';
import { UserModel } from '../../../db/models/user.js';
import { workspaceService } from '../workspaceService.js';

describe('Workspace owner integrity', () => {
  let owner: UserModel;
  let candidate: UserModel;
  let workspace: WorkspaceModel;

  before(async () => {
    owner = await UserModel.create({
      email: `workspace-owner-${Date.now()}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Workspace Owner',
      role: 'admin',
    });
    candidate = await UserModel.create({
      email: `workspace-owner-candidate-${Date.now()}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Owner Candidate',
      role: 'dev',
    });
    workspace = await WorkspaceModel.create({
      name: 'Owner Integrity Workspace',
      slug: `owner-integrity-${Date.now()}`,
      ownerId: owner.id,
    });
    await WorkspaceMemberModel.create({
      workspaceId: workspace.id,
      userId: owner.id,
      role: 'owner',
    });
  });

  after(async () => {
    await WorkspaceModel.destroy({ where: { id: workspace.id }, force: true });
    await UserModel.destroy({ where: { id: [owner.id, candidate.id] }, force: true });
  });

  test('does not demote the canonical workspace owner', async () => {
    await assert.rejects(
      async () => workspaceService.updateMemberRole(workspace.id, owner.id, 'admin'),
      (err: Error) => {
        assert.ok(err.message.includes('workspace owner role cannot be changed'));
        return true;
      }
    );
  });

  test('does not add a second owner outside an ownership transfer', async () => {
    await assert.rejects(
      async () =>
        workspaceService.addWorkspaceMember(workspace.id, {
          email: candidate.email,
          role: 'owner',
        } as any),
      (err: Error) => {
        assert.ok(err.message.includes('Assigning the owner role requires an ownership transfer'));
        return true;
      }
    );
  });
});
