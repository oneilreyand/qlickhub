import assert from 'node:assert';
import { after, before, describe, test } from 'node:test';
import { ProductBriefResponseSchema, UpsertProductBriefSchema } from '@qlick/contracts';
import { sequelize } from '../../../db/sequelize.js';
import {
  QaDocumentModel,
  QaDocumentVersionModel,
  TaskActivityModel,
  TaskDocumentModel,
  TaskModel,
  UserModel,
  WorkspaceMemberModel,
  WorkspaceModel,
} from '../../../db/models/index.js';

// PRODUCT-BRIEF-SCOPE-ID: Briefs written by the AI generator stored scope ids such as "scope-1".
// The legacy rows are persisted directly to reproduce that historical data in PostgreSQL.
describe('Product Brief with legacy non-UUID scope ids (PostgreSQL)', () => {
  let owner: UserModel;
  let workspace: WorkspaceModel;
  let feature: TaskModel;
  let documentId: string;
  let legacyVersionId: string;

  before(async () => {
    await sequelize.authenticate();
    const stamp = Date.now();
    owner = await UserModel.create({
      email: `legacy_brief_owner_${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Legacy Brief Owner',
    });
    workspace = await WorkspaceModel.create({
      name: 'Legacy Brief Workspace',
      slug: `legacy-brief-${stamp}`,
      ownerId: owner.id,
    });
    await WorkspaceMemberModel.create({
      workspaceId: workspace.id,
      userId: owner.id,
      role: 'owner',
    });
    feature = await TaskModel.create({
      workspaceId: workspace.id,
      title: 'Task Management Engine',
      status: 'todo',
      priority: 'high',
      reporterId: owner.id,
    });

    const { qaDocumentService } = await import('../qaDocumentService.js');
    const created = await qaDocumentService.upsertProductBrief(workspace.id, feature.id, owner.id, {
      title: 'Brief Produk: Task Management Engine',
      contentMarkdown: 'Context written by the AI generator.',
      inScope: [
        { text: 'State machine for task status', position: 0 },
        { text: 'RBAC per role', position: 1 },
      ],
      outScope: [{ text: 'Jira integration', position: 0 }],
      acceptanceCriteria: [],
      ownerId: owner.id,
      status: 'draft',
    });
    documentId = created.document.id;
    legacyVersionId = created.currentVersion.id;
    await QaDocumentVersionModel.update(
      {
        inScope: [
          { id: 'scope-1', text: 'State machine for task status', position: 1 },
          { id: 'scope-2', text: 'RBAC per role', position: 2 },
        ],
        outScope: [{ id: 'outscope-1', text: 'Jira integration', position: 1 }],
      },
      { where: { id: legacyVersionId } },
    );
  });

  after(async () => {
    await TaskDocumentModel.destroy({ where: { taskId: feature.id } });
    await TaskActivityModel.destroy({ where: { taskId: feature.id } });
    await QaDocumentVersionModel.destroy({ where: { documentId } });
    await QaDocumentModel.destroy({ where: { id: documentId } });
    await TaskModel.destroy({ where: { id: feature.id } });
    await WorkspaceModel.destroy({ where: { id: workspace.id } });
    await UserModel.destroy({ where: { id: owner.id } });
  });

  test('reads legacy ids as stable UUIDs that satisfy the Brief contract', async () => {
    const { qaDocumentService } = await import('../qaDocumentService.js');
    const first = await qaDocumentService.getProductBrief(workspace.id, feature.id, owner.id);
    const second = await qaDocumentService.getProductBrief(workspace.id, feature.id, owner.id);
    assert.ok(first && second);

    ProductBriefResponseSchema.parse({ brief: first });
    const ids = [...first.currentVersion.inScope, ...first.currentVersion.outScope].map(
      (i) => i.id,
    );
    assert.strictEqual(new Set(ids).size, 3, 'each legacy item gets its own id');
    assert.ok(ids.every((id) => !id.startsWith('scope-') && !id.startsWith('outscope-')));
    assert.deepStrictEqual(
      second.currentVersion.inScope.map((i) => i.id),
      first.currentVersion.inScope.map((i) => i.id),
      'ids are deterministic across reads',
    );
  });

  test('the Brief read back from a legacy version can be saved as approved without changing history', async () => {
    const { qaDocumentService } = await import('../qaDocumentService.js');
    const current = await qaDocumentService.getProductBrief(workspace.id, feature.id, owner.id);
    assert.ok(current);

    // Same validation the PUT /product-brief controller applies to the browser's resubmitted payload.
    const parsed = UpsertProductBriefSchema.parse({
      workspaceId: workspace.id,
      taskId: feature.id,
      title: current.currentVersion.title,
      contentMarkdown: current.currentVersion.contentMarkdown,
      inScope: current.currentVersion.inScope,
      outScope: current.currentVersion.outScope,
      acceptanceCriteria: current.currentVersion.acceptanceCriteria,
      ownerId: owner.id,
      status: 'approved',
    });
    const saved = await qaDocumentService.upsertProductBrief(
      workspace.id,
      feature.id,
      owner.id,
      parsed,
    );

    assert.strictEqual(saved.document.status, 'approved');
    assert.strictEqual(saved.currentVersion.version, 2);
    const v2 = await QaDocumentVersionModel.findByPk(saved.currentVersion.id);
    assert.ok(v2);
    assert.deepStrictEqual(
      v2.inScope.map((i) => i.text),
      ['State machine for task status', 'RBAC per role'],
    );
    assert.ok(
      v2.inScope.every((i) => /^[0-9a-f-]{36}$/i.test(i.id)),
      'new version stores UUIDs',
    );

    const legacy = await QaDocumentVersionModel.findByPk(legacyVersionId);
    assert.deepStrictEqual(
      legacy?.inScope.map((i) => i.id),
      ['scope-1', 'scope-2'],
      'legacy version row is not rewritten',
    );
  });
});
