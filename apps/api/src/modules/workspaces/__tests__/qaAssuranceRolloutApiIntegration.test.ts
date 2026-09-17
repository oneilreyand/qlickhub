import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import {
  QaAssuranceRolloutEventModel,
  QaAssuranceRolloutSettingsModel,
  UserModel,
  WorkspaceMemberModel,
  WorkspaceModel,
} from '../../../db/models/index.js';
import { workspaceService } from '../workspaceService.js';

describe('QA assurance Workspace rollout controls', () => {
  let workspaceId: string;
  let ownerId: string;
  let adminId: string;
  let poId: string;
  let developerId: string;
  let qaId: string;

  before(async () => {
    const timestamp = Date.now();
    const [owner, admin, po, developer, qa] = await Promise.all([
      UserModel.create({
        email: `rollout-owner-${timestamp}@test.com`,
        name: 'Rollout Owner',
        role: 'owner',
        passwordHash: 'dummy',
      }),
      UserModel.create({
        email: `rollout-admin-${timestamp}@test.com`,
        name: 'Rollout Admin',
        role: 'admin',
        passwordHash: 'dummy',
      }),
      UserModel.create({
        email: `rollout-po-${timestamp}@test.com`,
        name: 'Rollout PO',
        role: 'po',
        passwordHash: 'dummy',
      }),
      UserModel.create({
        email: `rollout-dev-${timestamp}@test.com`,
        name: 'Rollout Developer',
        role: 'dev',
        passwordHash: 'dummy',
      }),
      UserModel.create({
        email: `rollout-qa-${timestamp}@test.com`,
        name: 'Rollout QA',
        role: 'qa',
        passwordHash: 'dummy',
      }),
    ]);
    const workspace = await WorkspaceModel.create({
      name: 'QA Rollout Workspace',
      slug: `qa-rollout-${timestamp}`,
      ownerId: owner.id,
    });
    await WorkspaceMemberModel.bulkCreate([
      { workspaceId: workspace.id, userId: owner.id, role: 'owner' },
      { workspaceId: workspace.id, userId: admin.id, role: 'admin' },
      { workspaceId: workspace.id, userId: po.id, role: 'po' },
      { workspaceId: workspace.id, userId: developer.id, role: 'dev' },
      { workspaceId: workspace.id, userId: qa.id, role: 'qa' },
    ]);
    await QaAssuranceRolloutSettingsModel.create({
      workspaceId: workspace.id,
      mode: 'observe',
      updatedBy: owner.id,
    });
    workspaceId = workspace.id;
    ownerId = owner.id;
    adminId = admin.id;
    poId = po.id;
    developerId = developer.id;
    qaId = qa.id;
  });

  test('allows active Workspace members to read the persisted observe default', async () => {
    const settings = await workspaceService.getQaAssuranceRollout(workspaceId, poId);
    assert.equal(settings.mode, 'observe');
    assert.equal(settings.workspaceId, workspaceId);
  });

  test('records an Owner rollout change with an append-only audit event', async () => {
    const updated = await workspaceService.updateQaAssuranceRollout(workspaceId, ownerId, {
      mode: 'warn',
      reason: 'Approved warning-mode pilot for the QA assurance workflow.',
    });
    assert.equal(updated.mode, 'warn');
    assert.equal(updated.updatedBy, ownerId);

    const event = await QaAssuranceRolloutEventModel.findOne({
      where: { workspaceId, fromMode: 'observe', toMode: 'warn', changedBy: ownerId },
    });
    assert.ok(event);
  });

  test('allows an Admin to progress the mode and does not duplicate a no-op change', async () => {
    const changed = await workspaceService.updateQaAssuranceRollout(workspaceId, adminId, {
      mode: 'enforce',
      reason: 'Approved enforcement after the cross-role pilot evidence review.',
    });
    assert.equal(changed.mode, 'enforce');
    const eventCount = await QaAssuranceRolloutEventModel.count({ where: { workspaceId } });

    const unchanged = await workspaceService.updateQaAssuranceRollout(workspaceId, adminId, {
      mode: 'enforce',
      reason: 'No-op confirmation for the same approved enforcement mode.',
    });
    assert.equal(unchanged.mode, 'enforce');
    assert.equal(await QaAssuranceRolloutEventModel.count({ where: { workspaceId } }), eventCount);
  });

  test('rejects PO, Developer, and QA mutations without changing the persisted mode', async () => {
    await Promise.all(
      [poId, developerId, qaId].map((actorId) =>
        assert.rejects(
          workspaceService.updateQaAssuranceRollout(workspaceId, actorId, {
            mode: 'observe',
            reason: 'Non-governance roles cannot disable the approved rollout mode.',
          }),
          /FORBIDDEN/,
        ),
      ),
    );
    const settings = await workspaceService.getQaAssuranceRollout(workspaceId, ownerId);
    assert.equal(settings.mode, 'enforce');
  });
});
