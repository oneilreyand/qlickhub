import assert from 'node:assert';
import { after, afterEach, before, describe, test } from 'node:test';
import { evaluateFeatureSpecSection } from '@qlick/contracts';
import { sequelize } from '../../../db/sequelize.js';
import {
  FeatureSpecModel,
  FeatureSpecQuestionModel,
  FeatureSpecVersionModel,
  TaskActivityModel,
  TaskModel,
  UserModel,
  WorkspaceMemberModel,
  WorkspaceModel,
} from '../../../db/models/index.js';
import { FeatureSpecAiClient, FeatureSpecAiUnavailableError } from '../featureSpecAiClient.js';
import { featureSpecAiService, setFeatureSpecAiClient } from '../featureSpecAiService.js';
import { featureSpecService } from '../featureSpecService.js';

const criterion = {
  given: 'Pembeli sudah mengisi keranjang',
  when: 'Pembeli membuka checkout',
  then: 'Semua langkah tampil dalam satu halaman',
};

const goodPrd = {
  brief: {
    context: 'Checkout empat halaman membuat pembeli keluar.',
    inScope: 'Alamat, pengiriman, dan pembayaran dalam satu halaman.',
    outScope: 'Program loyalitas dan multi-mata uang.',
  },
  requirements: [
    { title: 'Satu halaman', description: 'Gabungkan langkah.', acceptanceCriteria: [criterion] },
    { title: 'Validasi inline', description: 'Galat per field.', acceptanceCriteria: [criterion] },
    { title: 'Ringkasan', description: 'Total selalu tampil.', acceptanceCriteria: [criterion] },
  ],
};

const completePlan = {
  title: 'Checkout satu halaman',
  idea: 'Checkout jangan empat halaman, jadikan satu.',
  problem: 'Pembeli keluar di halaman alamat.',
  targetUsers: 'Pembeli baru dan lama.',
  goal: 'Bayar dalam satu halaman.',
  successMeasure: 'Konversi naik dari 52% ke 60%.',
  targetPlatform: 'web_mobile' as const,
  priority: 'high' as const,
  startDate: '2026-11-03',
  dueDate: '2026-11-20',
};

describe('Feature Spec AI PRD service (P5c: AC-5.5, AC-5.7)', () => {
  let workspace: WorkspaceModel;
  let owner: UserModel;
  let po: UserModel;
  let dev: UserModel;
  let qa: UserModel;
  let nextPrd: unknown = goodPrd;
  let nextError: Error | null = null;
  let calls = 0;

  const fakeClient: FeatureSpecAiClient = {
    async generateJson() {
      calls += 1;
      if (nextError) throw nextError;
      return nextPrd;
    },
  };

  before(async () => {
    await sequelize.authenticate();
    setFeatureSpecAiClient(fakeClient);
    const stamp = Date.now();
    [owner, po, dev, qa] = await Promise.all(
      (['owner', 'po', 'dev', 'qa'] as const).map((role) =>
        UserModel.create({
          email: `fspec-prd-${role}-${stamp}@example.com`,
          passwordHash: 'hashed_pw',
          name: `FSpecPrd ${role}`,
          role,
        }),
      ),
    );
    workspace = await WorkspaceModel.create({
      name: `FSpecPrd Workspace ${stamp}`,
      slug: `fspec-prd-ws-${stamp}`,
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

  afterEach(() => {
    nextPrd = goodPrd;
    nextError = null;
    calls = 0;
  });

  after(async () => {
    await FeatureSpecQuestionModel.destroy({ where: { workspaceId: workspace.id } });
    await FeatureSpecVersionModel.destroy({ where: { workspaceId: workspace.id } });
    await FeatureSpecModel.destroy({ where: { workspaceId: workspace.id } });
    await TaskActivityModel.destroy({ where: { workspaceId: workspace.id } });
    await TaskModel.destroy({ where: { workspaceId: workspace.id } });
    await WorkspaceMemberModel.destroy({ where: { workspaceId: workspace.id } });
    await WorkspaceModel.destroy({ where: { id: workspace.id } });
    await UserModel.destroy({ where: { id: [owner.id, po.id, dev.id, qa.id] } });
  });

  async function createSpec(withCompletePlan = true) {
    const spec = await featureSpecService.create(po.id, {
      workspaceId: workspace.id,
      title: 'Checkout satu halaman',
      idea: 'Checkout jangan empat halaman, jadikan satu.',
    });
    if (!withCompletePlan) return spec;
    return featureSpecService.saveSection(po.id, {
      workspaceId: workspace.id,
      specId: spec.id,
      section: 'plan',
      version: spec.version,
      content: completePlan,
      complete: true,
    });
  }

  const input = (specId: string, version: number, replace = false) => ({
    workspaceId: workspace.id,
    specId,
    version,
    replace,
  });

  test('AC-5.5: the AI PRD is saved as a draft with server-assigned keys and via=ai', async () => {
    const spec = await createSpec();
    assert.strictEqual(spec.status, 'prd');
    const result = await featureSpecAiService.generatePrd(po.id, input(spec.id, spec.version));
    assert.strictEqual(result.requirementCount, 3);
    assert.strictEqual(result.featureSpec.version, spec.version + 1);
    // The section stays a draft: the status only advances when the PO marks the PRD complete.
    assert.strictEqual(result.featureSpec.status, 'prd');
    const keys = result.featureSpec.prd.requirements?.map((r) => r.key);
    assert.deepStrictEqual(keys, ['R1', 'R2', 'R3']);
    assert.strictEqual(result.featureSpec.prd.brief?.inScope, goodPrd.brief.inScope);
    assert.ok(evaluateFeatureSpecSection('prd', result.featureSpec.prd).complete);

    const version = await FeatureSpecVersionModel.findOne({
      where: { specId: spec.id, version: result.featureSpec.version },
    });
    assert.strictEqual(version?.via, 'ai');
    assert.strictEqual(version?.actorType, 'user');
    assert.strictEqual(version?.actorId, po.id);
  });

  test('AC-5.5: keys the AI tries to send are ignored; the server assigns R1…Rn', async () => {
    const spec = await createSpec();
    nextPrd = {
      ...goodPrd,
      requirements: goodPrd.requirements.map((r, i) => ({ ...r, key: `X${i}` })),
    };
    const result = await featureSpecAiService.generatePrd(po.id, input(spec.id, spec.version));
    assert.deepStrictEqual(
      result.featureSpec.prd.requirements?.map((r) => r.key),
      ['R1', 'R2', 'R3'],
    );
  });

  test('AC-5.5: the PRD is refused while the Plan is incomplete, and the AI is not called', async () => {
    const spec = await createSpec(false);
    await assert.rejects(
      featureSpecAiService.generatePrd(po.id, input(spec.id, spec.version)),
      /BAD_REQUEST/,
    );
    assert.strictEqual(calls, 0);
  });

  test('AC-5.5: an AI answer without acceptance criteria is rejected and nothing is saved', async () => {
    const spec = await createSpec();
    nextPrd = {
      ...goodPrd,
      requirements: [
        ...goodPrd.requirements.slice(0, 2),
        { title: 'Tanpa AC', description: 'Kosong', acceptanceCriteria: [] },
      ],
    };
    await assert.rejects(
      featureSpecAiService.generatePrd(po.id, input(spec.id, spec.version)),
      FeatureSpecAiUnavailableError,
    );
    const after = await featureSpecService.getById(workspace.id, spec.id, po.id);
    assert.strictEqual(after.version, spec.version);
    assert.deepStrictEqual(after.prd, {});
  });

  test('AC-5.5: too few requirements and an empty scope are rejected', async () => {
    const spec = await createSpec();
    nextPrd = { ...goodPrd, requirements: goodPrd.requirements.slice(0, 2) };
    await assert.rejects(
      featureSpecAiService.generatePrd(po.id, input(spec.id, spec.version)),
      FeatureSpecAiUnavailableError,
    );
    nextPrd = { ...goodPrd, brief: { ...goodPrd.brief, outScope: ' ' } };
    await assert.rejects(
      featureSpecAiService.generatePrd(po.id, input(spec.id, spec.version)),
      FeatureSpecAiUnavailableError,
    );
  });

  test('AC-5.5: an AI service failure is reported and nothing is saved', async () => {
    const spec = await createSpec();
    nextError = new FeatureSpecAiUnavailableError('The AI service did not respond. Try again.');
    await assert.rejects(
      featureSpecAiService.generatePrd(po.id, input(spec.id, spec.version)),
      FeatureSpecAiUnavailableError,
    );
    const after = await featureSpecService.getById(workspace.id, spec.id, po.id);
    assert.strictEqual(after.version, spec.version);
  });

  test('AC-5.5: an existing PRD needs replace=true; replacing keeps the old version in history', async () => {
    const spec = await createSpec();
    const first = await featureSpecAiService.generatePrd(po.id, input(spec.id, spec.version));
    calls = 0;
    await assert.rejects(
      featureSpecAiService.generatePrd(po.id, input(spec.id, first.featureSpec.version)),
      /CONFLICT/,
    );
    assert.strictEqual(calls, 0);

    nextPrd = {
      ...goodPrd,
      requirements: [
        ...goodPrd.requirements,
        { title: 'Keempat', description: 'Tambahan.', acceptanceCriteria: [criterion] },
      ],
    };
    const second = await featureSpecAiService.generatePrd(
      po.id,
      input(spec.id, first.featureSpec.version, true),
    );
    assert.strictEqual(second.requirementCount, 4);
    assert.strictEqual(second.featureSpec.version, first.featureSpec.version + 1);
    const history = await FeatureSpecVersionModel.findAll({ where: { specId: spec.id } });
    assert.ok(history.some((row) => row.version === first.featureSpec.version));
  });

  test('AC-5.5: a PRD a person wrote is protected without replace and replaced with it', async () => {
    const spec = await createSpec();
    const written = await featureSpecService.saveSection(po.id, {
      workspaceId: workspace.id,
      specId: spec.id,
      section: 'prd',
      version: spec.version,
      content: { brief: { inScope: 'Tulisan PO' } },
      complete: false,
    });
    await assert.rejects(
      featureSpecAiService.generatePrd(po.id, input(spec.id, written.version)),
      /CONFLICT/,
    );
    const replaced = await featureSpecAiService.generatePrd(
      po.id,
      input(spec.id, written.version, true),
    );
    assert.strictEqual(replaced.featureSpec.prd.brief?.inScope, goodPrd.brief.inScope);
  });

  test('AC-5.5: a stale version is rejected with a conflict', async () => {
    const spec = await createSpec();
    await assert.rejects(
      featureSpecAiService.generatePrd(po.id, input(spec.id, spec.version - 1)),
      /CONFLICT/,
    );
    assert.strictEqual(calls, 0);
  });

  test('AC-5.7: Developer and QA cannot generate the PRD; Owner can', async () => {
    const spec = await createSpec();
    for (const actor of [dev, qa]) {
      await assert.rejects(
        featureSpecAiService.generatePrd(actor.id, input(spec.id, spec.version)),
        /FORBIDDEN/,
      );
    }
    assert.strictEqual(calls, 0);
    const result = await featureSpecAiService.generatePrd(owner.id, input(spec.id, spec.version));
    assert.strictEqual(result.requirementCount, 3);
  });

  test('AC-5.5: an applied Spec is read-only', async () => {
    const spec = await createSpec();
    await FeatureSpecModel.update({ status: 'applied' }, { where: { id: spec.id } });
    await assert.rejects(
      featureSpecAiService.generatePrd(po.id, input(spec.id, spec.version)),
      /BAD_REQUEST/,
    );
  });
});
