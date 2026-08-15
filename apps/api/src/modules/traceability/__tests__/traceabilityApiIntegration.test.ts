import assert from 'node:assert';
import { test, describe, before, after } from 'node:test';
import { sequelize } from '../../../db/sequelize.js';
import {
  UserModel,
  WorkspaceModel,
  WorkspaceMemberModel,
  TaskModel,
  RequirementModel,
  TaskRequirementModel,
  RequirementTestCaseModel,
  QaDocumentModel,
  TaskDocumentModel,
} from '../../../db/models/index.js';

describe('Traceability & QA Test Case Integration Tests', () => {
  let userA: UserModel;
  let workspace1: WorkspaceModel;
  let task1: TaskModel;
  let req1: RequirementModel;
  let testCase1: RequirementTestCaseModel;
  let doc1: QaDocumentModel;

  before(async () => {
    await sequelize.authenticate();

    userA = await UserModel.create({
      email: `trace_owner_${Date.now()}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Traceability Owner User',
    });

    workspace1 = await WorkspaceModel.create({
      name: 'Traceability Workspace One',
      slug: `trace-ws-one-${Date.now()}`,
      ownerId: userA.id,
    });

    await WorkspaceMemberModel.create({
      workspaceId: workspace1.id,
      userId: userA.id,
      role: 'owner',
    });

    task1 = await TaskModel.create({
      workspaceId: workspace1.id,
      title: 'Auth Implementation Task',
      status: 'in_progress',
      priority: 'high',
      reporterId: userA.id,
    });

    req1 = await RequirementModel.create({
      workspaceId: workspace1.id,
      code: 'REQ-AUTH-001',
      title: 'OAuth2 Authentication Flow',
      description: 'Requirement for secure login',
      createdBy: userA.id,
    });

    doc1 = await QaDocumentModel.create({
      workspaceId: workspace1.id,
      title: 'Auth Master Strategy',
      docType: 'test_strategy',
      currentVersion: 1,
      createdBy: userA.id,
    });

    // Link requirement to task
    await TaskRequirementModel.create({
      workspaceId: workspace1.id,
      taskId: task1.id,
      requirementId: req1.id,
      linkedBy: userA.id,
    });

    // Link document to task
    await TaskDocumentModel.create({
      workspaceId: workspace1.id,
      taskId: task1.id,
      documentId: doc1.id,
      linkedBy: userA.id,
    });
  });

  after(async () => {
    if (task1) await TaskDocumentModel.destroy({ where: { taskId: task1.id } });
    if (task1) await TaskRequirementModel.destroy({ where: { taskId: task1.id } });
    if (req1) await RequirementTestCaseModel.destroy({ where: { requirementId: req1.id } });
    if (doc1) await QaDocumentModel.destroy({ where: { id: doc1.id } });
    if (req1) await RequirementModel.destroy({ where: { id: req1.id } });
    if (task1) await TaskModel.destroy({ where: { id: task1.id } });
    if (workspace1) await WorkspaceModel.destroy({ where: { id: workspace1.id } });
    if (userA) await UserModel.destroy({ where: { id: userA.id } });
  });

  test('Creates requirement test case and lists it for requirement', async () => {
    const { traceabilityService } = await import('../traceabilityService.js');

    const tc = await traceabilityService.createRequirementTestCase(workspace1.id, userA.id, {
      requirementId: req1.id,
      title: 'Verify valid JWT token is returned on login',
      testType: 'e2e',
      status: 'passed',
      executionDetails: 'All 15 assertions passed in Playwright runner',
    });

    testCase1 = await RequirementTestCaseModel.findByPk(tc.id) as RequirementTestCaseModel;
    assert.strictEqual(tc.title, 'Verify valid JWT token is returned on login');
    assert.strictEqual(tc.testType, 'e2e');
    assert.strictEqual(tc.status, 'passed');

    const list = await traceabilityService.listRequirementTestCases(workspace1.id, req1.id, userA.id);
    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0].id, tc.id);
  });

  test('Updates test case execution status', async () => {
    const { traceabilityService } = await import('../traceabilityService.js');

    const updated = await traceabilityService.updateTestCaseStatus(
      workspace1.id,
      testCase1.id,
      userA.id,
      'failed',
      'Token expired prematurely after 30s'
    );

    assert.strictEqual(updated.status, 'failed');
    assert.strictEqual(updated.executionDetails, 'Token expired prematurely after 30s');
  });

  test('Generates Workspace Traceability Matrix summary linking requirements, tasks, docs, and tests', async () => {
    const { traceabilityService } = await import('../traceabilityService.js');

    const summary = await traceabilityService.getWorkspaceTraceabilityMatrix(workspace1.id, userA.id);

    assert.strictEqual(summary.totalRequirements, 1);
    assert.strictEqual(summary.coveredRequirements, 1);
    assert.strictEqual(summary.totalTasks, 1);
    assert.strictEqual(summary.totalTestCases, 1);

    const node = summary.matrix[0];
    assert.strictEqual(node.requirement.code, 'REQ-AUTH-001');
    assert.strictEqual(node.tasks.length, 1);
    assert.strictEqual(node.tasks[0].title, 'Auth Implementation Task');
    assert.strictEqual(node.qaDocuments.length, 1);
    assert.strictEqual(node.qaDocuments[0].title, 'Auth Master Strategy');
    assert.strictEqual(node.testCases.length, 1);
    assert.strictEqual(node.coverageStatus, 'failing'); // because status was updated to failed
  });
});
