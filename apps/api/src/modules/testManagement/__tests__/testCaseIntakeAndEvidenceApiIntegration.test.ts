import assert from 'node:assert';
import { after, before, describe, test } from 'node:test';
import type { Server } from 'node:http';
import { createApp } from '../../../app.js';
import { sequelize } from '../../../db/sequelize.js';
import {
  FeatureReadinessBaselineModel,
  FeatureReadinessBaselineRequirementModel,
  QaDocumentModel,
  QaDocumentVersionModel,
  QaTestCycleModel,
  RequirementModel,
  TaskAttachmentModel,
  TaskModel,
  TaskRequirementModel,
  TestCaseImportModel,
  TestCaseModel,
  TestCaseRequirementModel,
  TestCaseVersionModel,
  TestRunModel,
  NotificationOutboxModel,
  UserModel,
  WorkspaceMemberModel,
  WorkspaceModel,
} from '../../../db/models/index.js';
import { accessTokenCookieName, signToken } from '../../auth/jwt.js';
import { sessionManager } from '../../auth/sessionManager.js';

describe('Test Case Intake & Evidence HTTP API Integration Tests (QA-INTAKE-EVIDENCE)', () => {
  let server: Server;
  let baseUrl: string;
  let owner: UserModel;
  let po: UserModel;
  let qa: UserModel;
  let dev: UserModel;
  let workspaceA: WorkspaceModel;
  let workspaceB: WorkspaceModel;
  let requirementA1: RequirementModel;
  let requirementA2: RequirementModel;
  let requirementB1: RequirementModel;
  let featureTaskA: TaskModel;
  let taskAttachmentA: TaskAttachmentModel;
  let createdCaseId: string;
  let qaDraftCaseId: string;

  let poCookie: string;
  let qaCookie: string;
  let devCookie: string;

  async function authCookie(user: UserModel): Promise<string> {
    const sessionId = await sessionManager.createSession(
      user.id,
      'TestCaseIntakeIntegration',
      '127.0.0.1',
    );
    const token = signToken({ userId: user.id, email: user.email, role: user.role, sessionId });
    return `${accessTokenCookieName}=${token}`;
  }

  before(async () => {
    await sequelize.authenticate();
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address();
        if (typeof address === 'object' && address) {
          baseUrl = `http://localhost:${address.port}/v1`;
        }
        resolve();
      });
    });

    const stamp = Date.now();
    owner = await UserModel.create({
      email: `intake_owner_${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Intake Owner',
      role: 'owner',
    });
    po = await UserModel.create({
      email: `intake_po_${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Intake PO',
      role: 'po',
    });
    qa = await UserModel.create({
      email: `intake_qa_${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Intake QA',
      role: 'qa',
    });
    dev = await UserModel.create({
      email: `intake_dev_${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Intake Dev',
      role: 'dev',
    });

    poCookie = await authCookie(po);
    qaCookie = await authCookie(qa);
    devCookie = await authCookie(dev);

    workspaceA = await WorkspaceModel.create({
      name: `Intake Workspace A ${stamp}`,
      slug: `intake-ws-a-${stamp}`,
      ownerId: owner.id,
    });
    workspaceB = await WorkspaceModel.create({
      name: `Intake Workspace B ${stamp}`,
      slug: `intake-ws-b-${stamp}`,
      ownerId: owner.id,
    });

    await WorkspaceMemberModel.bulkCreate([
      { workspaceId: workspaceA.id, userId: owner.id, role: 'owner' },
      { workspaceId: workspaceA.id, userId: po.id, role: 'po' },
      { workspaceId: workspaceA.id, userId: qa.id, role: 'qa' },
      { workspaceId: workspaceA.id, userId: dev.id, role: 'dev' },
      { workspaceId: workspaceB.id, userId: owner.id, role: 'owner' },
      { workspaceId: workspaceB.id, userId: po.id, role: 'po' },
      { workspaceId: workspaceB.id, userId: qa.id, role: 'qa' },
    ]);

    requirementA1 = await RequirementModel.create({
      workspaceId: workspaceA.id,
      code: 'REQ-INTAKE-001',
      title: 'Checkout Payment Integration',
      description: 'Support card payments',
      status: 'active',
      createdBy: po.id,
    });

    requirementA2 = await RequirementModel.create({
      workspaceId: workspaceA.id,
      code: 'REQ-INTAKE-002',
      title: 'Order Confirmation Receipt',
      description: 'Send receipt email',
      status: 'active',
      createdBy: po.id,
    });

    requirementB1 = await RequirementModel.create({
      workspaceId: workspaceB.id,
      code: 'REQ-INTAKE-B-001',
      title: 'Workspace B checkout boundary',
      description: 'Verify numbering remains scoped to Workspace B',
      status: 'active',
      createdBy: po.id,
    });

    featureTaskA = await TaskModel.create({
      workspaceId: workspaceA.id,
      title: 'Feature: Checkout Flow',
      status: 'in_progress',
      priority: 'high',
      reporterId: po.id,
      assigneeId: dev.id,
    });

    await TaskRequirementModel.bulkCreate([
      {
        workspaceId: workspaceA.id,
        taskId: featureTaskA.id,
        requirementId: requirementA1.id,
        linkedBy: po.id,
      },
      {
        workspaceId: workspaceA.id,
        taskId: featureTaskA.id,
        requirementId: requirementA2.id,
        linkedBy: po.id,
      },
    ]);

    await TaskModel.create({
      workspaceId: workspaceA.id,
      parentTaskId: featureTaskA.id,
      deliveryArea: 'qa',
      title: 'Execute Checkout QA',
      status: 'todo',
      priority: 'high',
      reporterId: po.id,
      assigneeId: qa.id,
    });

    taskAttachmentA = await TaskAttachmentModel.create({
      workspaceId: workspaceA.id,
      taskId: featureTaskA.id,
      fileName: 'qa_error_snapshot.png',
      fileSize: 1024,
      mimeType: 'image/png',
      storageRef: `evidence/${workspaceA.id}/snapshot.png`,
      category: 'qa_evidence',
      uploaderId: qa.id,
    });
  });

  after(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  // SLICE 1: Native Test Case Authoring & Publishing Authority (ADR-001 addendum)
  describe('Slice 1: Native Test Case Authoring & Publishing Authority', () => {
    test('QA creates a draft Test Case', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceA.id}/test-cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
        body: JSON.stringify({
          title: 'QA draft creation attempt',
          externalReference: 'TC-QA-001',
          testType: 'manual',
          priority: 'high',
          status: 'draft',
          steps: ['Step 1'],
          requirementIds: [requirementA1.id],
        }),
      });

      assert.strictEqual(res.status, 201);
      const data = (await res.json()) as any;
      assert.strictEqual(data.testCase.status, 'draft');
      qaDraftCaseId = data.testCase.id;
    });

    test('Dev cannot create a Test Case (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceA.id}/test-cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: devCookie },
        body: JSON.stringify({
          title: 'Dev unauthorized creation attempt',
          externalReference: 'TC-DEV-001',
          testType: 'manual',
          priority: 'high',
          steps: ['Step 1'],
          requirementIds: [requirementA1.id],
        }),
      });

      assert.strictEqual(res.status, 403);
    });

    test('QA creates draft Test Case with external reference and requirement link (201 Created)', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceA.id}/test-cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
        body: JSON.stringify({
          title: 'Verify standard card payment flow',
          externalReference: 'TC-NATIVE-001',
          testType: 'manual',
          priority: 'high',
          status: 'draft',
          preconditions: 'User has valid cart',
          steps: ['1. Go to checkout', '2. Fill valid visa card', '3. Click pay'],
          expectedResult: 'Success order confirmation',
          testData: 'Card: 4242424242424242',
          scenarioKind: 'positive',
          requirementIds: [requirementA1.id],
        }),
      });

      assert.strictEqual(res.status, 201);
      const data = (await res.json()) as any;
      assert.strictEqual(data.testCase.title, 'Verify standard card payment flow');
      assert.strictEqual(data.testCase.externalReference, 'TC-NATIVE-001');
      assert.strictEqual(data.testCase.priority, 'high');
      assert.strictEqual(data.testCase.status, 'draft');
      assert.strictEqual(data.testCase.scenarioKind, 'positive');
      assert.strictEqual(data.testCase.source, 'native');
      createdCaseId = data.testCase.id;
    });

    test('blank references are numbered atomically per Workspace and edge scenarios persist', async () => {
      const create = (
        workspaceId: string,
        requirementId: string,
        title: string,
        scenarioKind: string,
      ) =>
        fetch(`${baseUrl}/workspaces/${workspaceId}/test-cases`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
          body: JSON.stringify({
            title,
            testType: 'manual',
            status: 'draft',
            scenarioKind,
            requirementIds: [requirementId],
          }),
        });

      const [workspaceAFirst, workspaceASecond, workspaceBFirst] = await Promise.all([
        create(workspaceA.id, requirementA1.id, 'Maximum cart amount', 'edge'),
        create(workspaceA.id, requirementA1.id, 'Minimum cart amount', 'positive'),
        create(workspaceB.id, requirementB1.id, 'Workspace B first automatic case', 'edge'),
      ]);

      assert.strictEqual(workspaceAFirst.status, 201);
      assert.strictEqual(workspaceASecond.status, 201);
      assert.strictEqual(workspaceBFirst.status, 201);

      const [aFirstBody, aSecondBody, bFirstBody] = (await Promise.all([
        workspaceAFirst.json(),
        workspaceASecond.json(),
        workspaceBFirst.json(),
      ])) as any[];
      const workspaceAReferences = [
        aFirstBody.testCase.externalReference,
        aSecondBody.testCase.externalReference,
      ].sort();

      assert.deepStrictEqual(workspaceAReferences, ['TC-0001', 'TC-0002']);
      assert.strictEqual(bFirstBody.testCase.externalReference, 'TC-0001');
      assert.strictEqual(aFirstBody.testCase.scenarioKind, 'edge');
      assert.strictEqual(bFirstBody.testCase.scenarioKind, 'edge');
    });

    test('PO progresses its draft through review before publishing it', async () => {
      const reviewRes = await fetch(
        `${baseUrl}/workspaces/${workspaceA.id}/test-cases/${createdCaseId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Cookie: poCookie },
          body: JSON.stringify({ status: 'in_review' }),
        },
      );
      assert.strictEqual(reviewRes.status, 200);
      const publishRes = await fetch(
        `${baseUrl}/workspaces/${workspaceA.id}/test-cases/${createdCaseId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Cookie: poCookie },
          body: JSON.stringify({ status: 'active' }),
        },
      );
      assert.strictEqual(publishRes.status, 200);
    });

    test('QA can edit a draft and submit it for planner review', async () => {
      const editRes = await fetch(
        `${baseUrl}/workspaces/${workspaceA.id}/test-cases/${qaDraftCaseId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
          body: JSON.stringify({ title: 'QA draft ready for review' }),
        },
      );
      assert.strictEqual(editRes.status, 200);
      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceA.id}/test-cases/${qaDraftCaseId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
          body: JSON.stringify({ status: 'in_review' }),
        },
      );
      assert.strictEqual(res.status, 200);
      const data = (await res.json()) as any;
      assert.strictEqual(data.testCase.status, 'in_review');
    });

    test('QA directly activates a draft in its assigned QA Subtask scope and notifies PO', async () => {
      const createRes = await fetch(`${baseUrl}/workspaces/${workspaceA.id}/test-cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
        body: JSON.stringify({
          title: 'QA direct activation case',
          testType: 'manual',
          priority: 'high',
          steps: ['Open checkout', 'Confirm payment'],
          requirementIds: [requirementA1.id],
        }),
      });
      assert.strictEqual(createRes.status, 201);
      const created = (await createRes.json()) as any;

      const activateRes = await fetch(
        `${baseUrl}/workspaces/${workspaceA.id}/test-cases/${created.testCase.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
          body: JSON.stringify({ status: 'active' }),
        },
      );
      const activateBody = await activateRes.text();
      assert.strictEqual(activateRes.status, 200, activateBody);
      const activated = JSON.parse(activateBody) as any;
      assert.strictEqual(activated.testCase.status, 'active');

      const outbox = (
        await NotificationOutboxModel.findAll({
          where: { workspaceId: workspaceA.id, recipientUserId: po.id },
        })
      ).find((row) => row.eventKey.startsWith(`test-case-activated:${created.testCase.id}:`));
      assert.strictEqual(outbox?.recipientUserId, po.id);
      assert.strictEqual(outbox?.taskId, featureTaskA.id);
    });

    test('PO publishes a QA review submission as active', async () => {
      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceA.id}/test-cases/${qaDraftCaseId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Cookie: poCookie },
          body: JSON.stringify({ status: 'active' }),
        },
      );
      assert.strictEqual(res.status, 200);
      const data = (await res.json()) as any;
      assert.strictEqual(data.testCase.status, 'active');
    });

    test('QA is forbidden from editing an active Test Case (403 Forbidden)', async () => {
      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceA.id}/test-cases/${createdCaseId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
          body: JSON.stringify({
            title: 'Unauthorized QA edit',
          }),
        },
      );

      assert.strictEqual(res.status, 403);
    });

    test('PO cannot alter an active Test Case definition (403 Forbidden)', async () => {
      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceA.id}/test-cases/${createdCaseId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Cookie: poCookie },
          body: JSON.stringify({
            title: 'Authorized PO update on active case',
            requirementIds: [requirementA1.id, requirementA2.id],
          }),
        },
      );

      assert.strictEqual(res.status, 403);
    });

    test('Duplicate externalReference within same workspace returns 409 CONFLICT', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceA.id}/test-cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
        body: JSON.stringify({
          title: 'Duplicate external ref test',
          externalReference: 'TC-NATIVE-001',
          testType: 'manual',
          status: 'draft',
          steps: ['Step 1'],
          requirementIds: [requirementA1.id],
        }),
      });

      assert.strictEqual(res.status, 409);
    });
  });

  // SLICE 2: Spreadsheet Import Wizard, Staging, Idempotency & Locking
  describe('Slice 2: Spreadsheet Import Wizard, Staging, Idempotency & Locking', () => {
    let importSessionId: string;
    let validContentHash: string;

    test('Download standard CSV template', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceA.id}/test-cases/template`, {
        headers: { Cookie: poCookie },
      });

      assert.strictEqual(res.status, 200);
      assert.ok(res.headers.get('content-type')?.includes('text/csv'));
      const csv = await res.text();
      assert.ok(csv.includes('Test Case ID'));
      assert.ok(csv.includes('Requirement Code'));
    });

    test('Preview dry-run stages import session and returns headers and row validation', async () => {
      const csvContent = [
        'Test Case ID,Title,Requirement Code,Steps,Expected Result,Test Data,Priority,Scenario Kind,Test Type,Preconditions',
        'TC-IMP-001,Verify invalid CVV rejection,REQ-INTAKE-001,"1. Enter bad CVV\n2. Submit",Error banner,CVV: 000,high,negative,manual,Cart loaded',
        'TC-IMP-002,Verify receipt dispatch,REQ-INTAKE-002,"1. Complete pay\n2. Check inbox",Email arrived,None,medium,positive,manual,Order placed',
        'TC-IMP-003,Invalid req code test,REQ-NON-EXISTENT,Step 1,Result,Data,low,positive,manual,None',
        'TC-IMP-001,Duplicate in file row,REQ-INTAKE-001,Step 1,Result,Data,low,positive,manual,None',
      ].join('\n');

      const res = await fetch(`${baseUrl}/workspaces/${workspaceA.id}/test-cases/import/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: poCookie },
        body: JSON.stringify({
          fileName: 'test_cases_batch_1.csv',
          fileContent: csvContent,
        }),
      });

      assert.strictEqual(res.status, 200);
      const data = (await res.json()) as any;
      assert.ok(data.preview.importSessionId);
      assert.ok(data.preview.contentHash);
      assert.ok(Array.isArray(data.preview.headers));
      assert.ok(data.preview.headers.includes('Title'));
      assert.strictEqual(data.preview.totalRows, 4);
      assert.strictEqual(data.preview.validRows, 2);
      assert.strictEqual(data.preview.invalidRows, 2);
      assert.strictEqual(data.preview.duplicateRows, 1);
      importSessionId = data.preview.importSessionId;
      validContentHash = data.preview.contentHash;
    });

    test('Commit import with tampered contentHash is rejected (400 Bad Request)', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceA.id}/test-cases/import/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: poCookie },
        body: JSON.stringify({
          importSessionId,
          contentHash: 'f'.repeat(64), // Tampered hash
          mode: 'create_only',
        }),
      });

      assert.strictEqual(res.status, 400);
    });

    test('QA cannot commit a planner-owned import session', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceA.id}/test-cases/import/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
        body: JSON.stringify({
          importSessionId,
          contentHash: validContentHash,
          mode: 'create_only',
        }),
      });

      assert.strictEqual(res.status, 403);
    });

    test('QA imports an owned create-only session as drafts', async () => {
      const csvContent = [
        'Test Case ID,Title,Requirement Code',
        'TC-QA-IMPORT,QA imported draft,REQ-INTAKE-001',
      ].join('\n');
      const previewRes = await fetch(
        `${baseUrl}/workspaces/${workspaceA.id}/test-cases/import/preview`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
          body: JSON.stringify({ fileName: 'qa_draft.csv', fileContent: csvContent }),
        },
      );
      assert.strictEqual(previewRes.status, 200);
      const previewData = (await previewRes.json()) as any;

      const commitRes = await fetch(
        `${baseUrl}/workspaces/${workspaceA.id}/test-cases/import/commit`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
          body: JSON.stringify({
            importSessionId: previewData.preview.importSessionId,
            contentHash: previewData.preview.contentHash,
            mode: 'create_only',
          }),
        },
      );
      assert.strictEqual(commitRes.status, 201);
      const imported = await TestCaseModel.findOne({
        where: { workspaceId: workspaceA.id, externalReference: 'TC-QA-IMPORT' },
      });
      assert.strictEqual(imported?.status, 'draft');
    });

    test('blank spreadsheet references receive automatic numbers and edge scenarios are accepted', async () => {
      const csvContent = [
        'Test Case ID,Title,Requirement Code,Scenario Kind',
        ',Imported maximum boundary,REQ-INTAKE-001,edge',
      ].join('\n');
      const previewRes = await fetch(
        `${baseUrl}/workspaces/${workspaceA.id}/test-cases/import/preview`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
          body: JSON.stringify({ fileName: 'qa_edge_case.csv', fileContent: csvContent }),
        },
      );
      assert.strictEqual(previewRes.status, 200);
      const previewData = (await previewRes.json()) as any;
      assert.strictEqual(previewData.preview.rows[0].externalReference, null);
      assert.strictEqual(previewData.preview.rows[0].scenarioKind, 'edge');

      const commitRes = await fetch(
        `${baseUrl}/workspaces/${workspaceA.id}/test-cases/import/commit`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
          body: JSON.stringify({
            importSessionId: previewData.preview.importSessionId,
            contentHash: previewData.preview.contentHash,
            mode: 'create_only',
          }),
        },
      );
      assert.strictEqual(commitRes.status, 201);

      const imported = await TestCaseModel.findOne({
        where: { workspaceId: workspaceA.id, title: 'Imported maximum boundary' },
      });
      assert.match(imported?.externalReference || '', /^TC-\d{4,}$/);
      assert.strictEqual(imported?.scenarioKind, 'edge');
    });

    test('PO commits import in create_only mode creates draft cases and records audit', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceA.id}/test-cases/import/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: poCookie },
        body: JSON.stringify({
          importSessionId,
          contentHash: validContentHash,
          mode: 'create_only',
        }),
      });

      assert.strictEqual(res.status, 201);
      const data = (await res.json()) as any;
      assert.strictEqual(data.result.createdRows, 2);
      assert.strictEqual(data.result.failedRows, 2);
      assert.strictEqual(data.result.skippedRows, 0);

      const importedCase = await TestCaseModel.findOne({
        where: { workspaceId: workspaceA.id, externalReference: 'TC-IMP-001' },
      });
      assert.ok(importedCase);
      assert.strictEqual(importedCase.title, 'Verify invalid CVV rejection');
      assert.strictEqual(importedCase.status, 'draft');
      assert.strictEqual(importedCase.source, 'spreadsheet_import');
    });

    test('Idempotent replay on completed import session returns saved result without re-executing', async () => {
      const replayRes = await fetch(
        `${baseUrl}/workspaces/${workspaceA.id}/test-cases/import/commit`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: poCookie },
          body: JSON.stringify({
            importSessionId,
            contentHash: validContentHash,
            mode: 'create_only',
          }),
        },
      );

      assert.strictEqual(replayRes.status, 201);
      const replayData = (await replayRes.json()) as any;
      assert.strictEqual(replayData.result.status, 'completed');
      assert.strictEqual(replayData.result.createdRows, 2);
      assert.strictEqual(replayData.result.failedRows, 2);
      assert.strictEqual(replayData.result.skippedRows, 0);
    });

    test('Concurrent parallel commits on the same staged session are race-safe', async () => {
      const newCsv = [
        'Test Case ID,Title,Requirement Code,Steps,Expected Result,Test Data,Priority,Scenario Kind,Test Type,Preconditions',
        'TC-RACE-001,Race Condition Test 1,REQ-INTAKE-001,Step 1,Expected,Data,low,positive,manual,None',
        'TC-RACE-002,Race Condition Test 2,REQ-INTAKE-002,Step 1,Expected,Data,low,positive,manual,None',
      ].join('\n');

      const previewRes = await fetch(
        `${baseUrl}/workspaces/${workspaceA.id}/test-cases/import/preview`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: poCookie },
          body: JSON.stringify({
            fileName: 'race_test.csv',
            fileContent: newCsv,
          }),
        },
      );
      const previewData = (await previewRes.json()) as any;
      const raceSessionId = previewData.preview.importSessionId;
      const raceContentHash = previewData.preview.contentHash;

      // Fire 3 simultaneous commit requests for the exact same session
      const [res1, res2, res3] = await Promise.all([
        fetch(`${baseUrl}/workspaces/${workspaceA.id}/test-cases/import/commit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: poCookie },
          body: JSON.stringify({
            importSessionId: raceSessionId,
            contentHash: raceContentHash,
            mode: 'create_only',
          }),
        }),
        fetch(`${baseUrl}/workspaces/${workspaceA.id}/test-cases/import/commit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: poCookie },
          body: JSON.stringify({
            importSessionId: raceSessionId,
            contentHash: raceContentHash,
            mode: 'create_only',
          }),
        }),
        fetch(`${baseUrl}/workspaces/${workspaceA.id}/test-cases/import/commit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: poCookie },
          body: JSON.stringify({
            importSessionId: raceSessionId,
            contentHash: raceContentHash,
            mode: 'create_only',
          }),
        }),
      ]);

      assert.strictEqual(res1.status, 201);
      assert.strictEqual(res2.status, 201);
      assert.strictEqual(res3.status, 201);

      const d1 = (await res1.json()) as any;
      const d2 = (await res2.json()) as any;
      const d3 = (await res3.json()) as any;

      assert.strictEqual(d1.result.createdRows, 2);
      assert.strictEqual(d2.result.createdRows, 2);
      assert.strictEqual(d3.result.createdRows, 2);
    });

    test('PO can commit import in update mode to idempotently update existing Test Cases', async () => {
      const updateCsv = [
        'Test Case ID,Title,Requirement Code,Steps,Expected Result,Test Data,Priority,Scenario Kind,Test Type,Preconditions',
        'TC-IMP-001,Updated Title by PO,REQ-INTAKE-001,"1. Enter CVV\n2. Pay",Expected result,Data,low,negative,manual,None',
      ].join('\n');

      const previewRes = await fetch(
        `${baseUrl}/workspaces/${workspaceA.id}/test-cases/import/preview`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: poCookie },
          body: JSON.stringify({
            fileName: 'po_update.csv',
            fileContent: updateCsv,
          }),
        },
      );
      const previewData = (await previewRes.json()) as any;

      const commitRes = await fetch(
        `${baseUrl}/workspaces/${workspaceA.id}/test-cases/import/commit`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: poCookie },
          body: JSON.stringify({
            importSessionId: previewData.preview.importSessionId,
            contentHash: previewData.preview.contentHash,
            mode: 'update',
          }),
        },
      );

      assert.strictEqual(commitRes.status, 201);
      const commitData = (await commitRes.json()) as any;
      assert.strictEqual(commitData.result.updatedRows, 1);

      const updatedCase = await TestCaseModel.findOne({
        where: { workspaceId: workspaceA.id, externalReference: 'TC-IMP-001' },
      });
      assert.strictEqual(updatedCase?.title, 'Updated Title by PO');
      assert.strictEqual(updatedCase?.priority, 'low');
    });

    test('Download import error report CSV for failed rows', async () => {
      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceA.id}/test-cases/import/audits/${importSessionId}/errors`,
        {
          headers: { Cookie: poCookie },
        },
      );

      assert.strictEqual(res.status, 200);
      assert.ok(res.headers.get('content-type')?.includes('text/csv'));
      const errorCsv = await res.text();
      assert.ok(errorCsv.includes('Row Number'));
      assert.ok(errorCsv.includes('Errors'));
    });
  });

  // SLICE 3: Test Result Evidence Links & Bug Inherited Evidence (D5, D6)
  describe('Slice 3: Test Result Evidence Links, Attachment Linking & Bug Inheritance', () => {
    let executableCaseId: string;
    let executableCaseVersionId: string;
    let qaSubtaskId: string;
    let readinessBaselineId: string;
    let testRunId: string;
    let failedResultId: string;
    let bugId: string;

    before(async () => {
      const tc = await TestCaseModel.create({
        workspaceId: workspaceA.id,
        title: 'Active checkout verification',
        externalReference: 'TC-EXEC-001',
        testType: 'manual',
        priority: 'high',
        status: 'active',
        steps: ['Perform payment'],
        expectedResult: 'Success',
        scenarioKind: 'positive',
        source: 'native',
        createdBy: po.id,
      });
      executableCaseId = tc.id;

      await TestCaseRequirementModel.create({
        workspaceId: workspaceA.id,
        testCaseId: tc.id,
        requirementId: requirementA1.id,
        linkedBy: po.id,
      });

      const activeVersion = await TestCaseVersionModel.create({
        workspaceId: workspaceA.id,
        testCaseId: tc.id,
        revision: 1,
        lifecycleStatus: 'active',
        definitionSnapshot: {
          title: 'Verify saved-card checkout failure',
          preconditions: 'Returning customer has a saved card.',
          steps: ['Open checkout', 'Choose saved card', 'Submit payment'],
          expectedResult: 'Payment confirmation is displayed.',
          testData: 'Saved Visa test card',
          requirementIds: [requirementA1.id],
        },
        authoredBy: qa.id,
        publishedBy: po.id,
        publishedAt: new Date(),
      });
      executableCaseVersionId = activeVersion.id;

      const qaSubtask = await TaskModel.create({
        workspaceId: workspaceA.id,
        parentTaskId: featureTaskA.id,
        title: 'Execute checkout evidence regression',
        deliveryArea: 'qa',
        status: 'in_progress',
        priority: 'high',
        reporterId: po.id,
        assigneeId: qa.id,
      });
      qaSubtaskId = qaSubtask.id;

      const brief = await QaDocumentModel.create({
        workspaceId: workspaceA.id,
        title: 'Checkout evidence test baseline',
        docType: 'product_brief',
        status: 'approved',
        ownerId: po.id,
        currentVersion: 1,
        createdBy: po.id,
      });
      const briefVersion = await QaDocumentVersionModel.create({
        workspaceId: workspaceA.id,
        documentId: brief.id,
        version: 1,
        title: brief.title,
        contentMarkdown: 'Integration-test baseline for scoped evidence.',
        createdBy: po.id,
      });
      const baseline = await FeatureReadinessBaselineModel.create({
        workspaceId: workspaceA.id,
        featureTaskId: featureTaskA.id,
        sequence: 1,
        productBriefVersionId: briefVersion.id,
        snapshot: { schemaVersion: 1, integrationFixture: 'test-case-evidence' } as any,
        establishedBy: po.id,
      });
      readinessBaselineId = baseline.id;
      await FeatureReadinessBaselineRequirementModel.create({
        workspaceId: workspaceA.id,
        baselineId: baseline.id,
        requirementId: requirementA1.id,
      });
    });

    async function startScopedRun(build: string): Promise<string> {
      const candidateFingerprint = `commit:${build}`;
      const cycle = await QaTestCycleModel.create({
        workspaceId: workspaceA.id,
        featureTaskId: featureTaskA.id,
        qaSubtaskId,
        readinessBaselineId,
        candidateFingerprint,
        build,
        environment: 'staging',
        status: 'in_progress',
        ownerQaId: qa.id,
      });
      const response = await fetch(
        `${baseUrl}/workspaces/${workspaceA.id}/test-cases/${executableCaseId}/runs`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
          body: JSON.stringify({
            featureTaskId: featureTaskA.id,
            qaSubtaskId,
            testCycleId: cycle.id,
            testCaseVersionId: executableCaseVersionId,
            candidateFingerprint,
            build,
            environment: 'staging',
          }),
        },
      );
      const responseText = await response.text();
      assert.strictEqual(response.status, 201, responseText);
      return (JSON.parse(responseText) as { testRun: { id: string } }).testRun.id;
    }

    test('Insecure HTTP and non-HTTPS URLs are rejected with 400 Bad Request', async () => {
      const insecureRunId = await startScopedRun('v1.0.0-rc1');

      const insecureResultRes = await fetch(
        `${baseUrl}/workspaces/${workspaceA.id}/test-cases/${executableCaseId}/runs/${insecureRunId}/results`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
          body: JSON.stringify({
            status: 'failed',
            actualResult: 'Insecure URL attempt',
            evidenceLinks: [
              {
                url: 'http://insecure-server.com/image.png',
                label: 'Insecure HTTP link',
              },
            ],
          }),
        },
      );

      assert.strictEqual(insecureResultRes.status, 400);
    });

    test('Result payload with duplicate normalized URLs returns 409 Conflict', async () => {
      const dupRunId = await startScopedRun('v1.0.0-dup-test');

      const dupResultRes = await fetch(
        `${baseUrl}/workspaces/${workspaceA.id}/test-cases/${executableCaseId}/runs/${dupRunId}/results`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
          body: JSON.stringify({
            status: 'failed',
            actualResult: 'Duplicate URL payload',
            evidenceLinks: [
              {
                url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                label: 'Video link 1',
              },
              {
                url: 'https://youtu.be/dQw4w9WgXcQ',
                label: 'Video link 2 (same video)',
              },
            ],
          }),
        },
      );

      assert.strictEqual(dupResultRes.status, 409);
    });

    test('QA records Test Result linking formal task attachments and HTTPS evidence links', async () => {
      testRunId = await startScopedRun('v1.0.0-rc2');

      const resultRes = await fetch(
        `${baseUrl}/workspaces/${workspaceA.id}/test-cases/${executableCaseId}/runs/${testRunId}/results`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
          body: JSON.stringify({
            status: 'failed',
            actualResult: 'Server 500 Internal Error during card tokenization',
            notes: 'Fails consistently on Visa cards',
            evidenceAttachmentIds: [taskAttachmentA.id],
            evidenceLinks: [
              {
                url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                label: 'Video reproduction walkthrough',
              },
              {
                url: 'https://www.loom.com/share/abcdef123456',
                label: 'Loom test recording',
              },
            ],
          }),
        },
      );

      assert.strictEqual(resultRes.status, 201);
      const resultData = (await resultRes.json()) as any;
      assert.strictEqual(resultData.testRun.status, 'completed');
      assert.strictEqual(resultData.testRun.result.status, 'failed');
      assert.strictEqual(resultData.testRun.result.evidence.length, 1);
      assert.strictEqual(resultData.testRun.result.evidence[0].attachmentId, taskAttachmentA.id);
      assert.strictEqual(resultData.testRun.result.evidence[0].taskId, featureTaskA.id);
      assert.strictEqual(resultData.testRun.result.evidenceLinks.length, 2);

      failedResultId = resultData.testRun.result.id;
    });

    test('Duplicate evidence link on same Test Result returns 409 Conflict', async () => {
      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceA.id}/test-cases/${executableCaseId}/runs/${testRunId}/evidence-links`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
          body: JSON.stringify({
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            label: 'Duplicate link attempt',
            reason: 'Attempted duplicate link to validate immutable evidence handling.',
          }),
        },
      );

      assert.strictEqual(res.status, 409);
    });

    test('Opening a Bug inherits both formal attachments with origin taskId and evidence links', async () => {
      const bugRes = await fetch(`${baseUrl}/workspaces/${workspaceA.id}/bugs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
        body: JSON.stringify({
          featureTaskId: featureTaskA.id,
          requirementId: requirementA1.id,
          testResultId: failedResultId,
          assigneeId: dev.id,
          title: '500 Server Error when submitting saved card payment',
          severity: 'high',
          reproductionDetails: '1. Open cart\n2. Click submit\n3. 500 error occurs',
        }),
      });

      const bugBody = await bugRes.text();
      assert.strictEqual(bugRes.status, 201, bugBody);
      const bugData = JSON.parse(bugBody) as any;
      bugId = bugData.bug.id;

      assert.ok(bugData.bug.originatingTestResult);
      assert.deepStrictEqual(bugData.bug.originatingTestCase, {
        availability: 'available',
        versionId: executableCaseVersionId,
        revision: 1,
        title: 'Verify saved-card checkout failure',
        preconditions: 'Returning customer has a saved card.',
        steps: ['Open checkout', 'Choose saved card', 'Submit payment'],
        expectedResult: 'Payment confirmation is displayed.',
        testData: 'Saved Visa test card',
        requirementIds: [requirementA1.id],
        acceptanceCriteria: [],
      });
      assert.strictEqual(bugData.bug.originatingTestResult.evidence.length, 1);
      assert.strictEqual(
        bugData.bug.originatingTestResult.evidence[0].attachmentId,
        taskAttachmentA.id,
      );
      assert.strictEqual(bugData.bug.originatingTestResult.evidence[0].taskId, featureTaskA.id);
      assert.strictEqual(bugData.bug.originatingTestResult.evidenceLinks.length, 2);

      // QA adds triage evidence link to Bug
      const qaEvidenceRes = await fetch(
        `${baseUrl}/workspaces/${workspaceA.id}/bugs/${bugId}/evidence-links?kind=triage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
          body: JSON.stringify({
            url: 'https://example.com/triage-log-analysis.png',
            label: 'Backend stack trace screenshot',
          }),
        },
      );
      assert.strictEqual(qaEvidenceRes.status, 201);

      // Duplicate evidence link on same Bug returns 409 Conflict
      const dupBugEvidenceRes = await fetch(
        `${baseUrl}/workspaces/${workspaceA.id}/bugs/${bugId}/evidence-links?kind=triage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
          body: JSON.stringify({
            url: 'https://example.com/triage-log-analysis.png',
            label: 'Duplicate screenshot',
          }),
        },
      );
      assert.strictEqual(dupBugEvidenceRes.status, 409);

      assert.strictEqual(bugData.bug.status, 'open');
    });

    test('import rejects mapping to inactive requirements (draft/deprecated) with row errors', async () => {
      // Create a draft requirement in workspaceA
      const draftReq = await RequirementModel.create({
        workspaceId: workspaceA.id,
        code: 'REQ-DRAFT-001',
        title: 'Draft Requirement',
        status: 'draft',
        createdBy: po.id,
      });

      const csvContent = [
        'External Reference,Title,Requirement Code,Priority,Scenario Kind,Test Type',
        `TC-INACTIVE-01,Test On Inactive Req,${draftReq.code},medium,positive,manual`,
      ].join('\n');

      const previewRes = await fetch(
        `${baseUrl}/workspaces/${workspaceA.id}/test-cases/import/preview`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: poCookie },
          body: JSON.stringify({
            fileName: 'inactive_req_test.csv',
            fileContent: csvContent,
          }),
        },
      );

      assert.strictEqual(previewRes.status, 200);
      const previewData = (await previewRes.json()) as any;
      assert.strictEqual(previewData.preview.totalRows, 1);
      assert.strictEqual(previewData.preview.validRows, 0);
      assert.strictEqual(previewData.preview.invalidRows, 1);
      assert.ok(
        previewData.preview.rows[0].validationErrors.some((e: string) =>
          e.includes('is not active (draft)'),
        ),
      );

      // Attempt commit on this session
      const commitRes = await fetch(
        `${baseUrl}/workspaces/${workspaceA.id}/test-cases/import/commit`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: poCookie },
          body: JSON.stringify({
            importSessionId: previewData.preview.importSessionId,
            contentHash: previewData.preview.contentHash,
            mode: 'create_only',
          }),
        },
      );

      assert.strictEqual(commitRes.status, 201);
      const commitData = (await commitRes.json()) as any;
      assert.strictEqual(commitData.result.createdRows, 0);
      assert.strictEqual(commitData.result.failedRows, 1);
      assert.strictEqual(commitData.result.status, 'failed');
      assert.strictEqual(commitData.result.errors.length, 1);
      assert.ok(commitData.result.errors[0].error.includes('is not active (draft)'));
    });

    test('commitImport strictly rejects invalid priority/testType/scenarioKind without falling back to defaults', async () => {
      const csvContent = [
        'External Reference,Title,Requirement Code,Priority,Scenario Kind,Test Type',
        `TC-INVALID-FIELDS,Invalid Field Case,${requirementA1.code},INVALID_PRIORITY,INVALID_SCENARIO,INVALID_TYPE`,
      ].join('\n');

      const previewRes = await fetch(
        `${baseUrl}/workspaces/${workspaceA.id}/test-cases/import/preview`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: poCookie },
          body: JSON.stringify({
            fileName: 'invalid_fields.csv',
            fileContent: csvContent,
          }),
        },
      );

      assert.strictEqual(previewRes.status, 200);
      const previewData = (await previewRes.json()) as any;
      assert.strictEqual(previewData.preview.validRows, 0);
      assert.strictEqual(previewData.preview.invalidRows, 1);

      const commitRes = await fetch(
        `${baseUrl}/workspaces/${workspaceA.id}/test-cases/import/commit`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: poCookie },
          body: JSON.stringify({
            importSessionId: previewData.preview.importSessionId,
            contentHash: previewData.preview.contentHash,
            mode: 'create_only',
          }),
        },
      );

      assert.strictEqual(commitRes.status, 201);
      const commitData = (await commitRes.json()) as any;
      assert.strictEqual(commitData.result.createdRows, 0);
      assert.strictEqual(commitData.result.failedRows, 1);

      // Verify no test case was created with that external reference
      const createdCase = await TestCaseModel.findOne({
        where: { workspaceId: workspaceA.id, externalReference: 'TC-INVALID-FIELDS' },
      });
      assert.strictEqual(createdCase, null);
    });

    test('recordTestResult rejects payload exceeding 20 evidence attachments or 20 links with 400', async () => {
      const testRunId = await startScopedRun('limit-test-build');

      // Generate 21 links (exceeds max 20)
      const excessiveLinks = Array.from({ length: 21 }, (_, i) => ({
        url: `https://example.com/evidence-${i}.png`,
        label: `Evidence link ${i}`,
      }));

      const recordRes = await fetch(
        `${baseUrl}/workspaces/${workspaceA.id}/test-cases/${executableCaseId}/runs/${testRunId}/results`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
          body: JSON.stringify({
            status: 'passed',
            evidenceLinks: excessiveLinks,
          }),
        },
      );
      assert.strictEqual(recordRes.status, 400);
      const errBody = (await recordRes.json()) as any;
      assert.ok((errBody.detail || errBody.error || '').includes('Evidence links cannot exceed'));
    });

    test('recordTestResult rejects evidence attachments belonging to an unrelated feature task with 400', async () => {
      // Create an unrelated task in workspaceA with an attachment
      const unrelatedTask = await TaskModel.create({
        workspaceId: workspaceA.id,
        title: 'Unrelated Feature Task',
        reporterId: po.id,
        status: 'todo',
        priority: 'medium',
      });

      const unrelatedAttachment = await TaskAttachmentModel.create({
        workspaceId: workspaceA.id,
        taskId: unrelatedTask.id,
        fileName: 'unrelated-evidence.png',
        fileSize: 1024,
        mimeType: 'image/png',
        category: 'qa_evidence',
        storageRef: 'fake-unrelated-key',
        uploaderId: qa.id,
      });

      const testRunId = await startScopedRun('scoping-test-build');

      // Attempt to attach unrelatedAttachment
      const recordRes = await fetch(
        `${baseUrl}/workspaces/${workspaceA.id}/test-cases/${executableCaseId}/runs/${testRunId}/results`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
          body: JSON.stringify({
            status: 'passed',
            evidenceAttachmentIds: [unrelatedAttachment.id],
          }),
        },
      );
      assert.strictEqual(recordRes.status, 400);
      const errBody = (await recordRes.json()) as any;
      assert.ok(
        (errBody.detail || errBody.error || '').includes('does not belong to the Feature Task'),
      );
    });

    test('recordTestResult rejects attachment evidence when Feature provenance cannot be proven', async () => {
      const unscopedCase = await TestCaseModel.create({
        workspaceId: workspaceA.id,
        title: 'Unscoped attachment provenance case',
        testType: 'manual',
        priority: 'medium',
        status: 'active',
        scenarioKind: 'positive',
        source: 'native',
        createdBy: po.id,
      });

      const legacyRun = await TestRunModel.create({
        workspaceId: workspaceA.id,
        testCaseId: unscopedCase.id,
        build: 'unscoped-evidence-build',
        environment: 'staging',
        executorId: qa.id,
      });

      const recordRes = await fetch(
        `${baseUrl}/workspaces/${workspaceA.id}/test-cases/${unscopedCase.id}/runs/${legacyRun.id}/results`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
          body: JSON.stringify({ status: 'passed', evidenceAttachmentIds: [taskAttachmentA.id] }),
        },
      );
      assert.strictEqual(recordRes.status, 400);
      const errBody = (await recordRes.json()) as any;
      assert.ok((errBody.detail || errBody.error || '').includes('has no Requirement mapping'));
    });

    test('expired import sessions persist failed status before the commit request is rejected', async () => {
      const csvContent = [
        'External Reference,Title,Requirement Code',
        `TC-EXPIRED,Expired session case,${requirementA1.code}`,
      ].join('\n');
      const previewRes = await fetch(
        `${baseUrl}/workspaces/${workspaceA.id}/test-cases/import/preview`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: poCookie },
          body: JSON.stringify({ fileName: 'expired.csv', fileContent: csvContent }),
        },
      );
      assert.strictEqual(previewRes.status, 200);
      const previewData = (await previewRes.json()) as any;
      await TestCaseImportModel.update(
        { createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
        { where: { id: previewData.preview.importSessionId } },
      );

      const commitRes = await fetch(
        `${baseUrl}/workspaces/${workspaceA.id}/test-cases/import/commit`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: poCookie },
          body: JSON.stringify({
            importSessionId: previewData.preview.importSessionId,
            contentHash: previewData.preview.contentHash,
            mode: 'create_only',
          }),
        },
      );
      assert.strictEqual(commitRes.status, 400);
      const persisted = await TestCaseImportModel.findByPk(previewData.preview.importSessionId);
      assert.strictEqual(persisted?.status, 'failed');
    });

    describe('AGY-QA-TEST-CASE-ACTIVATION-CONFLICT: Draft Test Case direct activation by QA assignee and coverage update', () => {
      let featureTask: TaskModel;
      let req: RequirementModel;
      let qaSubtask: TaskModel;
      let baseline: FeatureReadinessBaselineModel;
      let cycle: QaTestCycleModel;
      let unversionedDraftCase: TestCaseModel;

      before(async () => {
        featureTask = await TaskModel.create({
          workspaceId: workspaceA.id,
          title: 'QRIS Activation Feature',
          status: 'in_progress',
          priority: 'high',
          reporterId: po.id,
        });

        req = await RequirementModel.create({
          workspaceId: workspaceA.id,
          code: `REQ-ACT-${Date.now()}`,
          title: 'QRIS Direct Activation Req',
          status: 'active',
          createdBy: po.id,
        });

        await TaskRequirementModel.create({
          workspaceId: workspaceA.id,
          taskId: featureTask.id,
          requirementId: req.id,
          linkedBy: po.id,
        });

        const brief = await QaDocumentModel.create({
          workspaceId: workspaceA.id,
          title: 'QRIS Activation Brief',
          docType: 'product_brief',
          status: 'approved',
          currentVersion: 1,
          createdBy: po.id,
        });

        const briefVersion = await QaDocumentVersionModel.create({
          workspaceId: workspaceA.id,
          documentId: brief.id,
          version: 1,
          title: brief.title,
          contentMarkdown: 'QRIS product brief content.',
          createdBy: po.id,
        });

        baseline = await FeatureReadinessBaselineModel.create({
          workspaceId: workspaceA.id,
          featureTaskId: featureTask.id,
          sequence: 1,
          productBriefVersionId: briefVersion.id,
          snapshot: { schemaVersion: 1, integrationFixture: 'activation-conflict' } as any,
          establishedBy: po.id,
        });

        await FeatureReadinessBaselineRequirementModel.create({
          workspaceId: workspaceA.id,
          baselineId: baseline.id,
          requirementId: req.id,
        });

        qaSubtask = await TaskModel.create({
          workspaceId: workspaceA.id,
          parentTaskId: featureTask.id,
          title: 'QA Testing Subtask for Activation',
          deliveryArea: 'qa',
          status: 'in_progress',
          priority: 'high',
          reporterId: po.id,
          assigneeId: qa.id,
        });

        cycle = await QaTestCycleModel.create({
          workspaceId: workspaceA.id,
          featureTaskId: featureTask.id,
          qaSubtaskId: qaSubtask.id,
          readinessBaselineId: baseline.id,
          candidateFingerprint: 'git:activation-audit-1',
          build: 'qris-activation-build-1',
          environment: 'staging',
          status: 'in_progress',
          ownerQaId: qa.id,
        });
        assert.ok(cycle.id);

        // Draft Test Case without version history (reproducing imported / unversioned records)
        unversionedDraftCase = await TestCaseModel.create({
          workspaceId: workspaceA.id,
          externalReference: `TC-UNVERSIONED-${Date.now()}`,
          title: 'Draft case with missing version history',
          testType: 'manual',
          priority: 'high',
          status: 'draft',
          steps: ['Step 1', 'Step 2'],
          expectedResult: 'Success',
          scenarioKind: 'positive',
          source: 'spreadsheet_import',
          createdBy: po.id,
        });

        await TestCaseRequirementModel.create({
          workspaceId: workspaceA.id,
          testCaseId: unversionedDraftCase.id,
          requirementId: req.id,
          linkedBy: po.id,
        });
      });

      test('before activation, release readiness shows 0 covered requirements and failed requirement_coverage gate', async () => {
        const res = await fetch(
          `${baseUrl}/workspaces/${workspaceA.id}/release-readiness?featureTaskIds=${featureTask.id}`,
          { headers: { Cookie: qaCookie } },
        );
        assert.strictEqual(res.status, 200);
        const data = (await res.json()) as any;
        const item = data.readiness.items.find((i: any) => i.featureTaskId === featureTask.id);
        assert.ok(item);
        assert.strictEqual(item.currentReadinessSnapshot.requirements.coveredByActiveTestCases, 0);
        const reqGate = item.currentReadinessSnapshot.evaluation.gates.find(
          (g: any) => g.code === 'requirement_coverage',
        );
        assert.strictEqual(reqGate.status, 'failed');
      });

      test('role outside scope (dev) is forbidden from activating the draft test case (403)', async () => {
        const res = await fetch(
          `${baseUrl}/workspaces/${workspaceA.id}/test-cases/${unversionedDraftCase.id}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Cookie: devCookie },
            body: JSON.stringify({ status: 'active' }),
          },
        );
        assert.strictEqual(res.status, 403);
      });

      test('QA assignee activates unversioned draft Test Case: succeeds, heals revision under DATA-005, re-reads active status', async () => {
        const versionBefore = await TestCaseVersionModel.findOne({
          where: { workspaceId: workspaceA.id, testCaseId: unversionedDraftCase.id },
        });
        assert.strictEqual(versionBefore, null);

        const res = await fetch(
          `${baseUrl}/workspaces/${workspaceA.id}/test-cases/${unversionedDraftCase.id}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
            body: JSON.stringify({ status: 'active' }),
          },
        );
        assert.strictEqual(res.status, 200);
        const body = (await res.json()) as any;
        assert.strictEqual(body.testCase.status, 'active');

        // Re-read directly from GET endpoint
        const getRes = await fetch(
          `${baseUrl}/workspaces/${workspaceA.id}/test-cases/${unversionedDraftCase.id}`,
          { headers: { Cookie: qaCookie } },
        );
        assert.strictEqual(getRes.status, 200);
        const getBody = (await getRes.json()) as any;
        assert.strictEqual(getBody.testCase.status, 'active');

        // Verify TestCaseVersionModel was backfilled with revision 1 and marked active
        const versionAfter = await TestCaseVersionModel.findOne({
          where: { workspaceId: workspaceA.id, testCaseId: unversionedDraftCase.id },
        });
        assert.ok(versionAfter);
        assert.strictEqual(versionAfter.revision, 1);
        assert.strictEqual(versionAfter.lifecycleStatus, 'active');
        assert.strictEqual(versionAfter.origin, 'legacy_backfill');
      });

      test('after activation, release readiness shows requirement covered by active test case and passed gate', async () => {
        const res = await fetch(
          `${baseUrl}/workspaces/${workspaceA.id}/release-readiness?featureTaskIds=${featureTask.id}`,
          { headers: { Cookie: qaCookie } },
        );
        assert.strictEqual(res.status, 200);
        const data = (await res.json()) as any;
        const item = data.readiness.items.find((i: any) => i.featureTaskId === featureTask.id);
        assert.ok(item);
        assert.strictEqual(item.currentReadinessSnapshot.requirements.coveredByActiveTestCases, 1);
        const reqGate = item.currentReadinessSnapshot.evaluation.gates.find(
          (g: any) => g.code === 'requirement_coverage',
        );
        assert.strictEqual(reqGate.status, 'passed');
      });

      test('newly imported test case commits with canonical revision 1 version persisted', async () => {
        const extRef = `TC-IMPORT-${Date.now()}`;
        const csvContent = [
          'External Reference,Title,Requirement Code',
          `${extRef},Imported test case with revision 1,${req.code}`,
        ].join('\n');

        const previewRes = await fetch(
          `${baseUrl}/workspaces/${workspaceA.id}/test-cases/import/preview`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Cookie: poCookie },
            body: JSON.stringify({ fileName: 'new_case.csv', fileContent: csvContent }),
          },
        );
        assert.strictEqual(previewRes.status, 200);
        const previewData = (await previewRes.json()) as any;

        const commitRes = await fetch(
          `${baseUrl}/workspaces/${workspaceA.id}/test-cases/import/commit`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Cookie: poCookie },
            body: JSON.stringify({
              importSessionId: previewData.preview.importSessionId,
              contentHash: previewData.preview.contentHash,
              mode: 'create_only',
            }),
          },
        );
        assert.strictEqual(commitRes.status, 201);
        const commitData = (await commitRes.json()) as any;
        assert.strictEqual(commitData.result.createdRows, 1);

        const createdCase = await TestCaseModel.findOne({
          where: { workspaceId: workspaceA.id, externalReference: extRef },
        });
        assert.ok(createdCase);

        const version = await TestCaseVersionModel.findOne({
          where: { workspaceId: workspaceA.id, testCaseId: createdCase.id },
        });
        assert.ok(version);
        assert.strictEqual(version.revision, 1);
        assert.strictEqual(version.lifecycleStatus, 'draft');
        assert.strictEqual(version.origin, 'native_revision');
      });

      test('real data conflict (e.g. duplicate external reference) returns 409 Conflict with Problem Details', async () => {
        const anotherCase = await TestCaseModel.create({
          workspaceId: workspaceA.id,
          externalReference: `TC-EXISTING-${Date.now()}`,
          title: 'Another existing case',
          testType: 'manual',
          priority: 'medium',
          status: 'draft',
          steps: ['Do this'],
          scenarioKind: 'positive',
          source: 'native',
          createdBy: po.id,
        });

        const conflictRes = await fetch(
          `${baseUrl}/workspaces/${workspaceA.id}/test-cases/${unversionedDraftCase.id}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Cookie: poCookie },
            body: JSON.stringify({ externalReference: anotherCase.externalReference }),
          },
        );
        assert.strictEqual(conflictRes.status, 409);
        const conflictBody = (await conflictRes.json()) as any;
        assert.strictEqual(conflictBody.title || conflictBody.code, 'Conflict');
        assert.ok((conflictBody.detail || conflictBody.error || '').includes('already exists'));
      });
    });
  });
});
