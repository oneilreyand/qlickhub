import assert from 'node:assert';
import { test, describe, before, after } from 'node:test';
import { sequelize } from '../../../db/sequelize.js';
import {
  UserModel,
  WorkspaceModel,
  WorkspaceMemberModel,
  TaskModel,
  QaDocumentModel,
  QaDocumentVersionModel,
  TaskDocumentModel,
  TaskActivityModel,
} from '../../../db/models/index.js';

describe('QA Document API & Versioning Integration Tests', () => {
  let userA: UserModel;
  let userB: UserModel;
  let qaUser: UserModel;
  let workspace1: WorkspaceModel;
  let workspace2: WorkspaceModel;
  let task1: TaskModel;
  let doc1: QaDocumentModel;
  let docCrossWorkspace: QaDocumentModel;
  let productBriefDocumentId: string | undefined;

  before(async () => {
    await sequelize.authenticate();

    userA = await UserModel.create({
      email: `doc_owner_${Date.now()}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Doc Owner User',
    });

    userB = await UserModel.create({
      email: `doc_other_${Date.now()}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Other Doc User',
    });

    qaUser = await UserModel.create({
      email: `doc_qa_${Date.now()}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'QA Document User',
    });

    workspace1 = await WorkspaceModel.create({
      name: 'Doc Workspace One',
      slug: `doc-ws-one-${Date.now()}`,
      ownerId: userA.id,
    });

    workspace2 = await WorkspaceModel.create({
      name: 'Doc Workspace Two',
      slug: `doc-ws-two-${Date.now()}`,
      ownerId: userB.id,
    });

    await WorkspaceMemberModel.create({
      workspaceId: workspace1.id,
      userId: userA.id,
      role: 'owner',
    });

    await WorkspaceMemberModel.create({
      workspaceId: workspace1.id,
      userId: qaUser.id,
      role: 'qa',
    });

    await WorkspaceMemberModel.create({
      workspaceId: workspace2.id,
      userId: userB.id,
      role: 'owner',
    });

    task1 = await TaskModel.create({
      workspaceId: workspace1.id,
      title: 'Task for Document Linking',
      status: 'todo',
      priority: 'high',
      reporterId: userA.id,
    });
  });

  after(async () => {
    if (task1) await TaskDocumentModel.destroy({ where: { taskId: task1.id } });
    if (task1) await TaskActivityModel.destroy({ where: { taskId: task1.id } });
    if (doc1) await QaDocumentVersionModel.destroy({ where: { documentId: doc1.id } });
    if (doc1) await QaDocumentModel.destroy({ where: { id: doc1.id } });
    if (docCrossWorkspace) await QaDocumentVersionModel.destroy({ where: { documentId: docCrossWorkspace.id } });
    if (docCrossWorkspace) await QaDocumentModel.destroy({ where: { id: docCrossWorkspace.id } });
    if (productBriefDocumentId) await QaDocumentVersionModel.destroy({ where: { documentId: productBriefDocumentId } });
    if (productBriefDocumentId) await QaDocumentModel.destroy({ where: { id: productBriefDocumentId } });
    if (task1) await TaskModel.destroy({ where: { id: task1.id } });
    if (workspace1) await WorkspaceModel.destroy({ where: { id: workspace1.id } });
    if (workspace2) await WorkspaceModel.destroy({ where: { id: workspace2.id } });
    if (userA) await UserModel.destroy({ where: { id: userA.id } });
    if (userB) await UserModel.destroy({ where: { id: userB.id } });
    if (qaUser) await UserModel.destroy({ where: { id: qaUser.id } });
  });

  test('Creates QA Document with initial v1 version', async () => {
    const { qaDocumentService } = await import('../qaDocumentService.js');

    const created = await qaDocumentService.createDocument(workspace1.id, userA.id, {
      title: 'Release 1.0 Master Test Plan',
      docType: 'test_plan',
      contentMarkdown: '# Scope\n\n- E2E tests for auth and payments',
      changelog: 'Initial version',
    });

    doc1 = await QaDocumentModel.findByPk(created.document.id) as QaDocumentModel;
    assert.strictEqual(created.document.currentVersion, 1);
    assert.strictEqual(created.version.version, 1);
    assert.strictEqual(created.version.contentMarkdown.includes('E2E tests'), true);
  });

  test('Creates new document version (v2) without destroying v1 history', async () => {
    const { qaDocumentService } = await import('../qaDocumentService.js');

    const createdV2 = await qaDocumentService.createDocumentVersion(
      workspace1.id,
      doc1.id,
      userA.id,
      {
        title: 'Release 1.0 Master Test Plan - Rev 2',
        contentMarkdown: '# Scope\n\n- E2E tests for auth, payments, and notifications',
        changelog: 'Added notification test scope',
      }
    );

    assert.strictEqual(createdV2.document.currentVersion, 2);
    assert.strictEqual(createdV2.version.version, 2);

    const details = await qaDocumentService.getDocumentWithVersions(
      workspace1.id,
      doc1.id,
      userA.id
    );

    assert.strictEqual(details.document.currentVersion, 2);
    assert.strictEqual(details.versions.length, 2);
    assert.strictEqual(details.currentVersion.version, 2);
    assert.strictEqual(details.versions[1].version, 1); // v1 preserved in history!
  });

  test('Links QA Document to task and records document_linked TaskActivity audit log', async () => {
    const { qaDocumentService } = await import('../qaDocumentService.js');

    const link = await qaDocumentService.linkDocumentToTask(
      workspace1.id,
      task1.id,
      userA.id,
      doc1.id
    );

    assert.strictEqual(link.workspaceId, workspace1.id);
    assert.strictEqual(link.taskId, task1.id);
    assert.strictEqual(link.documentId, doc1.id);

    const activity = await TaskActivityModel.findOne({
      where: { taskId: task1.id, action: 'document_linked' },
    });
    assert.ok(activity);
  });

  test('Rejects linking document from another workspace', async () => {
    const { qaDocumentService } = await import('../qaDocumentService.js');

    const createdCross = await qaDocumentService.createDocument(workspace2.id, userB.id, {
      title: 'Workspace 2 Doc',
      contentMarkdown: '# Content',
    });
    docCrossWorkspace = await QaDocumentModel.findByPk(createdCross.document.id) as QaDocumentModel;

    await assert.rejects(
      async () => {
        await qaDocumentService.linkDocumentToTask(
          workspace1.id,
          task1.id,
          userA.id,
          docCrossWorkspace.id
        );
      },
      (err: Error) => err.message.includes('BAD_REQUEST')
    );
  });

  test('Unlinks QA Document from task and records document_unlinked TaskActivity', async () => {
    const { qaDocumentService } = await import('../qaDocumentService.js');

    const res = await qaDocumentService.unlinkDocumentFromTask(
      workspace1.id,
      task1.id,
      userA.id,
      doc1.id
    );

    assert.strictEqual(res.success, true);

    const count = await TaskDocumentModel.count({ where: { taskId: task1.id, documentId: doc1.id } });
    assert.strictEqual(count, 0);

    const activity = await TaskActivityModel.findOne({
      where: { taskId: task1.id, action: 'document_unlinked' },
    });
    assert.ok(activity);
  });

  test('Creates one versioned Product Brief with scope and acceptance snapshots plus activity', async () => {
    const { qaDocumentService } = await import('../qaDocumentService.js');

    const brief = await qaDocumentService.upsertProductBrief(workspace1.id, task1.id, userA.id, {
      title: 'Checkout Product Brief',
      contentMarkdown: '# Checkout\n\nReduce payment abandonment for returning customers.',
      inScope: [
        { text: 'Show saved payment methods', position: 0 },
        { text: 'Preview payment error states', position: 1 },
      ],
      outScope: [{ text: 'Native mobile checkout', position: 0 }],
      acceptanceCriteria: [
        { text: 'A returning user can review the selected payment method before confirming.', position: 0 },
      ],
      ownerId: userA.id,
      status: 'draft',
      changelog: 'Initial product scope',
    });

    assert.strictEqual(brief.document.docType, 'product_brief');
    productBriefDocumentId = brief.document.id;
    assert.strictEqual(brief.document.ownerId, userA.id);
    assert.strictEqual(brief.currentVersion.version, 1);
    assert.strictEqual(brief.currentVersion.inScope.length, 2);
    assert.strictEqual(brief.currentVersion.outScope[0].text, 'Native mobile checkout');
    assert.strictEqual(brief.currentVersion.acceptanceCriteria[0].text, 'A returning user can review the selected payment method before confirming.');

    const linkCount = await TaskDocumentModel.count({
      where: { taskId: task1.id, linkType: 'primary_prd' },
    });
    assert.strictEqual(linkCount, 1);

    const activity = await TaskActivityModel.findOne({
      where: { taskId: task1.id, action: 'product_brief_created' },
    });
    assert.ok(activity);
  });

  test('Versions the Product Brief without replacing scope or acceptance history and keeps one primary link', async () => {
    const { qaDocumentService } = await import('../qaDocumentService.js');

    const next = await qaDocumentService.upsertProductBrief(workspace1.id, task1.id, userA.id, {
      title: 'Checkout Product Brief',
      contentMarkdown: '# Checkout\n\nReduce payment abandonment and support a clearer review flow.',
      inScope: [{ text: 'Show saved payment methods', position: 0 }],
      outScope: [
        { text: 'Native mobile checkout', position: 0 },
        { text: 'Gift-card redemption', position: 1 },
      ],
      acceptanceCriteria: [
        { text: 'Payment failure is shown without losing the selected method.', position: 0 },
        { text: 'The confirmed order records the selected payment method.', position: 1 },
      ],
      ownerId: userA.id,
      status: 'approved',
      changelog: 'Approved release scope',
    });

    assert.strictEqual(next.currentVersion.version, 2);
    assert.strictEqual(next.document.status, 'approved');

    const details = await qaDocumentService.getDocumentWithVersions(
      workspace1.id,
      next.document.id,
      userA.id
    );
    const initialVersion = details.versions.find((version) => version.version === 1);
    assert.strictEqual(initialVersion?.inScope.length, 2);
    assert.strictEqual(initialVersion?.outScope.length, 1);
    assert.strictEqual(initialVersion?.acceptanceCriteria.length, 1);
    assert.strictEqual(next.currentVersion.acceptanceCriteria.length, 2);

    const linkCount = await TaskDocumentModel.count({
      where: { taskId: task1.id, linkType: 'primary_prd' },
    });
    assert.strictEqual(linkCount, 1);

    const activity = await TaskActivityModel.findOne({
      where: { taskId: task1.id, action: 'product_brief_approved' },
    });
    assert.ok(activity);
  });

  test('Rejects Product Brief mutation from QA and a non-member owner', async () => {
    const { qaDocumentService } = await import('../qaDocumentService.js');
    const input = {
      title: 'Unauthorized Product Brief',
      contentMarkdown: 'No write permission.',
      inScope: [],
      outScope: [],
      acceptanceCriteria: [],
      status: 'draft' as const,
    };

    await assert.rejects(
      () => qaDocumentService.upsertProductBrief(workspace1.id, task1.id, qaUser.id, input),
      (error: Error) => error.message.includes('FORBIDDEN')
    );

    await assert.rejects(
      () => qaDocumentService.upsertProductBrief(workspace1.id, task1.id, userA.id, {
        ...input,
        ownerId: userB.id,
      }),
      (error: Error) => error.message.includes('BAD_REQUEST')
    );
  });
});
