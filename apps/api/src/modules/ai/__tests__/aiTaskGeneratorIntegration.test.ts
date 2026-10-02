import assert from 'node:assert';
import { test, describe, before, after } from 'node:test';
import {
  WorkspaceModel,
  WorkspaceMemberModel,
  UserModel,
  WorkFolderModel,
  TaskModel,
  RequirementModel,
  AcceptanceCriterionModel,
  TaskRequirementModel,
  TaskActivityModel,
  TaskDocumentModel,
  QaDocumentModel,
  QaDocumentVersionModel,
} from '../../../db/models/index.js';
import { aiTaskGeneratorService } from '../aiTaskGeneratorService.js';
import { qaDocumentService } from '../../qaDocuments/qaDocumentService.js';

describe('AI Task Generator Integration Tests (AI-001, DOMAIN-002, DOMAIN-004)', () => {
  let ownerUser: UserModel;
  let poUser: UserModel;
  let devUser: UserModel;
  let workspace: WorkspaceModel;
  let folder: WorkFolderModel;

  before(async () => {
    const timestamp = Date.now();
    [ownerUser, poUser, devUser] = await Promise.all([
      UserModel.create({
        email: `ai-owner-${timestamp}@example.com`,
        passwordHash: 'hashed_pw',
        name: 'AI Test Owner',
        role: 'admin',
      }),
      UserModel.create({
        email: `ai-po-${timestamp}@example.com`,
        passwordHash: 'hashed_pw',
        name: 'AI Test PO',
        role: 'po',
      }),
      UserModel.create({
        email: `ai-dev-${timestamp}@example.com`,
        passwordHash: 'hashed_pw',
        name: 'AI Test Dev',
        role: 'dev',
      }),
    ]);

    workspace = await WorkspaceModel.create({
      name: 'AI Task Generator Workspace',
      slug: `ai-task-ws-${timestamp}`,
      ownerId: ownerUser.id,
    });

    await WorkspaceMemberModel.bulkCreate([
      { workspaceId: workspace.id, userId: ownerUser.id, role: 'owner' },
      { workspaceId: workspace.id, userId: poUser.id, role: 'po' },
      { workspaceId: workspace.id, userId: devUser.id, role: 'dev' },
    ]);

    folder = await WorkFolderModel.create({
      workspaceId: workspace.id,
      name: 'Fitur Checkout & Payment',
      createdBy: ownerUser.id,
      position: 1,
    });
  });

  after(async () => {
    if (workspace) {
      await TaskActivityModel.destroy({ where: { workspaceId: workspace.id } });
      await TaskDocumentModel.destroy({ where: { workspaceId: workspace.id } });
      await QaDocumentVersionModel.destroy({ where: { workspaceId: workspace.id } });
      await QaDocumentModel.destroy({ where: { workspaceId: workspace.id } });
      await TaskRequirementModel.destroy({ where: { workspaceId: workspace.id } });
      await AcceptanceCriterionModel.destroy({ where: { workspaceId: workspace.id } });
      await RequirementModel.destroy({ where: { workspaceId: workspace.id } });
      await TaskModel.destroy({ where: { workspaceId: workspace.id }, force: true });
      await WorkFolderModel.destroy({ where: { workspaceId: workspace.id }, force: true });
      await WorkspaceMemberModel.destroy({ where: { workspaceId: workspace.id } });
      await WorkspaceModel.destroy({ where: { id: workspace.id } });
    }
    if (ownerUser) await UserModel.destroy({ where: { id: ownerUser.id } });
    if (poUser) await UserModel.destroy({ where: { id: poUser.id } });
    if (devUser) await UserModel.destroy({ where: { id: devUser.id } });
  });

  test('generateDraft generates a comprehensive cited draft without mutating DB (AI-001)', async () => {
    const result = await aiTaskGeneratorService.generateDraft(workspace.id, poUser.id, {
      workspaceId: workspace.id,
      prompt: 'Implementasi pembayaran QRIS dengan notifikasi webhook dan halaman bukti transaksi',
      folderId: folder.id,
      targetPlatforms: ['web', 'backend', 'qa'],
    });

    assert.strictEqual(result.outcome, 'draft');
    assert.ok(result.outcome === 'draft', 'Descriptive prompt should return a reviewable draft');
    const draft = result.draft;
    assert.ok(draft.task.title, 'Should have task title');
    assert.ok(draft.productBrief.context, 'Should have product brief context');
    assert.ok(draft.productBrief.inScope.length > 0, 'Should have inScope items');
    assert.ok(draft.requirements.length > 0, 'Should have requirements');
    assert.ok(
      draft.requirements[0].acceptanceCriteria.length > 0,
      'Should have acceptance criteria',
    );
    assert.ok(draft.subtasks.length >= 3, 'Should have subtasks for web, backend, and qa');
    assert.deepStrictEqual(draft.citations, [
      {
        sourceType: 'user_prompt',
        label: 'Prompt Product Owner',
        excerpt:
          'Implementasi pembayaran QRIS dengan notifikasi webhook dan halaman bukti transaksi',
      },
    ]);

    // Confirm that no Task was created in DB during generateDraft (AI-001)
    const taskCount = await TaskModel.count({ where: { workspaceId: workspace.id } });
    assert.strictEqual(taskCount, 0, 'No task should be created prior to user Apply action');
  });

  test('generateDraft asks for clarification instead of fabricating a Feature from unintelligible text', async () => {
    const prompt =
      'aswdas asdnasjkldn asdjjaskld askljdaskl dsakljdklas dklasjdnla jkdszbfl sdzkhsdzbflsdjkb fsdzkjbfsdzfsdz';
    const result = await aiTaskGeneratorService.generateDraft(workspace.id, poUser.id, {
      workspaceId: workspace.id,
      prompt,
      folderId: folder.id,
    });

    assert.strictEqual(result.outcome, 'clarification');
    if (result.outcome === 'clarification') {
      assert.ok(result.clarification.questions.length > 0);
      assert.strictEqual(result.clarification.citations[0].excerpt, prompt);
    }
    assert.strictEqual(
      await TaskModel.count({ where: { workspaceId: workspace.id } }),
      0,
      'Clarification must not create a Root Task before an explicit Apply action',
    );
  });

  test('generateDraft enforces active workspace membership and planner authorization', async () => {
    await assert.rejects(
      () =>
        aiTaskGeneratorService.generateDraft(workspace.id, '00000000-0000-0000-0000-000000000000', {
          workspaceId: workspace.id,
          prompt: 'Testing unauthorized actor',
        }),
      /FORBIDDEN: You are not a member of this workspace/i,
    );
    await assert.rejects(
      () =>
        aiTaskGeneratorService.generateDraft(workspace.id, devUser.id, {
          workspaceId: workspace.id,
          prompt: 'Developer cannot create a root feature through AI.',
        }),
      /FORBIDDEN/i,
    );
  });

  test('applyDraft creates Root Feature, Brief, Requirements, and Subtasks atomically', async () => {
    const applyResult = await aiTaskGeneratorService.applyDraft(workspace.id, poUser.id, {
      workspaceId: workspace.id,
      folderId: folder.id,
      task: {
        title: 'Integrasi Pembayaran QRIS Dinamis',
        description: 'Menyediakan pembayaran QRIS instan bagi pembeli checkout.',
        priority: 'high',
      },
      productBrief: {
        context: 'Mempercepat proses checkout dan meningkatkan konversi sebesar 25%.',
        inScope: [
          'Generate invoice QRIS dinamis',
          'Webhook penerimaan callback pembayaran',
          'Tampilan bukti bayar',
        ],
        outScope: ['Virtual account bank transfer', 'Cicilan kartu kredit'],
      },
      requirements: [
        {
          title: 'Pembuatan Invoice QRIS',
          description: 'Sistem menghasilkan string EMVCo QRIS yang valid.',
          acceptanceCriteria: [
            'Given total keranjang valid, when pilih QRIS, then QR code ditampilkan dalam 2 detik',
            'Given waktu pembayaran habis 15 menit, then status invoice otomatis expired',
          ],
        },
      ],
      subtasks: [
        {
          title: 'BE: Endpoint generate QRIS & Webhook',
          description: 'REST API untuk pembuatan transaksi dan callback notifikasi.',
          deliveryArea: 'backend',
          priority: 'high',
          enabled: true,
        },
        {
          title: 'FE: Komponen Tampilan QRIS & Timer Countdown',
          description: 'Modal checkout dengan QR image dan live timer 15 menit.',
          deliveryArea: 'frontend',
          priority: 'high',
          enabled: true,
        },
        {
          title: 'QA: Skenario UAT Pembayaran & Timeout QRIS',
          description: 'Pengujian transaksi sukses, simulasi delay callback, dan timeout.',
          deliveryArea: 'qa',
          priority: 'medium',
          enabled: true,
        },
        {
          title: 'Mobile: Native QR Screen',
          description: 'Subtask yang di-uncheck oleh PO saat review preview.',
          deliveryArea: 'mobile',
          priority: 'low',
          enabled: false, // Should be omitted!
        },
      ],
    });

    assert.ok(applyResult.task.id, 'Should have root task ID');
    assert.strictEqual(applyResult.task.title, 'Integrasi Pembayaran QRIS Dinamis');
    assert.strictEqual(applyResult.createdRequirementCount, 1);
    assert.strictEqual(
      applyResult.createdSubtaskCount,
      3,
      'Only 3 enabled subtasks should be created',
    );
    assert.strictEqual(applyResult.hasProductBrief, true);

    // Verify persisted rows in PostgreSQL
    const persistedRoot = await TaskModel.findByPk(applyResult.task.id);
    assert.strictEqual(persistedRoot?.title, 'Integrasi Pembayaran QRIS Dinamis');
    assert.strictEqual(persistedRoot?.folderId, folder.id);
    assert.strictEqual(persistedRoot?.parentTaskId, null);

    // Verify persisted subtasks
    const subtasks = await TaskModel.findAll({
      where: { parentTaskId: applyResult.task.id },
      order: [['createdAt', 'ASC']],
    });
    assert.strictEqual(subtasks.length, 3);
    const deliveryAreas = subtasks.map((s) => s.deliveryArea);
    assert.ok(deliveryAreas.includes('backend'));
    assert.ok(deliveryAreas.includes('frontend'));
    assert.ok(deliveryAreas.includes('qa'));
    assert.ok(!deliveryAreas.includes('mobile'), 'Disabled mobile subtask should not be created');

    // Verify linked requirements and acceptance criteria
    const reqLinks = await TaskRequirementModel.findAll({
      where: { taskId: applyResult.task.id },
    });
    assert.strictEqual(reqLinks.length, 1);

    const acs = await AcceptanceCriterionModel.findAll({
      where: { requirementId: reqLinks[0].requirementId },
    });
    assert.strictEqual(acs.length, 2);

    // Verify each subtask is also linked to the requirement for traceability
    for (const sub of subtasks) {
      const subtaskReqLink = await TaskRequirementModel.findOne({
        where: { taskId: sub.id, requirementId: reqLinks[0].requirementId },
      });
      assert.ok(subtaskReqLink, `Subtask ${sub.title} must be linked to the Requirement`);
    }

    // Verify Product Brief
    const brief = await qaDocumentService.getProductBrief(
      workspace.id,
      applyResult.task.id,
      poUser.id,
    );
    assert.ok(brief, 'Product brief should exist');
    assert.strictEqual(brief?.currentVersion.inScope.length, 3);
    assert.strictEqual(brief?.currentVersion.outScope.length, 2);

    // Verify audit logs
    const activities = await TaskActivityModel.findAll({
      where: { workspaceId: workspace.id },
    });
    assert.ok(
      activities.some((a) => a.taskId === applyResult.task.id && a.action === 'task_created'),
    );
    assert.strictEqual(
      activities.filter((a) => a.action === 'subtask_created').length,
      3,
      'Each persisted subtask must have an audit activity',
    );
  });

  test('rolls back every AI-created record when Product Brief persistence fails', async () => {
    const title = `Rollback Product Brief ${Date.now()}`;
    const hookName = `ai-product-brief-rollback-${Date.now()}`;
    QaDocumentModel.addHook('beforeCreate', hookName, () => {
      throw new Error('forced Product Brief persistence failure');
    });

    try {
      await assert.rejects(
        () =>
          aiTaskGeneratorService.applyDraft(workspace.id, poUser.id, {
            workspaceId: workspace.id,
            task: { title, description: 'Must not be persisted.', priority: 'medium' },
            productBrief: {
              context: 'Transaction rollback coverage.',
              inScope: ['Atomic write'],
              outScope: [],
            },
            requirements: [
              {
                title: 'Atomic persistence',
                description: 'All records share one transaction.',
                acceptanceCriteria: [
                  'Given Brief creation fails, when applying, then no Feature records persist',
                ],
              },
            ],
            subtasks: [
              {
                title: 'QA: Verify transaction rollback',
                description: 'Assert no partial records remain.',
                deliveryArea: 'qa',
                priority: 'medium',
                enabled: true,
              },
            ],
          }),
        /forced Product Brief persistence failure/,
      );
    } finally {
      QaDocumentModel.removeHook('beforeCreate', hookName);
    }

    assert.strictEqual(
      await TaskModel.count({ where: { workspaceId: workspace.id, title } }),
      0,
      'Root Task must roll back with the failed Product Brief',
    );
    assert.strictEqual(
      await RequirementModel.count({
        where: { workspaceId: workspace.id, title: 'Atomic persistence' },
      }),
      0,
      'Requirements must roll back with the failed Product Brief',
    );
    assert.strictEqual(
      await QaDocumentModel.count({
        where: { workspaceId: workspace.id, title: `Brief Produk: ${title}` },
      }),
      0,
      'Product Brief must not escape the rolled-back transaction',
    );
    assert.strictEqual(
      await TaskActivityModel.count({
        where: { workspaceId: workspace.id, action: 'task_created' },
      }),
      1,
      'The failed apply must not add an extra root-task audit event',
    );
  });

  test('refineChat guides the requirements conversation interactively without mutating DB (AI-001)', async () => {
    const chatResult = await aiTaskGeneratorService.refineChat(workspace.id, poUser.id, {
      workspaceId: workspace.id,
      messages: [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Saya ingin membuat fitur pembayaran QRIS dinamis untuk checkout e-commerce',
        },
      ],
      targetPlatforms: ['web', 'backend', 'qa'],
    });

    assert.ok(chatResult.reply.length > 0);
    assert.strictEqual(typeof chatResult.isReadyToSynthesize, 'boolean');
    assert.strictEqual(chatResult.citations[0].sourceType, 'user_prompt');

    // Enforce authorization: Dev cannot use chat refinement
    await assert.rejects(
      () =>
        aiTaskGeneratorService.refineChat(workspace.id, devUser.id, {
          workspaceId: workspace.id,
          messages: [{ id: 'm-1', role: 'user', content: 'Coba tes chat' }],
        }),
      /FORBIDDEN: Only Product Owner, Admin, or Owner can create tasks/,
    );
  });

  test('synthesizeFromChat produces a complete 4-entity Feature draft from chat history (AI-001, DOMAIN-002, DOMAIN-004)', async () => {
    const draftResult = await aiTaskGeneratorService.synthesizeFromChat(workspace.id, poUser.id, {
      workspaceId: workspace.id,
      messages: [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Saya ingin membuat Task Management Engine SDLC',
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: 'Siapa saja role yang terlibat dan bagaimana alur statusnya?',
        },
        {
          id: 'msg-3',
          role: 'user',
          content: 'Ada 3 role: PO, DEV, dan QA dengan state machine 9 status.',
        },
      ],
      targetPlatforms: ['backend', 'web', 'qa'],
    });

    assert.strictEqual(draftResult.outcome, 'draft');
    if (draftResult.outcome === 'draft') {
      assert.ok(draftResult.draft.task.title.length > 0);
      assert.ok(draftResult.draft.requirements.length > 0);
      assert.ok(draftResult.draft.subtasks.length > 0);
      assert.ok(draftResult.draft.productBrief.inScope.length > 0);
      assert.strictEqual(draftResult.draft.citations[0].sourceType, 'user_prompt');
    }
  });
});
