import assert from 'node:assert';
import { after, before, describe, test } from 'node:test';
import type { Server } from 'node:http';
import { createApp } from '../../../app.js';
import { sequelize } from '../../../db/sequelize.js';
import {
  RequirementModel,
  TaskAttachmentModel,
  TaskModel,
  TaskRequirementModel,
  TestCaseModel,
  TestCaseRequirementModel,
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
  let featureTaskA: TaskModel;
  let taskAttachmentA: TaskAttachmentModel;
  let createdCaseId: string;

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
      createdBy: po.id,
    });

    requirementA2 = await RequirementModel.create({
      workspaceId: workspaceA.id,
      code: 'REQ-INTAKE-002',
      title: 'Order Confirmation Receipt',
      description: 'Send receipt email',
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

  // SLICE 1: Native Test Case Authoring & Status Lifecycle (D1, D2)
  describe('Slice 1: Native Test Case Authoring & Status Lifecycle', () => {
    test('QA creates draft Test Case with external reference and requirement link (D1)', async () => {
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

    test('QA cannot create a Test Case directly with active status (D1/D2)', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceA.id}/test-cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
        body: JSON.stringify({
          title: 'Direct Active Attempt by QA',
          externalReference: 'TC-QA-ACTIVE',
          testType: 'manual',
          status: 'active',
          steps: ['Step 1'],
          requirementIds: [requirementA1.id],
        }),
      });

      assert.strictEqual(res.status, 403);
    });

    test('QA can request review for draft Test Case (draft -> in_review)', async () => {
      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceA.id}/test-cases/${createdCaseId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
          body: JSON.stringify({
            status: 'in_review',
          }),
        },
      );

      assert.strictEqual(res.status, 200);
      const data = (await res.json()) as any;
      assert.strictEqual(data.testCase.status, 'in_review');
    });

    test('QA cannot publish in_review Test Case to active (D1)', async () => {
      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceA.id}/test-cases/${createdCaseId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
          body: JSON.stringify({
            status: 'active',
          }),
        },
      );

      assert.strictEqual(res.status, 403);
    });

    test('PO can publish in_review Test Case to active (D1/D2)', async () => {
      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceA.id}/test-cases/${createdCaseId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Cookie: poCookie },
          body: JSON.stringify({
            status: 'active',
          }),
        },
      );

      assert.strictEqual(res.status, 200);
      const data = (await res.json()) as any;
      assert.strictEqual(data.testCase.status, 'active');
    });

    test('QA is forbidden from modifying published active Test Cases', async () => {
      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceA.id}/test-cases/${createdCaseId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
          body: JSON.stringify({
            title: 'Unauthorized QA edit on active case',
          }),
        },
      );

      assert.strictEqual(res.status, 403);
    });

    test('PO can modify published active Test Cases and requirement mappings', async () => {
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

      assert.strictEqual(res.status, 200);
      const data = (await res.json()) as any;
      assert.strictEqual(data.testCase.title, 'Authorized PO update on active case');
      assert.strictEqual(data.testCase.requirementIds.length, 2);
    });

    test('Duplicate externalReference within same workspace returns 409 CONFLICT', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceA.id}/test-cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: poCookie },
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

  // SLICE 2: Spreadsheet Import Wizard & Tamper-Proof Staging (D3, D4)
  describe('Slice 2: Spreadsheet Import Wizard, Staging & Tamper Protection', () => {
    let importSessionId: string;
    let validContentHash: string;

    test('Download standard CSV template', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceA.id}/test-cases/template`, {
        headers: { Cookie: qaCookie },
      });

      assert.strictEqual(res.status, 200);
      assert.ok(res.headers.get('content-type')?.includes('text/csv'));
      const csv = await res.text();
      assert.ok(csv.includes('Test Case ID'));
      assert.ok(csv.includes('Requirement Code'));
    });

    test('Preview dry-run stages import session and parses valid/invalid rows', async () => {
      const csvContent = [
        'Test Case ID,Title,Requirement Code,Steps,Expected Result,Test Data,Priority,Scenario Kind,Test Type,Preconditions',
        'TC-IMP-001,Verify invalid CVV rejection,REQ-INTAKE-001,"1. Enter bad CVV\n2. Submit",Error banner,CVV: 000,high,negative,manual,Cart loaded',
        'TC-IMP-002,Verify receipt dispatch,REQ-INTAKE-002,"1. Complete pay\n2. Check inbox",Email arrived,None,medium,positive,manual,Order placed',
        'TC-IMP-003,Invalid req code test,REQ-NON-EXISTENT,Step 1,Result,Data,low,positive,manual,None',
        'TC-IMP-001,Duplicate in file row,REQ-INTAKE-001,Step 1,Result,Data,low,positive,manual,None',
      ].join('\n');

      const res = await fetch(`${baseUrl}/workspaces/${workspaceA.id}/test-cases/import/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
        body: JSON.stringify({
          fileName: 'test_cases_batch_1.csv',
          fileContent: csvContent,
        }),
      });

      assert.strictEqual(res.status, 200);
      const data = (await res.json()) as any;
      assert.ok(data.preview.importSessionId);
      assert.ok(data.preview.contentHash);
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
        headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
        body: JSON.stringify({
          importSessionId,
          contentHash: 'f'.repeat(64), // Tampered hash
          mode: 'create_only',
        }),
      });

      assert.strictEqual(res.status, 400);
    });

    test('Commit import with invalid session ID returns 404', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceA.id}/test-cases/import/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
        body: JSON.stringify({
          importSessionId: '00000000-0000-0000-0000-000000000000',
          contentHash: validContentHash,
          mode: 'create_only',
        }),
      });

      assert.strictEqual(res.status, 404);
    });

    test('QA attempting to commit import in update mode is rejected (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceA.id}/test-cases/import/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
        body: JSON.stringify({
          importSessionId,
          contentHash: validContentHash,
          mode: 'update',
        }),
      });

      assert.strictEqual(res.status, 403);
    });

    test('QA commits import in create_only mode creates draft cases and records audit', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceA.id}/test-cases/import/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
        body: JSON.stringify({
          importSessionId,
          contentHash: validContentHash,
          mode: 'create_only',
        }),
      });

      assert.strictEqual(res.status, 201);
      const data = (await res.json()) as any;
      assert.strictEqual(data.result.createdRows, 2);
      assert.strictEqual(data.result.failedRows, 1);
      assert.strictEqual(data.result.skippedRows, 1);

      const importedCase = await TestCaseModel.findOne({
        where: { workspaceId: workspaceA.id, externalReference: 'TC-IMP-001' },
      });
      assert.ok(importedCase);
      assert.strictEqual(importedCase.title, 'Verify invalid CVV rejection');
      assert.strictEqual(importedCase.status, 'draft');
      assert.strictEqual(importedCase.source, 'spreadsheet_import');
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

    test('Spreadsheet exceeding 500 rows is rejected with 400 Bad Request', async () => {
      const header =
        'Test Case ID,Title,Requirement Code,Steps,Expected Result,Test Data,Priority,Scenario Kind,Test Type,Preconditions';
      const rows = Array.from(
        { length: 501 },
        (_, i) =>
          `TC-OVER-${i},Title ${i},REQ-INTAKE-001,Step 1,Expected,Data,medium,positive,manual,None`,
      );
      const massiveCsv = [header, ...rows].join('\n');

      const res = await fetch(`${baseUrl}/workspaces/${workspaceA.id}/test-cases/import/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: poCookie },
        body: JSON.stringify({
          fileName: 'massive.csv',
          fileContent: massiveCsv,
        }),
      });

      assert.strictEqual(res.status, 400);
    });

    test('Download import error report CSV for failed rows', async () => {
      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceA.id}/test-cases/import/audits/${importSessionId}/errors`,
        {
          headers: { Cookie: qaCookie },
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
    });

    test('Insecure HTTP and non-HTTPS URLs are rejected with 400 Bad Request', async () => {
      const startRes = await fetch(
        `${baseUrl}/workspaces/${workspaceA.id}/test-cases/${executableCaseId}/runs`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
          body: JSON.stringify({
            build: 'v1.0.0-rc1',
            environment: 'staging',
          }),
        },
      );
      assert.strictEqual(startRes.status, 201);
      const startData = (await startRes.json()) as any;
      const insecureRunId = startData.testRun.id;

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

    test('QA records Test Result linking formal task attachments and HTTPS evidence links', async () => {
      const startRes = await fetch(
        `${baseUrl}/workspaces/${workspaceA.id}/test-cases/${executableCaseId}/runs`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
          body: JSON.stringify({
            build: 'v1.0.0-rc2',
            environment: 'staging',
          }),
        },
      );
      assert.strictEqual(startRes.status, 201);
      const startData = (await startRes.json()) as any;
      testRunId = startData.testRun.id;

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
          }),
        },
      );

      assert.strictEqual(res.status, 409);
    });

    test('Opening a Bug inherits both formal attachments and evidence links from Test Result', async () => {
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

      assert.strictEqual(bugRes.status, 201);
      const bugData = (await bugRes.json()) as any;
      bugId = bugData.bug.id;

      assert.ok(bugData.bug.originatingTestResult);
      assert.strictEqual(bugData.bug.originatingTestResult.evidence.length, 1);
      assert.strictEqual(
        bugData.bug.originatingTestResult.evidence[0].attachmentId,
        taskAttachmentA.id,
      );
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

      // Dev starts work on Bug (open -> in_progress)
      const startWorkRes = await fetch(`${baseUrl}/workspaces/${workspaceA.id}/bugs/${bugId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: devCookie },
        body: JSON.stringify({
          status: 'in_progress',
        }),
      });
      assert.strictEqual(startWorkRes.status, 200);

      // Dev adds resolution evidence link to Bug
      const devEvidenceRes = await fetch(
        `${baseUrl}/workspaces/${workspaceA.id}/bugs/${bugId}/evidence-links?kind=resolution`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: devCookie },
          body: JSON.stringify({
            url: 'https://example.com/fix-verification.mp4',
            label: 'Local fix verification video',
          }),
        },
      );
      assert.strictEqual(devEvidenceRes.status, 201);

      // Developer resolves bug with resolution notes (in_progress -> resolved)
      const resolveRes = await fetch(`${baseUrl}/workspaces/${workspaceA.id}/bugs/${bugId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: devCookie },
        body: JSON.stringify({
          status: 'resolved',
          resolutionNotes: 'Fixed null pointer exception in Stripe token handler.',
        }),
      });
      assert.strictEqual(resolveRes.status, 200);

      // QA verifies bug
      const verifyRes = await fetch(`${baseUrl}/workspaces/${workspaceA.id}/bugs/${bugId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: qaCookie },
        body: JSON.stringify({
          status: 'verified',
        }),
      });
      assert.strictEqual(verifyRes.status, 200);
      const verifiedData = (await verifyRes.json()) as any;
      assert.strictEqual(verifiedData.bug.status, 'verified');
      assert.strictEqual(verifiedData.bug.bugEvidenceLinks.length, 2);
    });
  });
});
