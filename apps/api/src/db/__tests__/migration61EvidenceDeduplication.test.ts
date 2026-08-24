import assert from 'node:assert';
import { describe, test } from 'node:test';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { sequelize } from '../sequelize.js';
import {
  UserModel,
  WorkspaceModel,
  WorkspaceMemberModel,
  TestCaseModel,
  TestRunModel,
  TestResultModel,
  BugModel,
  TaskModel,
  RequirementModel,
} from '../models/index.js';

const require = createRequire(import.meta.url);

describe('Migration 61: Evidence Links Deterministic Deduplication Test', () => {
  test('deduplicates existing duplicate normalized URLs and applies unique indexes cleanly', async () => {
    await sequelize.authenticate();
    const stamp = Date.now();

    const user = await UserModel.create({
      email: `mig61_user_${stamp}@example.com`,
      passwordHash: 'hash',
      name: 'Migration User',
      role: 'owner',
    });

    const workspace = await WorkspaceModel.create({
      name: `Mig61 Workspace ${stamp}`,
      slug: `mig61-ws-${stamp}`,
      ownerId: user.id,
    });

    await WorkspaceMemberModel.create({
      workspaceId: workspace.id,
      userId: user.id,
      role: 'owner',
    });

    const requirement = await RequirementModel.create({
      workspaceId: workspace.id,
      code: `REQ-MIG-${stamp}`,
      title: 'Migration Req',
      status: 'active',
      createdBy: user.id,
    });

    const testCase = await TestCaseModel.create({
      workspaceId: workspace.id,
      title: 'Migration TC',
      testType: 'manual',
      priority: 'high',
      status: 'active',
      scenarioKind: 'positive',
      source: 'native',
      createdBy: user.id,
    });

    const testRun = await TestRunModel.create({
      workspaceId: workspace.id,
      testCaseId: testCase.id,
      build: 'b-1',
      environment: 'staging',
      status: 'completed',
      executorId: user.id,
      startedAt: new Date(),
      completedAt: new Date(),
    });

    const testResult = await TestResultModel.create({
      workspaceId: workspace.id,
      testRunId: testRun.id,
      status: 'passed',
      executorId: user.id,
      executedAt: new Date(),
    });

    const task = await TaskModel.create({
      workspaceId: workspace.id,
      title: 'Feature Task',
      reporterId: user.id,
      status: 'todo',
      priority: 'medium',
    });

    const bug = await BugModel.create({
      workspaceId: workspace.id,
      featureTaskId: task.id,
      requirementId: requirement.id,
      testResultId: testResult.id,
      assigneeId: user.id,
      reproductionDetails: 'Steps to repro',
      title: 'Migration Bug',
      severity: 'high',
      status: 'open',
      createdBy: user.id,
    });

    // Temporarily drop index if present to simulate pre-migration state with existing duplicate rows
    await sequelize.query(`DROP INDEX IF EXISTS idx_test_result_evidence_links_unique_url;`);
    await sequelize.query(`DROP INDEX IF EXISTS idx_bug_evidence_links_unique_url;`);

    const dupUrl = 'https://example.com/duplicate-evidence-link.png';
    const firstId = uuidv4();
    const secondId = uuidv4();
    const earlierDate = new Date(Date.now() - 60000);
    const laterDate = new Date();

    // Insert 2 rows with identical (workspace_id, test_result_id, normalized_url)
    await sequelize.query(
      `INSERT INTO test_result_evidence_links (id, workspace_id, test_result_id, url, provider, media_kind, label, added_by, added_at, normalized_url, preview_status)
       VALUES 
       ('${firstId}', '${workspace.id}', '${testResult.id}', '${dupUrl}', 'direct_image', 'image', 'Canonical 1', '${user.id}', '${earlierDate.toISOString()}', '${dupUrl}', 'ready'),
       ('${secondId}', '${workspace.id}', '${testResult.id}', '${dupUrl}', 'direct_image', 'image', 'Duplicate 2', '${user.id}', '${laterDate.toISOString()}', '${dupUrl}', 'ready');`,
    );

    const bugFirstId = uuidv4();
    const bugSecondId = uuidv4();
    // Insert 2 rows with identical (workspace_id, bug_id, normalized_url)
    await sequelize.query(
      `INSERT INTO bug_evidence_links (id, workspace_id, bug_id, url, provider, media_kind, label, added_by, added_at, normalized_url, preview_status)
       VALUES 
       ('${bugFirstId}', '${workspace.id}', '${bug.id}', '${dupUrl}', 'direct_image', 'image', 'Canonical Bug 1', '${user.id}', '${earlierDate.toISOString()}', '${dupUrl}', 'ready'),
       ('${bugSecondId}', '${workspace.id}', '${bug.id}', '${dupUrl}', 'direct_image', 'image', 'Duplicate Bug 2', '${user.id}', '${laterDate.toISOString()}', '${dupUrl}', 'ready');`,
    );

    // Run migration 61 up
    const migrationFile = resolve(
      process.cwd(),
      'apps/api/src/db/migrations/20260824000061-add-evidence-links-unique-indexes.cjs',
    );
    const fallbackPath = resolve(
      process.cwd(),
      'src/db/migrations/20260824000061-add-evidence-links-unique-indexes.cjs',
    );
    let migration: { up: (qi: unknown, seq: unknown) => Promise<void> };
    try {
      migration = require(migrationFile);
    } catch {
      migration = require(fallbackPath);
    }
    await migration.up(sequelize.getQueryInterface(), sequelize.Sequelize);

    // Verify deduplication: only canonical earliest row remains
    const [resultRows] = (await sequelize.query(
      `SELECT id, label FROM test_result_evidence_links WHERE workspace_id = '${workspace.id}' AND test_result_id = '${testResult.id}';`,
    )) as [Array<{ id: string; label: string }>, unknown];

    assert.strictEqual(resultRows.length, 1);
    assert.strictEqual(resultRows[0].id, firstId);
    assert.strictEqual(resultRows[0].label, 'Canonical 1');

    const [bugRows] = (await sequelize.query(
      `SELECT id, label FROM bug_evidence_links WHERE workspace_id = '${workspace.id}' AND bug_id = '${bug.id}';`,
    )) as [Array<{ id: string; label: string }>, unknown];

    assert.strictEqual(bugRows.length, 1);
    assert.strictEqual(bugRows[0].id, bugFirstId);
    assert.strictEqual(bugRows[0].label, 'Canonical Bug 1');

    // Attempting to insert a duplicate now must fail due to unique constraint
    let caughtError: unknown = null;
    try {
      await sequelize.query(
        `INSERT INTO test_result_evidence_links (id, workspace_id, test_result_id, url, provider, media_kind, label, added_by, added_at, normalized_url, preview_status)
         VALUES ('${uuidv4()}', '${workspace.id}', '${testResult.id}', '${dupUrl}', 'direct_image', 'image', 'Duplicate Insert', '${user.id}', NOW(), '${dupUrl}', 'ready');`,
      );
    } catch (err) {
      caughtError = err;
    }
    assert.ok(
      caughtError !== null,
      'Should have thrown unique constraint error on duplicate insert',
    );
  });
});
