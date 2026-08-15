import {
  RequirementModel,
  RequirementTestCaseModel,
  TaskModel,
  TaskRequirementModel,
  QaDocumentModel,
  TaskDocumentModel,
  WorkspaceMemberModel,
} from '../../db/models/index.js';
import {
  RequirementTestCase,
  CreateRequirementTestCaseInput,
  WorkspaceTraceabilitySummary,
  TraceabilityMatrixNode,
  TraceabilityCoverageStatus,
  Requirement,
  Task,
  QaDocument,
} from '@qa/contracts';

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
    status: json.status,
    createdBy: json.createdBy,
    createdAt: json.createdAt ? new Date(json.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: json.updatedAt ? new Date(json.updatedAt).toISOString() : new Date().toISOString(),
  };
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
    currentVersion: json.currentVersion,
    createdBy: json.createdBy,
    createdAt: json.createdAt ? new Date(json.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: json.updatedAt ? new Date(json.updatedAt).toISOString() : new Date().toISOString(),
  };
}

async function getActorMembership(workspaceId: string, actorId: string) {
  const member = await WorkspaceMemberModel.findOne({
    where: { workspaceId, userId: actorId },
  });
  if (!member) {
    throw new Error('FORBIDDEN: You are not a member of this workspace.');
  }
  return member;
}

export class TraceabilityService {
  async listRequirementTestCases(
    workspaceId: string,
    requirementId: string,
    actorId: string
  ): Promise<RequirementTestCase[]> {
    await getActorMembership(workspaceId, actorId);

    const testCases = await RequirementTestCaseModel.findAll({
      where: { workspaceId, requirementId },
      order: [['createdAt', 'ASC']],
    });

    return testCases.map(formatTestCase);
  }

  async createRequirementTestCase(
    workspaceId: string,
    actorId: string,
    input: Omit<CreateRequirementTestCaseInput, 'workspaceId'>
  ): Promise<RequirementTestCase> {
    const member = await getActorMembership(workspaceId, actorId);
    if (!['owner', 'admin', 'po', 'qa'].includes(member.role)) {
      throw new Error('FORBIDDEN: Only Product Owner, Admin, Owner, or QA members can create test cases.');
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
    executionDetails?: string
  ): Promise<RequirementTestCase> {
    const member = await getActorMembership(workspaceId, actorId);
    if (!['owner', 'admin', 'po', 'qa'].includes(member.role)) {
      throw new Error('FORBIDDEN: Only Product Owner, Admin, Owner, or QA members can update test case status.');
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
    actorId: string
  ): Promise<WorkspaceTraceabilitySummary> {
    await getActorMembership(workspaceId, actorId);

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
      const pendingCount = testCases.filter((tc) => tc.status === 'pending' || tc.status === 'skipped').length;

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

      if (coverageStatus === 'full_coverage' || coverageStatus === 'partial_coverage' || coverageStatus === 'failing') {
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
