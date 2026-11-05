import assert from 'node:assert';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { sequelize } from '../../../db/sequelize.js';
import { RequirementModel, UserModel, WorkspaceModel } from '../../../db/models/index.js';
import { formatRequirementCode } from '../requirementCodes.js';

const require = createRequire(import.meta.url);
const migrationFile = '20261105000095-shorten-applied-requirement-codes.cjs';
const migrationPath = [
  path.resolve(process.cwd(), 'src/db/migrations', migrationFile),
  path.resolve(process.cwd(), 'apps/api/src/db/migrations', migrationFile),
].find((candidate) => fs.existsSync(candidate));
if (!migrationPath) throw new Error(`Migration ${migrationFile} not found.`);
const migration = require(migrationPath) as {
  up: (queryInterface: unknown) => Promise<void>;
  down: (queryInterface: unknown) => Promise<void>;
};

describe('Requirement short code migration (E2E-SDLC-FLOW P5, K4)', () => {
  let owner: UserModel;
  let workspace: WorkspaceModel;
  let otherWorkspace: WorkspaceModel;

  before(async () => {
    const stamp = Date.now();
    owner = await UserModel.create({
      email: `req_code_mig_${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Requirement Code Owner',
      role: 'owner',
    });
    workspace = await WorkspaceModel.create({
      name: 'Requirement Codes',
      slug: `req-codes-${stamp}`,
      ownerId: owner.id,
    });
    otherWorkspace = await WorkspaceModel.create({
      name: 'Requirement Codes Other',
      slug: `req-codes-other-${stamp}`,
      ownerId: owner.id,
    });
  });

  after(async () => {
    for (const ws of [workspace, otherWorkspace]) {
      if (!ws) continue;
      await RequirementModel.destroy({ where: { workspaceId: ws.id } });
      await WorkspaceModel.destroy({ where: { id: ws.id } });
    }
    if (owner) await UserModel.destroy({ where: { id: owner.id } });
  });

  test('renames UUID codes after the highest numeric code, per Workspace, and can be undone', async () => {
    const make = (workspaceId: string, code: string, createdAt: string) =>
      RequirementModel.create({
        workspaceId,
        code,
        title: code,
        createdBy: owner.id,
        createdAt: new Date(createdAt),
      } as never);
    const firstUuid = `REQ-${randomUUID()}`;
    const secondUuid = `REQ-${randomUUID()}`;
    const otherUuid = `REQ-${randomUUID()}`;
    const first = await make(workspace.id, firstUuid, '2026-10-01T00:00:00Z');
    const second = await make(workspace.id, secondUuid, '2026-10-02T00:00:00Z');
    await make(workspace.id, 'REQ-004', '2026-09-01T00:00:00Z');
    const manual = await make(workspace.id, 'CHECKOUT-01', '2026-09-02T00:00:00Z');
    const other = await make(otherWorkspace.id, otherUuid, '2026-10-01T00:00:00Z');

    const queryInterface = sequelize.getQueryInterface();
    await migration.down(queryInterface);
    await migration.up(queryInterface);

    const codeOf = async (id: string) => (await RequirementModel.findByPk(id))?.code;
    assert.strictEqual(await codeOf(first.id), 'REQ-005');
    assert.strictEqual(await codeOf(second.id), 'REQ-006');
    assert.strictEqual(await codeOf(manual.id), 'CHECKOUT-01');
    assert.strictEqual(await codeOf(other.id), 'REQ-001');

    await migration.down(queryInterface);
    assert.strictEqual(await codeOf(first.id), firstUuid);
    assert.strictEqual(await codeOf(other.id), otherUuid);
    await migration.up(queryInterface);
    assert.strictEqual(await codeOf(first.id), 'REQ-005');
  });

  test('formats codes past 999 without truncating', () => {
    assert.strictEqual(formatRequirementCode(7), 'REQ-007');
    assert.strictEqual(formatRequirementCode(1234), 'REQ-1234');
  });
});
