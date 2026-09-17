import assert from 'node:assert';
import { after, before, describe, test } from 'node:test';
import { UniqueConstraintError } from 'sequelize';
import {
  AcceptanceCriterionModel,
  RequirementModel,
  TestCaseModel,
  TestCaseVersionAcceptanceCriterionModel,
  TestCaseVersionModel,
  UserModel,
  WorkspaceModel,
} from '../models/index.js';
import { sequelize } from '../sequelize.js';

describe('Test Case Version and Acceptance Criterion Foundation (S2A)', () => {
  let author: UserModel;
  let workspace: WorkspaceModel;
  let requirement: RequirementModel;
  let testCase: TestCaseModel;
  let acceptanceCriterion: AcceptanceCriterionModel;

  before(async () => {
    await sequelize.authenticate();
    const stamp = Date.now();
    author = await UserModel.create({
      email: `test-case-version-${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Test Case Version Author',
      role: 'qa',
    });
    workspace = await WorkspaceModel.create({
      name: 'Test Case Version Foundation',
      slug: `test-case-version-${stamp}`,
      ownerId: author.id,
    });
    requirement = await RequirementModel.create({
      workspaceId: workspace.id,
      code: `REQ-VERSION-${stamp}`,
      title: 'Versioned acceptance criterion',
      createdBy: author.id,
    });
    testCase = await TestCaseModel.create({
      workspaceId: workspace.id,
      title: 'A versioned Test Case',
      testType: 'manual',
      priority: 'medium',
      status: 'draft',
      steps: ['Open the workflow'],
      scenarioKind: 'positive',
      source: 'native',
      createdBy: author.id,
    });
    acceptanceCriterion = await AcceptanceCriterionModel.create({
      workspaceId: workspace.id,
      requirementId: requirement.id,
      sequence: 1,
      text: 'The workflow opens for the authorized user.',
      createdBy: author.id,
    });
  });

  after(async () => {
    if (workspace) await WorkspaceModel.destroy({ where: { id: workspace.id }, force: true });
    if (author) await UserModel.destroy({ where: { id: author.id }, force: true });
  });

  test('persists one immutable revision and its AC mapping with Workspace integrity', async () => {
    const version = await TestCaseVersionModel.create({
      workspaceId: workspace.id,
      testCaseId: testCase.id,
      revision: 1,
      lifecycleStatus: 'draft',
      definitionSnapshot: { title: testCase.title, requirementIds: [requirement.id] },
      authoredBy: author.id,
    });

    await TestCaseVersionAcceptanceCriterionModel.create({
      workspaceId: workspace.id,
      testCaseVersionId: version.id,
      acceptanceCriterionId: acceptanceCriterion.id,
      mappingStatus: 'mapped',
      mappedBy: author.id,
    });

    assert.strictEqual(
      await TestCaseVersionAcceptanceCriterionModel.count({
        where: { workspaceId: workspace.id, testCaseVersionId: version.id },
      }),
      1,
    );

    await assert.rejects(
      () => version.update({ definitionSnapshot: { title: 'Mutated definition' } }),
      /Test Case version definition is immutable/,
    );
    await assert.rejects(
      () =>
        TestCaseVersionModel.create({
          workspaceId: workspace.id,
          testCaseId: testCase.id,
          revision: 1,
          lifecycleStatus: 'draft',
          definitionSnapshot: { title: testCase.title },
          authoredBy: author.id,
        }),
      UniqueConstraintError,
    );
  });
});
