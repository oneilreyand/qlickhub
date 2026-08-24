import assert from 'node:assert';
import { after, before, describe, test } from 'node:test';
import { UserModel } from '../../../db/models/user.js';
import { WorkspaceModel } from '../../../db/models/workspace.js';
import { workspaceService } from '../workspaceService.js';

describe('Workspace creation authorization', () => {
  let qaUser: UserModel;

  before(async () => {
    qaUser = await UserModel.create({
      email: `workspace-creation-qa-${Date.now()}@example.com`,
      passwordHash: 'hash',
      name: 'Workspace Creation QA',
      role: 'qa',
    });
  });

  after(async () => {
    if (!qaUser) return;
    await WorkspaceModel.destroy({ where: { ownerId: qaUser.id }, force: true });
    await UserModel.destroy({ where: { id: qaUser.id }, force: true });
  });

  test('QA cannot create a Workspace through the service authorization boundary', async () => {
    await assert.rejects(
      () =>
        workspaceService.createWorkspace(qaUser.id, {
          name: 'QA must not create this Workspace',
        }),
      (error: Error) => {
        assert.match(error.message, /Only workspace owners, admins, and product owners/);
        return true;
      },
    );

    const persistedWorkspace = await WorkspaceModel.findOne({ where: { ownerId: qaUser.id } });
    assert.strictEqual(persistedWorkspace, null);
  });
});
