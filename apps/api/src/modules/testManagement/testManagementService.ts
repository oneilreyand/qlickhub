import { Op, type Transaction } from 'sequelize';
import {
  CreateEvidenceLinkInput,
  CreateTestCaseInput,
  CreateTestResultInput,
  CreateTestRunInput,
  ListTestCasesQuery,
  MAX_EVIDENCE_ATTACHMENTS,
  MAX_EVIDENCE_LINKS,
  TestCase,
  TestCaseActivity,
  TestResult,
  TestResultEvidenceLink,
  TestRun,
  TaskTestExecutionWorkspace,
  UpdateTestCaseInput,
} from '@qlick/contracts';

import { sequelize } from '../../db/sequelize.js';
import {
  RequirementModel,
  TaskModel,
  TaskRequirementModel,
  TaskAttachmentModel,
  TestCaseActivityModel,
  TestCaseModel,
  TestCaseRequirementModel,
  TestResultEvidenceModel,
  TestResultEvidenceLinkModel,
  TestResultModel,
  TestRunModel,
  UserModel,
  WorkspaceMemberModel,
} from '../../db/models/index.js';
import { assertCanAccessTask } from '../../policies/taskPolicy.js';
import {
  assertCanAddTestResultEvidence,
  assertCanCreateTestCase,
  assertCanExecuteTestRun,
  assertCanReadTestManagement,
  assertCanUpdateTestCase,
} from '../../policies/testManagementPolicy.js';
import { normalizeEvidenceUrl } from './evidenceNormalizer.js';
import { fcmService } from '../../services/fcmService.js';

type TestCaseWithLinks = TestCaseModel & { requirementLinks?: TestCaseRequirementModel[] };
type EvidenceLinkWithAttachment = TestResultEvidenceModel & { attachment?: TaskAttachmentModel };
type TestResultWithEvidence = TestResultModel & {
  evidenceLinks?: EvidenceLinkWithAttachment[];
  externalEvidenceLinks?: TestResultEvidenceLinkModel[];
};
type TestRunWithResult = TestRunModel & { result?: TestResultWithEvidence | null };

async function getMembership(workspaceId: string, actorId: string, transaction?: Transaction) {
  const membership = await WorkspaceMemberModel.findOne({
    where: { workspaceId, userId: actorId },
    transaction,
  });
  if (!membership) {
    throw new Error('FORBIDDEN: You are not a member of this workspace.');
  }
  return membership;
}

function iso(value: Date): string {
  return new Date(value).toISOString();
}

function formatTestCase(testCase: TestCaseWithLinks): TestCase {
  return {
    id: testCase.id,
    workspaceId: testCase.workspaceId,
    externalReference: testCase.externalReference || null,
    title: testCase.title,
    description: testCase.description || null,
    testType: testCase.testType,
    priority: testCase.priority,
    status: testCase.status,
    preconditions: testCase.preconditions || null,
    steps: testCase.steps || [],
    expectedResult: testCase.expectedResult || null,
    testData: testCase.testData || null,
    scenarioKind: testCase.scenarioKind,
    source: testCase.source,
    requirementIds: (testCase.requirementLinks || []).map((link) => link.requirementId),
    createdBy: testCase.createdBy,
    createdAt: iso(testCase.createdAt),
    updatedAt: iso(testCase.updatedAt),
  };
}

function formatEvidenceLink(link: TestResultEvidenceLinkModel): TestResultEvidenceLink {
  return {
    id: link.id,
    workspaceId: link.workspaceId,
    testResultId: link.testResultId,
    url: link.url,
    provider: link.provider,
    mediaKind: link.mediaKind,
    label: link.label || null,
    addedBy: link.addedBy,
    addedAt: iso(link.addedAt),
    normalizedUrl: link.normalizedUrl,
    previewStatus: link.previewStatus,
  };
}

function formatResult(result: TestResultWithEvidence): TestResult {
  return {
    id: result.id,
    workspaceId: result.workspaceId,
    testRunId: result.testRunId,
    status: result.status,
    executorId: result.executorId,
    actualResult: result.actualResult || null,
    notes: result.notes || null,
    executedAt: iso(result.executedAt),
    evidence: (result.evidenceLinks || []).map((link) => ({
      attachmentId: link.attachmentId,
      taskId: link.attachment?.taskId || '00000000-0000-0000-0000-000000000000',
      fileName: link.attachment?.fileName || 'Evidence',
      mimeType: link.attachment?.mimeType || 'application/octet-stream',
      linkedBy: link.linkedBy,
      linkedAt: iso(link.linkedAt),
    })),

    evidenceLinks: (result.externalEvidenceLinks || []).map(formatEvidenceLink),
    createdAt: iso(result.createdAt),
  };
}

function formatRun(run: TestRunWithResult): TestRun {
  return {
    id: run.id,
    workspaceId: run.workspaceId,
    testCaseId: run.testCaseId,
    build: run.build,
    environment: run.environment,
    status: run.status,
    executorId: run.executorId,
    startedAt: iso(run.startedAt),
    completedAt: run.completedAt ? iso(run.completedAt) : null,
    result: run.result ? formatResult(run.result) : null,
    createdAt: iso(run.createdAt),
  };
}

function formatActivity(activity: TestCaseActivityModel): TestCaseActivity {
  return {
    id: activity.id,
    workspaceId: activity.workspaceId,
    testCaseId: activity.testCaseId,
    testRunId: activity.testRunId || null,
    testResultId: activity.testResultId || null,
    actorId: activity.actorId,
    action: activity.action,
    metadata: activity.metadata || null,
    createdAt: iso(activity.createdAt),
  };
}

const testCaseIncludes = [{ model: TestCaseRequirementModel, as: 'requirementLinks' }];
const testRunIncludes = [
  {
    model: TestResultModel,
    as: 'result',
    include: [
      {
        model: TestResultEvidenceModel,
        as: 'evidenceLinks',
        include: [{ model: TaskAttachmentModel, as: 'attachment' }],
      },
      {
        model: TestResultEvidenceLinkModel,
        as: 'externalEvidenceLinks',
        where: { deduplicatedAt: null },
        required: false,
      },
    ],
  },
];

export class TestManagementService {
  async getTaskTestExecutions(
    workspaceId: string,
    taskId: string,
    actorId: string,
  ): Promise<TaskTestExecutionWorkspace> {
    const membership = await getMembership(workspaceId, actorId);
    assertCanReadTestManagement(membership.role);

    const requestedTask = await TaskModel.findOne({ where: { id: taskId, workspaceId } });
    if (!requestedTask) {
      throw new Error('NOT_FOUND: Task not found in this workspace.');
    }

    const featureTask = requestedTask.parentTaskId
      ? await TaskModel.findOne({ where: { id: requestedTask.parentTaskId, workspaceId } })
      : requestedTask;
    if (!featureTask) {
      throw new Error('NOT_FOUND: Parent Feature not found in this workspace.');
    }

    const hasAssignedSubtask =
      (await TaskModel.count({
        where: { workspaceId, parentTaskId: featureTask.id, assigneeId: actorId },
      })) > 0;
    assertCanAccessTask(membership.role, actorId, requestedTask, hasAssignedSubtask);

    const subtasks = await TaskModel.findAll({
      where: { workspaceId, parentTaskId: featureTask.id },
      attributes: ['id'],
    });
    const deliveryTaskIds = [featureTask.id, ...subtasks.map((subtask) => subtask.id)];
    const taskRequirementLinks = await TaskRequirementModel.findAll({
      where: { workspaceId, taskId: deliveryTaskIds },
      attributes: ['requirementId'],
    });
    const requirementIds = [...new Set(taskRequirementLinks.map((link) => link.requirementId))];

    if (requirementIds.length === 0) {
      return {
        workspaceId,
        requestedTaskId: requestedTask.id,
        featureTaskId: featureTask.id,
        executions: [],
      };
    }

    const scopedTestCaseLinks = await TestCaseRequirementModel.findAll({
      where: { workspaceId, requirementId: requirementIds },
      attributes: ['testCaseId'],
    });
    const testCaseIds = [...new Set(scopedTestCaseLinks.map((link) => link.testCaseId))];

    if (testCaseIds.length === 0) {
      return {
        workspaceId,
        requestedTaskId: requestedTask.id,
        featureTaskId: featureTask.id,
        executions: [],
      };
    }

    const [testCases, testRuns] = await Promise.all([
      TestCaseModel.findAll({
        where: { workspaceId, id: testCaseIds },
        include: testCaseIncludes,
        order: [['createdAt', 'ASC']],
      }),
      TestRunModel.findAll({
        where: { workspaceId, testCaseId: testCaseIds },
        include: testRunIncludes,
        order: [['startedAt', 'DESC']],
      }),
    ]);

    const runsByTestCase = new Map<string, TestRun[]>();
    for (const run of testRuns) {
      const formattedRun = formatRun(run as TestRunWithResult);
      const existing = runsByTestCase.get(run.testCaseId) || [];
      existing.push(formattedRun);
      runsByTestCase.set(run.testCaseId, existing);
    }

    return {
      workspaceId,
      requestedTaskId: requestedTask.id,
      featureTaskId: featureTask.id,
      executions: testCases.map((testCase) => {
        const runs = runsByTestCase.get(testCase.id) || [];
        return {
          testCase: formatTestCase(testCase as TestCaseWithLinks),
          latestRun: runs[0] || null,
          testRuns: runs,
        };
      }),
    };
  }

  async listTestCases(
    workspaceId: string,
    actorId: string,
    query?: ListTestCasesQuery,
  ): Promise<TestCase[]> {
    const membership = await getMembership(workspaceId, actorId);
    assertCanReadTestManagement(membership.role);

    const where: Record<string, unknown> = { workspaceId };
    if (query?.status) {
      where.status = query.status;
    }
    if (query?.search) {
      where[Op.or as unknown as string] = [
        { title: { [Op.iLike]: `%${query.search}%` } },
        { externalReference: { [Op.iLike]: `%${query.search}%` } },
      ];
    }

    if (query?.requirementId) {
      const links = await TestCaseRequirementModel.findAll({
        where: { workspaceId, requirementId: query.requirementId },
        attributes: ['testCaseId'],
      });
      const caseIds = links.map((l) => l.testCaseId);
      where.id = { [Op.in]: caseIds };
    }

    const testCases = await TestCaseModel.findAll({
      where,
      include: testCaseIncludes,
      order: [['createdAt', 'ASC']],
    });
    return testCases.map((testCase) => formatTestCase(testCase as TestCaseWithLinks));
  }

  async getTestCase(workspaceId: string, testCaseId: string, actorId: string): Promise<TestCase> {
    const membership = await getMembership(workspaceId, actorId);
    assertCanReadTestManagement(membership.role);

    const testCase = await TestCaseModel.findOne({
      where: { id: testCaseId, workspaceId },
      include: testCaseIncludes,
    });
    if (!testCase) {
      throw new Error('NOT_FOUND: Test Case not found in this workspace.');
    }
    return formatTestCase(testCase as TestCaseWithLinks);
  }

  async createTestCase(actorId: string, input: CreateTestCaseInput): Promise<TestCase> {
    const requirementIds = [...new Set(input.requirementIds)];
    if (requirementIds.length !== input.requirementIds.length) {
      throw new Error('BAD_REQUEST: Requirement links must not contain duplicates.');
    }

    const testCase = await sequelize.transaction(async (transaction) => {
      const membership = await getMembership(input.workspaceId, actorId, transaction);
      assertCanCreateTestCase(membership.role);
      if (membership.role === 'qa' && input.status && input.status !== 'draft') {
        throw new Error(
          'FORBIDDEN: QA can create only draft Test Cases and may submit them for review; only Product Owner, Admin, or Owner can publish or archive.',
        );
      }
      if (input.status && input.status !== 'draft') {
        throw new Error(
          'BAD_REQUEST: New Test Cases must start as draft and follow the review lifecycle.',
        );
      }
      const effectiveStatus = 'draft';

      const requirements = await RequirementModel.findAll({
        where: { workspaceId: input.workspaceId, id: requirementIds },
        transaction,
      });
      if (requirements.length !== requirementIds.length) {
        throw new Error('BAD_REQUEST: Every Requirement must belong to this workspace.');
      }

      if (input.externalReference) {
        const existingRef = await TestCaseModel.findOne({
          where: { workspaceId: input.workspaceId, externalReference: input.externalReference },
          transaction,
        });
        if (existingRef) {
          throw new Error(
            `CONFLICT: External reference "${input.externalReference}" already exists in this workspace.`,
          );
        }
      }

      const created = await TestCaseModel.create(
        {
          workspaceId: input.workspaceId,
          externalReference: input.externalReference || null,
          title: input.title,
          description: input.description || null,
          testType: input.testType,
          priority: input.priority || 'medium',
          status: effectiveStatus,
          preconditions: input.preconditions || null,
          steps: input.steps,
          expectedResult: input.expectedResult || null,
          testData: input.testData || null,
          scenarioKind: input.scenarioKind || 'positive',
          source: input.source || 'native',
          createdBy: actorId,
        },
        { transaction },
      );

      await TestCaseRequirementModel.bulkCreate(
        requirementIds.map((requirementId) => ({
          workspaceId: input.workspaceId,
          testCaseId: created.id,
          requirementId,
          linkedBy: actorId,
        })),
        { transaction },
      );

      await TestCaseActivityModel.create(
        {
          workspaceId: input.workspaceId,
          testCaseId: created.id,
          actorId,
          action: 'test_case_created',
          metadata: {
            requirementIds,
            status: created.status,
            priority: created.priority,
            externalReference: created.externalReference,
          },
        },
        { transaction },
      );

      return created;
    });

    return this.getTestCase(input.workspaceId, testCase.id, actorId);
  }

  async updateTestCase(actorId: string, input: UpdateTestCaseInput): Promise<TestCase> {
    await sequelize.transaction(async (transaction) => {
      const membership = await getMembership(input.workspaceId, actorId, transaction);
      const testCase = await TestCaseModel.findOne({
        where: { id: input.testCaseId, workspaceId: input.workspaceId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!testCase) {
        throw new Error('NOT_FOUND: Test Case not found in this workspace.');
      }

      assertCanUpdateTestCase(membership.role, testCase.status, input.status);

      if (input.externalReference && input.externalReference !== testCase.externalReference) {
        const existingRef = await TestCaseModel.findOne({
          where: {
            workspaceId: input.workspaceId,
            externalReference: input.externalReference,
            id: { [Op.ne]: input.testCaseId },
          },
          transaction,
        });
        if (existingRef) {
          throw new Error(
            `CONFLICT: External reference "${input.externalReference}" already exists in this workspace.`,
          );
        }
      }

      const updates: Partial<TestCaseModel> = {};
      if (input.title !== undefined) updates.title = input.title;
      if (input.description !== undefined) updates.description = input.description || null;
      if (input.testType !== undefined) updates.testType = input.testType;
      if (input.priority !== undefined) updates.priority = input.priority;
      if (input.status !== undefined) updates.status = input.status;
      if (input.preconditions !== undefined) updates.preconditions = input.preconditions || null;
      if (input.steps !== undefined) updates.steps = input.steps;
      if (input.expectedResult !== undefined) updates.expectedResult = input.expectedResult || null;
      if (input.testData !== undefined) updates.testData = input.testData || null;
      if (input.scenarioKind !== undefined) updates.scenarioKind = input.scenarioKind;
      if (input.externalReference !== undefined)
        updates.externalReference = input.externalReference || null;

      await testCase.update(updates, { transaction });

      if (input.requirementIds) {
        const uniqueReqIds = [...new Set(input.requirementIds)];
        const reqs = await RequirementModel.findAll({
          where: { workspaceId: input.workspaceId, id: uniqueReqIds },
          transaction,
        });
        if (reqs.length !== uniqueReqIds.length) {
          throw new Error('BAD_REQUEST: Every Requirement must belong to this workspace.');
        }

        await TestCaseRequirementModel.destroy({
          where: { workspaceId: input.workspaceId, testCaseId: input.testCaseId },
          transaction,
        });

        await TestCaseRequirementModel.bulkCreate(
          uniqueReqIds.map((reqId) => ({
            workspaceId: input.workspaceId,
            testCaseId: input.testCaseId,
            requirementId: reqId,
            linkedBy: actorId,
          })),
          { transaction },
        );
      }

      await TestCaseActivityModel.create(
        {
          workspaceId: input.workspaceId,
          testCaseId: input.testCaseId,
          actorId,
          action:
            input.status && input.status !== testCase.status
              ? 'test_case_status_changed'
              : 'test_case_updated',
          metadata: {
            previousStatus: testCase.status,
            newStatus: input.status || testCase.status,
            updatedFields: Object.keys(updates),
          },
        },
        { transaction },
      );
    });

    return this.getTestCase(input.workspaceId, input.testCaseId, actorId);
  }

  async createTestRun(actorId: string, input: CreateTestRunInput): Promise<TestRun> {
    const run = await sequelize.transaction(async (transaction) => {
      const membership = await getMembership(input.workspaceId, actorId, transaction);
      assertCanExecuteTestRun(membership.role);

      const testCase = await TestCaseModel.findOne({
        where: { id: input.testCaseId, workspaceId: input.workspaceId, status: 'active' },
        transaction,
      });
      if (!testCase) {
        throw new Error('NOT_FOUND: Active Test Case not found in this workspace.');
      }

      const created = await TestRunModel.create(
        {
          workspaceId: input.workspaceId,
          testCaseId: input.testCaseId,
          build: input.build,
          environment: input.environment,
          status: 'in_progress',
          executorId: actorId,
        },
        { transaction },
      );

      await TestCaseActivityModel.create(
        {
          workspaceId: input.workspaceId,
          testCaseId: input.testCaseId,
          testRunId: created.id,
          actorId,
          action: 'test_run_started',
          metadata: { build: input.build, environment: input.environment },
        },
        { transaction },
      );

      return created;
    });

    return formatRun(run as TestRunWithResult);
  }

  async recordTestResult(actorId: string, input: CreateTestResultInput): Promise<TestRun> {
    const evidenceAttachmentIds = [...new Set(input.evidenceAttachmentIds || [])];
    if (evidenceAttachmentIds.length !== (input.evidenceAttachmentIds || []).length) {
      throw new Error('BAD_REQUEST: Evidence references must not contain duplicates.');
    }

    if (evidenceAttachmentIds.length > MAX_EVIDENCE_ATTACHMENTS) {
      throw new Error(
        `BAD_REQUEST: Evidence attachments cannot exceed ${MAX_EVIDENCE_ATTACHMENTS} files.`,
      );
    }

    const evidenceLinksInput = input.evidenceLinks || [];
    if (evidenceLinksInput.length > MAX_EVIDENCE_LINKS) {
      throw new Error(`BAD_REQUEST: Evidence links cannot exceed ${MAX_EVIDENCE_LINKS} links.`);
    }

    await sequelize.transaction(async (transaction) => {
      const membership = await getMembership(input.workspaceId, actorId, transaction);
      assertCanExecuteTestRun(membership.role);

      const run = await TestRunModel.findOne({
        where: {
          id: input.testRunId,
          workspaceId: input.workspaceId,
          testCaseId: input.testCaseId,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!run) {
        throw new Error('NOT_FOUND: Test Run not found for this Test Case and workspace.');
      }
      if (run.status !== 'in_progress') {
        throw new Error('CONFLICT: This Test Run is already finalized and cannot be overwritten.');
      }

      const existingResult = await TestResultModel.findOne({
        where: { workspaceId: input.workspaceId, testRunId: input.testRunId },
        transaction,
      });
      if (existingResult) {
        throw new Error('CONFLICT: This Test Run already has an immutable Result.');
      }

      if (evidenceAttachmentIds.length > 0) {
        const attachments = await TaskAttachmentModel.findAll({
          where: {
            workspaceId: input.workspaceId,
            id: evidenceAttachmentIds,
            category: 'qa_evidence',
          },
          transaction,
        });
        if (attachments.length !== evidenceAttachmentIds.length) {
          throw new Error('BAD_REQUEST: Evidence must reference QA evidence in this workspace.');
        }

        // Validate task-scoping: attachments must belong to the feature task or subtasks associated with this test case
        const tcReqs = await TestCaseRequirementModel.findAll({
          where: { workspaceId: input.workspaceId, testCaseId: input.testCaseId },
          attributes: ['requirementId'],
          transaction,
        });
        const reqIds = tcReqs.map((r) => r.requirementId);

        if (reqIds.length === 0) {
          throw new Error(
            'BAD_REQUEST: Evidence attachment provenance cannot be verified because this Test Case has no Requirement mapping.',
          );
        }

        const taskReqs = await TaskRequirementModel.findAll({
          where: { workspaceId: input.workspaceId, requirementId: reqIds },
          attributes: ['taskId'],
          transaction,
        });
        const linkedTaskIds = taskReqs.map((tr) => tr.taskId);

        if (linkedTaskIds.length === 0) {
          throw new Error(
            'BAD_REQUEST: Evidence attachment provenance cannot be verified because the mapped Requirement has no Feature Task.',
          );
        }

        const linkedTasks = await TaskModel.findAll({
          where: { workspaceId: input.workspaceId, id: linkedTaskIds },
          attributes: ['id', 'parentTaskId'],
          transaction,
        });
        const featureTaskIds = [...new Set(linkedTasks.map((t) => t.parentTaskId || t.id))];

        if (featureTaskIds.length === 0) {
          throw new Error(
            'BAD_REQUEST: Evidence attachment Feature Task scope could not be resolved.',
          );
        }

        const allScopedTasks = await TaskModel.findAll({
          where: {
            workspaceId: input.workspaceId,
            [Op.or]: [{ id: featureTaskIds }, { parentTaskId: featureTaskIds }],
          },
          attributes: ['id'],
          transaction,
        });
        const allowedTaskIds = new Set(allScopedTasks.map((t) => t.id));

        for (const att of attachments) {
          if (!allowedTaskIds.has(att.taskId)) {
            throw new Error(
              `BAD_REQUEST: Attachment "${att.fileName}" does not belong to the Feature Task or Subtasks associated with this Test Case.`,
            );
          }
        }
      }

      const executedAt = new Date();
      const result = await TestResultModel.create(
        {
          workspaceId: input.workspaceId,
          testRunId: input.testRunId,
          status: input.status,
          executorId: actorId,
          actualResult: input.actualResult || null,
          notes: input.notes || null,
          executedAt,
        },
        { transaction },
      );

      if (evidenceAttachmentIds.length > 0) {
        await TestResultEvidenceModel.bulkCreate(
          evidenceAttachmentIds.map((attachmentId) => ({
            workspaceId: input.workspaceId,
            testResultId: result.id,
            attachmentId,
            linkedBy: actorId,
          })),
          { transaction },
        );
      }

      if (evidenceLinksInput.length > 0) {
        const seenNormalized = new Set<string>();
        for (const link of evidenceLinksInput) {
          const normalized = normalizeEvidenceUrl(link.url);
          if (seenNormalized.has(normalized.normalizedUrl)) {
            throw new Error('CONFLICT: Duplicate evidence link detected in test result payload.');
          }
          seenNormalized.add(normalized.normalizedUrl);

          try {
            await TestResultEvidenceLinkModel.create(
              {
                workspaceId: input.workspaceId,
                testResultId: result.id,
                url: link.url,
                provider: normalized.provider,
                mediaKind: normalized.mediaKind,
                label: link.label || null,
                addedBy: actorId,
                normalizedUrl: normalized.normalizedUrl,
                previewStatus: normalized.previewStatus,
              },
              { transaction },
            );
          } catch (err: any) {
            if (err.name === 'SequelizeUniqueConstraintError') {
              throw new Error(
                'CONFLICT: This evidence link is already attached to this Test Result.',
                { cause: err },
              );
            }
            throw err;
          }
        }
      }

      await run.update({ status: 'completed', completedAt: executedAt }, { transaction });

      await TestCaseActivityModel.create(
        {
          workspaceId: input.workspaceId,
          testCaseId: input.testCaseId,
          testRunId: input.testRunId,
          testResultId: result.id,
          actorId,
          action: 'test_result_recorded',
          metadata: {
            build: run.build,
            environment: run.environment,
            status: input.status,
            evidenceAttachmentIds,
            evidenceLinksCount: evidenceLinksInput.length,
          },
        },
        { transaction },
      );
    });

    const completedRun = await this.findRun(input.workspaceId, input.testCaseId, input.testRunId);
    if (!completedRun) {
      throw new Error('NOT_FOUND: Completed Test Run could not be reloaded.');
    }

    if (input.status === 'failed' || input.status === 'blocked') {
      Promise.all([
        TestCaseModel.findByPk(input.testCaseId, { attributes: ['id', 'title'] }),
        UserModel.findByPk(actorId, { attributes: ['id', 'name', 'email'] }),
        TestCaseRequirementModel.findAll({
          where: { workspaceId: input.workspaceId, testCaseId: input.testCaseId },
          attributes: ['requirementId'],
        }),
      ])
        .then(async ([testCase, actor, testCaseRequirements]) => {
          if (testCase && testCaseRequirements.length > 0) {
            const tasks = await TaskModel.findAll({
              where: { workspaceId: input.workspaceId },
              include: [
                {
                  model: TaskRequirementModel,
                  as: 'requirementLinks',
                  attributes: [],
                  required: true,
                  where: {
                    workspaceId: input.workspaceId,
                    requirementId: testCaseRequirements.map((link) => link.requirementId),
                  },
                },
              ],
              attributes: ['id', 'title', 'assigneeId', 'reporterId'],
            });
            const testerName = actor?.name || actor?.email || 'QA Tester';
            const uniqueTasks = [...new Map(tasks.map((task) => [task.id, task])).values()];
            await Promise.all(
              uniqueTasks.map(async (task) => {
                const recipients = [task.assigneeId, task.reporterId].filter((id): id is string =>
                  Boolean(id && id !== actorId),
                );
                if (recipients.length > 0) {
                  await fcmService.sendTestFailureNotification({
                    recipientUserIds: Array.from(new Set(recipients)),
                    testerName,
                    testerId: actorId,
                    testCaseTitle: testCase.title,
                    taskTitle: task.title,
                    taskId: task.id,
                    workspaceId: input.workspaceId,
                    status: input.status as 'failed' | 'blocked',
                  });
                }
              }),
            );
          }
        })
        .catch(() => {});
    }

    return formatRun(completedRun);
  }

  async addTestResultEvidenceLink(
    actorId: string,
    workspaceId: string,
    testCaseId: string,
    testRunId: string,
    input: CreateEvidenceLinkInput,
  ): Promise<TestResultEvidenceLink> {
    const membership = await getMembership(workspaceId, actorId);
    assertCanAddTestResultEvidence(membership.role);

    const run = (await TestRunModel.findOne({
      where: { id: testRunId, workspaceId, testCaseId },
      include: [{ model: TestResultModel, as: 'result' }],
    })) as TestRunWithResult | null;

    if (!run || !run.result) {
      throw new Error('NOT_FOUND: Finalized Test Result not found for this Run.');
    }

    const normalized = normalizeEvidenceUrl(input.url);

    const existingLink = await TestResultEvidenceLinkModel.findOne({
      where: {
        testResultId: run.result!.id,
        deduplicatedAt: null,
        [Op.or]: [{ normalizedUrl: normalized.normalizedUrl }, { url: input.url }],
      },
    });
    if (existingLink) {
      throw new Error('CONFLICT: This evidence link is already attached to this Test Result.');
    }

    try {
      const created = await sequelize.transaction(async (transaction) => {
        const link = await TestResultEvidenceLinkModel.create(
          {
            workspaceId,
            testResultId: run.result!.id,
            url: input.url,
            provider: normalized.provider,
            mediaKind: normalized.mediaKind,
            label: input.label || null,
            addedBy: actorId,
            normalizedUrl: normalized.normalizedUrl,
            previewStatus: normalized.previewStatus,
          },
          { transaction },
        );

        await TestCaseActivityModel.create(
          {
            workspaceId,
            testCaseId,
            testRunId,
            testResultId: run.result!.id,
            actorId,
            action: 'test_evidence_link_added',
            metadata: {
              evidenceLinkId: link.id,
              url: input.url,
              provider: normalized.provider,
            },
          },
          { transaction },
        );

        return link;
      });

      return formatEvidenceLink(created);
    } catch (err: any) {
      if (err.name === 'SequelizeUniqueConstraintError') {
        throw new Error('CONFLICT: This evidence link is already attached to this Test Result.', {
          cause: err,
        });
      }
      throw err;
    }
  }

  async listTestRuns(workspaceId: string, testCaseId: string, actorId: string): Promise<TestRun[]> {
    const membership = await getMembership(workspaceId, actorId);
    assertCanReadTestManagement(membership.role);

    const testCase = await TestCaseModel.findOne({ where: { id: testCaseId, workspaceId } });
    if (!testCase) {
      throw new Error('NOT_FOUND: Test Case not found in this workspace.');
    }

    const runs = await TestRunModel.findAll({
      where: { workspaceId, testCaseId },
      include: testRunIncludes,
      order: [['startedAt', 'ASC']],
    });
    return runs.map((run) => formatRun(run as TestRunWithResult));
  }

  async listTestCaseActivity(
    workspaceId: string,
    testCaseId: string,
    actorId: string,
  ): Promise<TestCaseActivity[]> {
    const membership = await getMembership(workspaceId, actorId);
    assertCanReadTestManagement(membership.role);

    const testCase = await TestCaseModel.findOne({ where: { id: testCaseId, workspaceId } });
    if (!testCase) {
      throw new Error('NOT_FOUND: Test Case not found in this workspace.');
    }

    const activity = await TestCaseActivityModel.findAll({
      where: { workspaceId, testCaseId },
      order: [['createdAt', 'ASC']],
    });
    return activity.map(formatActivity);
  }

  private async findRun(
    workspaceId: string,
    testCaseId: string,
    runId: string,
  ): Promise<TestRunWithResult | null> {
    return TestRunModel.findOne({
      where: { id: runId, workspaceId, testCaseId },
      include: testRunIncludes,
    }) as Promise<TestRunWithResult | null>;
  }
}

export const testManagementService = new TestManagementService();
