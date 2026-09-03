import { Op } from 'sequelize';
import {
  RequirementModel,
  AcceptanceCriterionModel,
  RequirementTestCaseModel,
  TaskModel,
  TaskRequirementModel,
  QaDocumentModel,
  TaskDocumentModel,
} from '../../db/models/index.js';
import { requireActiveMember } from '../../db/repositories/workspaceMemberRepository.js';
import {
  RequirementTestCase,
  CreateRequirementTestCaseInput,
  WorkspaceTraceabilitySummary,
  TraceabilityMatrixNode,
  TraceabilityCoverageStatus,
  Requirement,
  AcceptanceCriterion,
  Task,
  QaDocument,
  ParentTaskDeliveryTrace,
  DeliveryTraceStructuralStatus,
  DeliveryTraceExecutionStatus,
} from '@qlick/contracts';

function formatTestCase(tc: RequirementTestCaseModel | Record<string, any>): RequirementTestCase {
  const json = typeof (tc as any).toJSON === 'function' ? (tc as any).toJSON() : tc;
  return {
    id: json.id,
    workspaceId: json.workspaceId,
    requirementId: json.requirementId,
    title: json.title,
    testType: json.testType,
    status: json.status,
    executionDetails: json.executionDetails || null,
    createdBy: json.createdBy,
    createdAt: json.createdAt ? new Date(json.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: json.updatedAt ? new Date(json.updatedAt).toISOString() : new Date().toISOString(),
  };
}

function formatRequirement(r: RequirementModel | Record<string, any>): Requirement {
  const json = typeof (r as any).toJSON === 'function' ? (r as any).toJSON() : r;
  return {
    id: json.id,
    workspaceId: json.workspaceId,
    code: json.code,
    title: json.title,
    description: json.description || null,
    url: json.url || null,
    status: json.status,
    createdBy: json.createdBy,
    createdAt: json.createdAt ? new Date(json.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: json.updatedAt ? new Date(json.updatedAt).toISOString() : new Date().toISOString(),
  };
}

function formatAcceptanceCriterion(
  criterion: AcceptanceCriterionModel | Record<string, any>,
): AcceptanceCriterion {
  const json =
    typeof (criterion as any).toJSON === 'function' ? (criterion as any).toJSON() : criterion;
  return {
    id: json.id,
    workspaceId: json.workspaceId,
    requirementId: json.requirementId,
    sequence: json.sequence,
    code: `AC-${json.sequence}`,
    text: json.text,
    status: json.status,
    createdBy: json.createdBy,
    createdAt: json.createdAt ? new Date(json.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: json.updatedAt ? new Date(json.updatedAt).toISOString() : new Date().toISOString(),
  };
}

function percentage(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function structuralStatus(
  implementingSubtasks: number,
  testCases: number,
): DeliveryTraceStructuralStatus {
  if (implementingSubtasks > 0 && testCases > 0) return 'complete';
  if (implementingSubtasks === 0 && testCases > 0) return 'missing_implementation';
  if (implementingSubtasks > 0 && testCases === 0) return 'missing_tests';
  return 'missing_implementation_and_tests';
}

function executionStatus(
  passed: number,
  failed: number,
  pending: number,
  skipped: number,
): DeliveryTraceExecutionStatus {
  if (failed > 0) return 'failing';
  if (passed === 0) return 'not_run';
  if (pending > 0 || skipped > 0) return 'incomplete';
  return 'passing';
}

function formatTask(t: TaskModel | Record<string, any>): Task {
  const json = typeof (t as any).toJSON === 'function' ? (t as any).toJSON() : t;
  return {
    id: json.id,
    workspaceId: json.workspaceId,
    folderId: json.folderId || null,
    parentTaskId: json.parentTaskId || null,
    deliveryArea: json.deliveryArea || null,
    title: json.title,
    description: json.description || null,
    status: json.status,
    priority: json.priority,
    position: json.position ?? 0,
    assigneeId: json.assigneeId || null,
    reporterId: json.reporterId,
    startDate: json.startDate || null,
    dueDate: json.dueDate || null,
    completedAt: json.completedAt ? new Date(json.completedAt).toISOString() : null,
    createdAt: json.createdAt ? new Date(json.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: json.updatedAt ? new Date(json.updatedAt).toISOString() : new Date().toISOString(),
  };
}

function formatDocument(d: QaDocumentModel | Record<string, any>): QaDocument {
  const json = typeof (d as any).toJSON === 'function' ? (d as any).toJSON() : d;
  return {
    id: json.id,
    workspaceId: json.workspaceId,
    folderId: json.folderId || null,
    title: json.title,
    docType: json.docType,
    status: json.status || 'draft',
    ownerId: json.ownerId || null,
    currentVersion: json.currentVersion,
    createdBy: json.createdBy,
    createdAt: json.createdAt ? new Date(json.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: json.updatedAt ? new Date(json.updatedAt).toISOString() : new Date().toISOString(),
  };
}

export class TraceabilityService {
  async getParentTaskDeliveryTrace(
    workspaceId: string,
    requestedTaskId: string,
    actorId: string,
  ): Promise<ParentTaskDeliveryTrace> {
    await requireActiveMember(workspaceId, actorId);

    const requestedTask = await TaskModel.findOne({
      where: { id: requestedTaskId, workspaceId },
    });
    if (!requestedTask) {
      throw new Error('NOT_FOUND: Task not found in this workspace.');
    }

    let featureTask = requestedTask;
    if (requestedTask.parentTaskId) {
      const parentTask = await TaskModel.findOne({
        where: { id: requestedTask.parentTaskId, workspaceId },
      });
      if (!parentTask) {
        throw new Error('NOT_FOUND: Parent Feature / Story was not found in this workspace.');
      }
      featureTask = parentTask;
    }

    const featureSubtasks = await TaskModel.findAll({
      where: { workspaceId, parentTaskId: featureTask.id },
      order: [['createdAt', 'ASC']],
    });
    const featureTaskIds = [featureTask.id, ...featureSubtasks.map((task) => task.id)];
    const requirementLinks = await TaskRequirementModel.findAll({
      where: {
        workspaceId,
        taskId: { [Op.in]: featureTaskIds },
      },
      order: [['createdAt', 'ASC']],
    });
    const requirementIds = [...new Set(requirementLinks.map((link) => link.requirementId))];

    const [requirements, acceptanceCriteria, testCases] =
      requirementIds.length > 0
        ? await Promise.all([
            RequirementModel.findAll({
              where: { workspaceId, id: { [Op.in]: requirementIds } },
              order: [['code', 'ASC']],
            }),
            AcceptanceCriterionModel.findAll({
              where: { workspaceId, requirementId: { [Op.in]: requirementIds } },
              order: [
                ['requirementId', 'ASC'],
                ['sequence', 'ASC'],
              ],
            }),
            RequirementTestCaseModel.findAll({
              where: { workspaceId, requirementId: { [Op.in]: requirementIds } },
              order: [['createdAt', 'ASC']],
            }),
          ])
        : [[], [], []];

    const featureSubtaskById = new Map(featureSubtasks.map((task) => [task.id, task]));
    const linkedFeatureSubtaskIds = new Set<string>();
    const requirementSubtasks = new Map<string, TaskModel[]>();
    for (const link of requirementLinks) {
      const subtask = featureSubtaskById.get(link.taskId);
      if (!subtask) continue;
      linkedFeatureSubtaskIds.add(subtask.id);
      const linkedSubtasks = requirementSubtasks.get(link.requirementId) || [];
      linkedSubtasks.push(subtask);
      requirementSubtasks.set(link.requirementId, linkedSubtasks);
    }

    const criteriaByRequirement = new Map<string, AcceptanceCriterionModel[]>();
    for (const criterion of acceptanceCriteria) {
      const criteria = criteriaByRequirement.get(criterion.requirementId) || [];
      criteria.push(criterion);
      criteriaByRequirement.set(criterion.requirementId, criteria);
    }

    const testCasesByRequirement = new Map<string, RequirementTestCaseModel[]>();
    for (const testCase of testCases) {
      const linkedTestCases = testCasesByRequirement.get(testCase.requirementId) || [];
      linkedTestCases.push(testCase);
      testCasesByRequirement.set(testCase.requirementId, linkedTestCases);
    }

    let requirementsWithImplementingSubtasks = 0;
    let requirementsWithTestCases = 0;
    let fullyCoveredRequirements = 0;
    let passedTestCases = 0;
    let failedTestCases = 0;
    let pendingTestCases = 0;
    let skippedTestCases = 0;

    const requirementNodes = requirements.map((requirement) => {
      const implementingSubtasks = requirementSubtasks.get(requirement.id) || [];
      const criteria = criteriaByRequirement.get(requirement.id) || [];
      const linkedTestCases = testCasesByRequirement.get(requirement.id) || [];
      const passed = linkedTestCases.filter((testCase) => testCase.status === 'passed').length;
      const failed = linkedTestCases.filter((testCase) => testCase.status === 'failed').length;
      const pending = linkedTestCases.filter((testCase) => testCase.status === 'pending').length;
      const skipped = linkedTestCases.filter((testCase) => testCase.status === 'skipped').length;

      if (implementingSubtasks.length > 0) requirementsWithImplementingSubtasks += 1;
      if (linkedTestCases.length > 0) requirementsWithTestCases += 1;
      if (implementingSubtasks.length > 0 && linkedTestCases.length > 0) {
        fullyCoveredRequirements += 1;
      }
      passedTestCases += passed;
      failedTestCases += failed;
      pendingTestCases += pending;
      skippedTestCases += skipped;

      return {
        requirement: formatRequirement(requirement),
        acceptanceCriteria: criteria.map(formatAcceptanceCriterion),
        implementingSubtasks: implementingSubtasks.map(formatTask),
        testCases: linkedTestCases.map(formatTestCase),
        testCaseLinkBasis: 'legacy_requirement' as const,
        acceptanceCriterionCoverageAvailable: false as const,
        structuralStatus: structuralStatus(implementingSubtasks.length, linkedTestCases.length),
        executionStatus: executionStatus(passed, failed, pending, skipped),
        totalAcceptanceCriteria: criteria.length,
        totalImplementingSubtasks: implementingSubtasks.length,
        totalTestCases: linkedTestCases.length,
        executedTestCases: passed + failed,
        passedTestCases: passed,
        failedTestCases: failed,
        pendingTestCases: pending,
        skippedTestCases: skipped,
      };
    });

    const unlinkedSubtasks = featureSubtasks.filter(
      (task) => !linkedFeatureSubtaskIds.has(task.id),
    );
    const totalRequirements = requirements.length;
    const executedTestCases = passedTestCases + failedTestCases;

    return {
      workspaceId,
      requestedTaskId,
      featureTask: formatTask(featureTask),
      featureSubtasks: featureSubtasks.map(formatTask),
      unlinkedSubtasks: unlinkedSubtasks.map(formatTask),
      testCaseLinkBasis: 'legacy_requirement',
      acceptanceCriterionCoverageAvailable: false,
      structural: {
        totalRequirements,
        totalFeatureSubtasks: featureSubtasks.length,
        linkedImplementingSubtasks: linkedFeatureSubtaskIds.size,
        unlinkedSubtasks: unlinkedSubtasks.length,
        requirementsWithImplementingSubtasks,
        requirementsWithTestCases,
        fullyCoveredRequirements,
        missingImplementationRequirements: totalRequirements - requirementsWithImplementingSubtasks,
        missingTestCaseRequirements: totalRequirements - requirementsWithTestCases,
        coveragePercent: percentage(fullyCoveredRequirements, totalRequirements),
      },
      execution: {
        totalTestCases: testCases.length,
        executedTestCases,
        passedTestCases,
        failedTestCases,
        pendingTestCases,
        skippedTestCases,
        passRatePercent: percentage(passedTestCases, executedTestCases),
      },
      requirements: requirementNodes,
    };
  }

  async listRequirementTestCases(
    workspaceId: string,
    requirementId: string,
    actorId: string,
  ): Promise<RequirementTestCase[]> {
    await requireActiveMember(workspaceId, actorId);

    const testCases = await RequirementTestCaseModel.findAll({
      where: { workspaceId, requirementId },
      order: [['createdAt', 'ASC']],
    });

    return testCases.map(formatTestCase);
  }

  async createRequirementTestCase(
    workspaceId: string,
    actorId: string,
    input: Omit<CreateRequirementTestCaseInput, 'workspaceId'>,
  ): Promise<RequirementTestCase> {
    const member = await requireActiveMember(workspaceId, actorId);
    if (!['owner', 'admin', 'po', 'qa'].includes(member.role)) {
      throw new Error(
        'FORBIDDEN: Only Product Owner, Admin, Owner, or QA members can create test cases.',
      );
    }

    const requirement = await RequirementModel.findOne({
      where: { id: input.requirementId, workspaceId },
    });

    if (!requirement) {
      throw new Error('NOT_FOUND: Requirement not found in this workspace.');
    }

    const tc = await RequirementTestCaseModel.create({
      workspaceId,
      requirementId: input.requirementId,
      title: input.title.trim(),
      testType: input.testType || 'manual',
      status: input.status || 'pending',
      executionDetails: input.executionDetails || null,
      createdBy: actorId,
    });

    return formatTestCase(tc);
  }

  async updateTestCaseStatus(
    workspaceId: string,
    testCaseId: string,
    actorId: string,
    status: 'passed' | 'failed' | 'pending' | 'skipped',
    executionDetails?: string,
  ): Promise<RequirementTestCase> {
    const member = await requireActiveMember(workspaceId, actorId);
    if (!['owner', 'admin', 'po', 'qa'].includes(member.role)) {
      throw new Error(
        'FORBIDDEN: Only Product Owner, Admin, Owner, or QA members can update test case status.',
      );
    }

    const tc = await RequirementTestCaseModel.findOne({
      where: { id: testCaseId, workspaceId },
    });

    if (!tc) {
      throw new Error('NOT_FOUND: Test case not found in this workspace.');
    }

    tc.status = status;
    if (executionDetails !== undefined) {
      tc.executionDetails = executionDetails;
    }
    await tc.save();

    return formatTestCase(tc);
  }

  async getWorkspaceTraceabilityMatrix(
    workspaceId: string,
    actorId: string,
  ): Promise<WorkspaceTraceabilitySummary> {
    await requireActiveMember(workspaceId, actorId);

    // Fetch requirements with their test cases
    const requirements = await RequirementModel.findAll({
      where: { workspaceId },
      include: [{ model: RequirementTestCaseModel, as: 'testCases' }],
      order: [['code', 'ASC']],
    });

    // Fetch task-requirement links with tasks
    const taskReqLinks = await TaskRequirementModel.findAll({
      where: { workspaceId },
      include: [{ model: TaskModel, as: 'task' }],
    });

    // Fetch task-document links with documents
    const taskDocLinks = await TaskDocumentModel.findAll({
      where: { workspaceId },
      include: [{ model: QaDocumentModel, as: 'document' }],
    });

    // Map tasks to requirements
    const reqTasksMap = new Map<string, TaskModel[]>();
    taskReqLinks.forEach((link) => {
      if (link.task) {
        const list = reqTasksMap.get(link.requirementId) || [];
        list.push(link.task);
        reqTasksMap.set(link.requirementId, list);
      }
    });

    // Map QA documents to tasks
    const taskDocsMap = new Map<string, QaDocumentModel[]>();
    taskDocLinks.forEach((link) => {
      if (link.document) {
        const list = taskDocsMap.get(link.taskId) || [];
        list.push(link.document);
        taskDocsMap.set(link.taskId, list);
      }
    });

    let coveredReqsCount = 0;
    let totalTestCaseCount = 0;
    let totalPassedTestCaseCount = 0;

    const matrix: TraceabilityMatrixNode[] = requirements.map((req) => {
      const tasks = reqTasksMap.get(req.id) || [];
      const testCases = ((req as any).testCases || []) as RequirementTestCaseModel[];

      // Collect documents linked via tasks
      const docSet = new Map<string, QaDocumentModel>();
      tasks.forEach((t) => {
        const docs = taskDocsMap.get(t.id) || [];
        docs.forEach((d) => docSet.set(d.id, d));
      });
      const qaDocuments = Array.from(docSet.values());

      const passedCount = testCases.filter((tc) => tc.status === 'passed').length;
      const failedCount = testCases.filter((tc) => tc.status === 'failed').length;
      const pendingCount = testCases.filter(
        (tc) => tc.status === 'pending' || tc.status === 'skipped',
      ).length;

      totalTestCaseCount += testCases.length;
      totalPassedTestCaseCount += passedCount;

      let coverageStatus: TraceabilityCoverageStatus = 'no_coverage';
      if (failedCount > 0) {
        coverageStatus = 'failing';
      } else if (testCases.length > 0 && passedCount === testCases.length && tasks.length > 0) {
        coverageStatus = 'full_coverage';
      } else if (testCases.length > 0 || tasks.length > 0) {
        coverageStatus = 'partial_coverage';
      }

      if (
        coverageStatus === 'full_coverage' ||
        coverageStatus === 'partial_coverage' ||
        coverageStatus === 'failing'
      ) {
        coveredReqsCount++;
      }

      return {
        requirement: formatRequirement(req),
        tasks: tasks.map(formatTask),
        qaDocuments: qaDocuments.map(formatDocument),
        testCases: testCases.map(formatTestCase),
        coverageStatus,
        totalLinkedTasks: tasks.length,
        totalPassedTests: passedCount,
        totalFailedTests: failedCount,
        totalPendingTests: pendingCount,
      };
    });

    const totalTasks = await TaskModel.count({ where: { workspaceId } });
    const passRatePercent =
      totalTestCaseCount > 0
        ? Math.round((totalPassedTestCaseCount / totalTestCaseCount) * 1000) / 10
        : 0;

    return {
      totalRequirements: requirements.length,
      coveredRequirements: coveredReqsCount,
      uncoveredRequirements: requirements.length - coveredReqsCount,
      totalTasks,
      totalTestCases: totalTestCaseCount,
      passRatePercent,
      matrix,
    };
  }
}

export const traceabilityService = new TraceabilityService();
