import assert from 'node:assert';
import { after, before, describe, test } from 'node:test';
import { sequelize } from '../../../db/sequelize.js';
import {
  FeatureSpecModel,
  FeatureSpecVersionModel,
  TaskActivityModel,
  TaskModel,
  UserModel,
  WorkspaceMemberModel,
  WorkspaceModel,
} from '../../../db/models/index.js';
import { FeatureSpecIncompleteError, featureSpecService } from '../featureSpecService.js';

const completePlan = {
  title: 'Checkout satu halaman (final)',
  problem: 'Pembeli keluar di halaman alamat.',
  targetUsers: 'Pembeli baru dan lama.',
  goal: 'Bayar dalam satu halaman.',
  successMeasure: 'Konversi naik dari 52% ke 60%.',
  targetPlatform: 'web_mobile',
  priority: 'high',
  startDate: '2026-11-03',
  dueDate: '2026-11-20',
};

describe('Feature Spec service (P5a: AC-5.1, AC-5.2, AC-5.3, AC-5.7)', () => {
  let workspace: WorkspaceModel;
  let owner: UserModel;
  let po: UserModel;
  let dev: UserModel;
  let qa: UserModel;

  before(async () => {
    await sequelize.authenticate();
    const stamp = Date.now();
    [owner, po, dev, qa] = await Promise.all(
      (['owner', 'po', 'dev', 'qa'] as const).map((role) =>
        UserModel.create({
          email: `fspec-${role}-${stamp}@example.com`,
          passwordHash: 'hashed_pw',
          name: `FSpec ${role}`,
          role,
        }),
      ),
    );
    workspace = await WorkspaceModel.create({
      name: `FSpec Workspace ${stamp}`,
      slug: `fspec-ws-${stamp}`,
      ownerId: owner.id,
    });
    await Promise.all(
      (
        [
          [owner, 'owner'],
          [po, 'po'],
          [dev, 'dev'],
          [qa, 'qa'],
        ] as const
      ).map(([user, role]) =>
        WorkspaceMemberModel.create({ workspaceId: workspace.id, userId: user.id, role }),
      ),
    );
  });

  after(async () => {
    await FeatureSpecVersionModel.destroy({ where: { workspaceId: workspace.id } });
    await FeatureSpecModel.destroy({ where: { workspaceId: workspace.id } });
    await TaskActivityModel.destroy({ where: { workspaceId: workspace.id } });
    await TaskModel.destroy({ where: { workspaceId: workspace.id } });
    await WorkspaceMemberModel.destroy({ where: { workspaceId: workspace.id } });
    await WorkspaceModel.destroy({ where: { id: workspace.id } });
    await UserModel.destroy({ where: { id: [owner.id, po.id, dev.id, qa.id] } });
  });

  async function createSpec(title = 'Checkout satu halaman') {
    return featureSpecService.create(po.id, {
      workspaceId: workspace.id,
      title,
      idea: 'Checkout jangan empat halaman, jadikan satu.',
    });
  }

  test('AC-5.1: PO creates a Feature and Spec version 1 in the Plan stage', async () => {
    const spec = await createSpec();
    assert.strictEqual(spec.version, 1);
    assert.strictEqual(spec.status, 'plan');
    assert.strictEqual(spec.plan.title, 'Checkout satu halaman');
    assert.strictEqual(spec.plan.idea, 'Checkout jangan empat halaman, jadikan satu.');
    assert.strictEqual(spec.completeness.plan.complete, false);
    assert.strictEqual(spec.completeness.plan.total, 9);
    assert.strictEqual(spec.recentVersions.length, 1);
    assert.strictEqual(spec.recentVersions[0].actorType, 'user');
    assert.strictEqual(spec.recentVersions[0].via, 'web');

    const feature = await TaskModel.findByPk(spec.featureTaskId);
    assert.ok(feature);
    assert.strictEqual(feature.parentTaskId, null);
    assert.strictEqual(feature.title, 'Checkout satu halaman');
    assert.strictEqual(feature.description, 'Checkout jangan empat halaman, jadikan satu.');

    const activity = await TaskActivityModel.findOne({
      where: { taskId: spec.featureTaskId, action: 'feature_spec.created' },
    });
    assert.ok(activity);
  });

  test('AC-5.1: a failure after the Feature is created leaves neither Feature nor Spec', async () => {
    const title = `Rollback ${Date.now()}`;
    await assert.rejects(
      featureSpecService.create(po.id, {
        workspaceId: workspace.id,
        folderId: '00000000-0000-4000-8000-0000000000aa',
        title,
        idea: 'x',
      }),
      /NOT_FOUND/,
    );
    assert.strictEqual(await TaskModel.count({ where: { workspaceId: workspace.id, title } }), 0);
  });

  test('AC-5.7: Developer and QA cannot create or save; every member can read', async () => {
    const spec = await createSpec('Akses Spec');
    for (const actor of [dev, qa]) {
      await assert.rejects(
        featureSpecService.create(actor.id, {
          workspaceId: workspace.id,
          title: 'Tidak boleh',
          idea: 'x',
        }),
        /^Error: FORBIDDEN:/,
      );
      await assert.rejects(
        featureSpecService.saveSection(actor.id, {
          workspaceId: workspace.id,
          specId: spec.id,
          section: 'plan',
          version: spec.version,
          content: { title: 'Ubah' },
          complete: false,
        }),
        /^Error: FORBIDDEN:/,
      );
      const read = await featureSpecService.getById(workspace.id, spec.id, actor.id);
      assert.strictEqual(read.id, spec.id);
    }
  });

  test('AC-5.2: a draft may be incomplete, but marking it complete returns missingFields', async () => {
    const spec = await createSpec('Field wajib');
    const saved = await featureSpecService.saveSection(po.id, {
      workspaceId: workspace.id,
      specId: spec.id,
      section: 'plan',
      version: spec.version,
      content: { ...spec.plan, problem: 'Masalah awal.' },
      complete: false,
    });
    assert.strictEqual(saved.version, 2);
    assert.strictEqual(saved.status, 'plan');

    await assert.rejects(
      featureSpecService.saveSection(po.id, {
        workspaceId: workspace.id,
        specId: spec.id,
        section: 'plan',
        version: saved.version,
        content: saved.plan,
        complete: true,
      }),
      (error: unknown) => {
        assert.ok(error instanceof FeatureSpecIncompleteError);
        assert.ok(error.missingFields.includes('plan.successMeasure'));
        assert.ok(error.missingFields.includes('plan.dueDate'));
        assert.ok(!error.missingFields.includes('plan.problem'));
        return true;
      },
    );

    const unchanged = await featureSpecService.getById(workspace.id, spec.id, po.id);
    assert.strictEqual(unchanged.version, 2);
    assert.strictEqual(unchanged.status, 'plan');
  });

  test('AC-5.2: a complete Plan advances the stage and renames the Feature', async () => {
    const spec = await createSpec('Maju tahap');
    const saved = await featureSpecService.saveSection(po.id, {
      workspaceId: workspace.id,
      specId: spec.id,
      section: 'plan',
      version: spec.version,
      content: { ...completePlan, idea: spec.plan.idea },
      complete: true,
    });
    assert.strictEqual(saved.status, 'prd');
    assert.strictEqual(saved.version, 2);
    assert.strictEqual(saved.completeness.plan.complete, true);
    const feature = await TaskModel.findByPk(saved.featureTaskId);
    assert.strictEqual(feature?.title, 'Checkout satu halaman (final)');
  });

  test('the Plan priority and schedule reach the root Feature', async () => {
    const spec = await createSpec('Sinkron jadwal');
    await featureSpecService.saveSection(po.id, {
      workspaceId: workspace.id,
      specId: spec.id,
      section: 'plan',
      version: spec.version,
      content: { ...completePlan, idea: spec.plan.idea },
      complete: true,
    });
    const feature = await TaskModel.findByPk(spec.featureTaskId);
    assert.strictEqual(feature?.priority, 'high');
    assert.strictEqual(String(feature?.startDate).slice(0, 10), '2026-11-03');
    assert.strictEqual(String(feature?.dueDate).slice(0, 10), '2026-11-20');
  });

  test('a Plan with the due date before the start date is rejected and nothing is saved', async () => {
    const spec = await createSpec('Jadwal terbalik');
    await assert.rejects(
      featureSpecService.saveSection(po.id, {
        workspaceId: workspace.id,
        specId: spec.id,
        section: 'plan',
        version: spec.version,
        content: { ...spec.plan, startDate: '2026-11-20', dueDate: '2026-11-03' },
        complete: false,
      }),
      /^Error: BAD_REQUEST:/,
    );
    const current = await featureSpecService.getById(workspace.id, spec.id, po.id);
    assert.strictEqual(current.version, 1);
  });

  test('AC-5.2: the PRD section is locked until the Plan is complete', async () => {
    const spec = await createSpec('PRD terkunci');
    await assert.rejects(
      featureSpecService.saveSection(po.id, {
        workspaceId: workspace.id,
        specId: spec.id,
        section: 'prd',
        version: spec.version,
        content: { brief: { context: 'x' } },
        complete: false,
      }),
      /^Error: BAD_REQUEST:/,
    );
  });

  test('AC-5.3: a stale version is rejected with CONFLICT and nothing is saved', async () => {
    const spec = await createSpec('Versi 409');
    await featureSpecService.saveSection(po.id, {
      workspaceId: workspace.id,
      specId: spec.id,
      section: 'plan',
      version: spec.version,
      content: { ...spec.plan, goal: 'Tujuan A' },
      complete: false,
    });
    await assert.rejects(
      featureSpecService.saveSection(owner.id, {
        workspaceId: workspace.id,
        specId: spec.id,
        section: 'plan',
        version: spec.version,
        content: { ...spec.plan, goal: 'Tujuan B' },
        complete: false,
      }),
      /^Error: CONFLICT:/,
    );
    const current = await featureSpecService.getById(workspace.id, spec.id, po.id);
    assert.strictEqual(current.plan.goal, 'Tujuan A');
    assert.strictEqual(current.version, 2);
  });

  test('AC-5.3: every version records the actor type, id, and path', async () => {
    const spec = await createSpec('Pelaku');
    const saved = await featureSpecService.saveSection(
      po.id,
      {
        workspaceId: workspace.id,
        specId: spec.id,
        section: 'plan',
        version: spec.version,
        content: { ...spec.plan, goal: 'Dari agent' },
        complete: false,
      },
      { type: 'agent', id: po.id, via: 'mcp' },
    );
    const latest = saved.recentVersions[0];
    assert.strictEqual(latest.version, 2);
    assert.strictEqual(latest.actorType, 'agent');
    assert.strictEqual(latest.via, 'mcp');
    assert.strictEqual(latest.actorName, 'FSpec po');
    assert.strictEqual(saved.recentVersions[1].actorType, 'user');
  });

  test('one Spec per Feature and list by featureTaskId', async () => {
    const spec = await createSpec('Satu per Feature');
    await assert.rejects(
      FeatureSpecModel.create({
        workspaceId: workspace.id,
        featureTaskId: spec.featureTaskId,
        createdBy: po.id,
        updatedBy: po.id,
      }),
    );
    const listed = await featureSpecService.list(workspace.id, dev.id, {
      featureTaskId: spec.featureTaskId,
    });
    assert.strictEqual(listed.length, 1);
    assert.strictEqual(listed[0].id, spec.id);
  });

  test('a non-member cannot read a Spec', async () => {
    const spec = await createSpec('Bukan anggota');
    const outsider = await UserModel.create({
      email: `fspec-out-${Date.now()}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Outsider',
      role: 'dev',
    });
    try {
      await assert.rejects(
        featureSpecService.getById(workspace.id, spec.id, outsider.id),
        /^Error: FORBIDDEN:/,
      );
    } finally {
      await UserModel.destroy({ where: { id: outsider.id } });
    }
  });
});
