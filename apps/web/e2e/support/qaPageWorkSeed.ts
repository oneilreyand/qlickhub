import bcrypt from 'bcryptjs';
import {
  AcceptanceCriterionModel,
  BugModel,
  FeatureReadinessBaselineModel,
  FeatureReadinessBaselineRequirementModel,
  QaDocumentModel,
  QaDocumentVersionModel,
  QaTestCycleModel,
  RequirementModel,
  TaskModel,
  TaskRequirementModel,
  TestCaseModel,
  TestCaseRequirementModel,
  TestCaseVersionAcceptanceCriterionModel,
  TestCaseVersionModel,
  TestResultModel,
  TestRunModel,
  UserModel,
  WorkspaceMemberModel,
  WorkspaceModel,
} from '../../../api/src/db/models/index.js';
import { sequelize } from '../../../api/src/db/sequelize.js';

export { sequelize };

export const pagePassword = 'E2ePassword123!';
export const pageUsers = {
  po: { email: 'e2e.po.page@example.test', role: 'po' as const, name: 'E2E PO Page' },
  dev: { email: 'e2e.dev.page@example.test', role: 'dev' as const, name: 'E2E Dev Page' },
  qa: { email: 'e2e.qa.page@example.test', role: 'qa' as const, name: 'E2E QA Page' },
};

export const pageTitles = {
  prepareFeature: 'E2E Fitur Tahap Siapkan',
  prepareQaSubtask: 'E2E Uji Tahap Siapkan',
  testFeature: 'E2E Fitur Tahap Uji',
  testQaSubtask: 'E2E Uji Tahap Uji',
  draftCase: 'E2E Test Case draf',
  activeCase: 'E2E Test Case aktif',
  importFeature: 'E2E Fitur Impor CSV',
  importQaSubtask: 'E2E Uji Impor CSV',
  importValidCase: 'E2E Kasus impor valid',
  importFixedCase: 'E2E Kasus impor kode salah',
  bugFeature: 'E2E Fitur Bug Retest',
  bugQaSubtask: 'E2E Uji Bug Retest',
  bug: 'E2E Bug konfirmasi pembayaran',
};

export const pageContext = {
  workspaceId: '',
  prepareQaSubtaskId: '',
  testQaSubtaskId: '',
  activeCaseId: '',
  importQaSubtaskId: '',
  importRequirementCode: '',
  bugId: '',
};

async function createCase(input: {
  workspaceId: string;
  qaId: string;
  requirementId: string;
  acId: string;
  title: string;
  status: 'draft' | 'active';
}) {
  const testCase = await TestCaseModel.create({
    workspaceId: input.workspaceId,
    title: input.title,
    status: input.status,
    testType: 'e2e',
    priority: 'high',
    steps: ['Buka halaman pembayaran', 'Konfirmasi pesanan'],
    expectedResult: 'Ringkasan pesanan tampil',
    createdBy: input.qaId,
  });
  const version = await TestCaseVersionModel.create({
    workspaceId: input.workspaceId,
    testCaseId: testCase.id,
    revision: 1,
    lifecycleStatus: input.status,
    definitionSnapshot: {
      title: testCase.title,
      steps: testCase.steps,
      expectedResult: testCase.expectedResult,
      requirementIds: [input.requirementId],
    },
    authoredBy: input.qaId,
    publishedBy: input.status === 'active' ? input.qaId : null,
    publishedAt: input.status === 'active' ? new Date() : null,
    origin: 'native_revision',
  } as never);
  await TestCaseRequirementModel.create({
    workspaceId: input.workspaceId,
    testCaseId: testCase.id,
    requirementId: input.requirementId,
    linkedBy: input.qaId,
  });
  await TestCaseVersionAcceptanceCriterionModel.create({
    workspaceId: input.workspaceId,
    testCaseVersionId: version.id,
    acceptanceCriterionId: input.acId,
    mappingStatus: 'mapped',
    mappedBy: input.qaId,
  });
  return { testCase, version };
}

/**
 * Seeds two Features for the QA work page e2e (P4c-8):
 * - "Tahap Siapkan": two Developer subtasks in review and one still in progress (card 2 of 3),
 *   a QA subtask, and one draft Test Case.
 * - "Tahap Uji": every Developer subtask in review, a QA subtask, one active Test Case, and an
 *   in-progress Test Cycle so a result can be recorded.
 */
export async function seedQaPageWork() {
  // A fresh stamp per call: the desktop and mobile projects each seed their own data, and a
  // reused worker must not collide on unique emails or workspace slugs.
  const stamp = `${Date.now()}-${process.pid}`;
  for (const [key, user] of Object.entries(pageUsers)) {
    user.email = `e2e.${key}.page.${stamp}@example.test`;
  }
  await sequelize.authenticate();
  const passwordHash = await bcrypt.hash(pagePassword, 10);
  const [po, dev, qa] = await Promise.all(
    Object.values(pageUsers).map((user) =>
      UserModel.create({ ...user, passwordHash, onboardingCompletedAt: new Date() }),
    ),
  );
  const workspace = await WorkspaceModel.create({
    name: 'Browser E2E QA Page Work Workspace',
    slug: `browser-e2e-page-${stamp}`,
    ownerId: po.id,
  });
  const workspaceId = workspace.id;
  pageContext.workspaceId = workspaceId;
  await WorkspaceMemberModel.bulkCreate([
    { workspaceId, userId: po.id, role: 'po' },
    { workspaceId, userId: dev.id, role: 'dev' },
    { workspaceId, userId: qa.id, role: 'qa' },
  ]);

  const brief = await QaDocumentModel.create({
    workspaceId,
    title: 'Page Work E2E Baseline Brief',
    docType: 'product_brief',
    status: 'approved',
    createdBy: po.id,
    ownerId: po.id,
    currentVersion: 1,
  });
  const briefVersion = await QaDocumentVersionModel.create({
    workspaceId,
    documentId: brief.id,
    version: 1,
    title: brief.title,
    contentMarkdown: 'Baseline specification.',
    createdBy: po.id,
  });

  const buildFeature = async (input: {
    title: string;
    qaTitle: string;
    code: string;
    developerStatuses: Array<'in_review' | 'in_progress' | 'done'>;
  }) => {
    const feature = await TaskModel.create({
      workspaceId,
      title: input.title,
      status: 'in_progress',
      priority: 'high',
      reporterId: po.id,
    });
    for (const [index, status] of input.developerStatuses.entries()) {
      await TaskModel.create({
        workspaceId,
        parentTaskId: feature.id,
        deliveryArea: index % 2 === 0 ? 'backend' : 'frontend',
        title: `${input.title} subtask Developer ${index + 1}`,
        status,
        priority: 'high',
        assigneeId: dev.id,
        reporterId: po.id,
      });
    }
    const requirement = await RequirementModel.create({
      workspaceId,
      code: input.code,
      title: 'Konfirmasi pembayaran tampil saat checkout',
      status: 'active',
      createdBy: po.id,
    });
    const ac = await AcceptanceCriterionModel.create({
      workspaceId,
      requirementId: requirement.id,
      sequence: 1,
      text: 'Modal konfirmasi menampilkan ringkasan pesanan.',
      status: 'active',
      createdBy: po.id,
    });
    await TaskRequirementModel.create({
      workspaceId,
      taskId: feature.id,
      requirementId: requirement.id,
      linkedBy: po.id,
    });
    const qaSubtask = await TaskModel.create({
      workspaceId,
      parentTaskId: feature.id,
      deliveryArea: 'qa',
      title: input.qaTitle,
      status: 'todo',
      priority: 'high',
      assigneeId: qa.id,
      reporterId: po.id,
    });
    const baseline = await FeatureReadinessBaselineModel.create({
      workspaceId,
      featureTaskId: feature.id,
      sequence: 1,
      productBriefVersionId: briefVersion.id,
      snapshot: { schemaVersion: 1, integrationFixture: true } as never,
      establishedBy: po.id,
    });
    await FeatureReadinessBaselineRequirementModel.create({
      workspaceId,
      baselineId: baseline.id,
      requirementId: requirement.id,
    });
    return { feature, requirement, ac, qaSubtask, baseline };
  };

  const prepare = await buildFeature({
    title: pageTitles.prepareFeature,
    qaTitle: pageTitles.prepareQaSubtask,
    code: `REQ-PAGE-A-${stamp}`,
    developerStatuses: ['in_review', 'in_review', 'in_progress'],
  });
  pageContext.prepareQaSubtaskId = prepare.qaSubtask.id;
  await createCase({
    workspaceId,
    qaId: qa.id,
    requirementId: prepare.requirement.id,
    acId: prepare.ac.id,
    title: pageTitles.draftCase,
    status: 'draft',
  });

  const test = await buildFeature({
    title: pageTitles.testFeature,
    qaTitle: pageTitles.testQaSubtask,
    code: `REQ-PAGE-B-${stamp}`,
    developerStatuses: ['in_review', 'in_review'],
  });
  pageContext.testQaSubtaskId = test.qaSubtask.id;
  const activeCase = await createCase({
    workspaceId,
    qaId: qa.id,
    requirementId: test.requirement.id,
    acId: test.ac.id,
    title: pageTitles.activeCase,
    status: 'active',
  });
  pageContext.activeCaseId = activeCase.testCase.id;
  await QaTestCycleModel.create({
    workspaceId,
    featureTaskId: test.feature.id,
    qaSubtaskId: test.qaSubtask.id,
    readinessBaselineId: test.baseline.id,
    candidateFingerprint: 'candidate:page-work-build-staging',
    build: 'page-work-build',
    environment: 'staging',
    status: 'in_progress',
    ownerQaId: qa.id,
  });

  // Feature for the CSV import flow (D): Developers are ready, no Test Case yet.
  const importCode = `REQ-PAGE-D-${stamp}`;
  const importFeature = await buildFeature({
    title: pageTitles.importFeature,
    qaTitle: pageTitles.importQaSubtask,
    code: importCode,
    developerStatuses: ['in_review'],
  });
  pageContext.importQaSubtaskId = importFeature.qaSubtask.id;
  pageContext.importRequirementCode = importCode;

  // Feature for the Bug flow (F): a failed Result with an open Bug assigned to the Developer.
  const bugFeature = await buildFeature({
    title: pageTitles.bugFeature,
    qaTitle: pageTitles.bugQaSubtask,
    code: `REQ-PAGE-F-${stamp}`,
    developerStatuses: ['in_review'],
  });
  const bugCase = await createCase({
    workspaceId,
    qaId: qa.id,
    requirementId: bugFeature.requirement.id,
    acId: bugFeature.ac.id,
    title: 'E2E Test Case untuk Bug',
    status: 'active',
  });
  const bugCycle = await QaTestCycleModel.create({
    workspaceId,
    featureTaskId: bugFeature.feature.id,
    qaSubtaskId: bugFeature.qaSubtask.id,
    readinessBaselineId: bugFeature.baseline.id,
    candidateFingerprint: 'candidate:origin-failing-build-staging',
    build: 'origin-failing-build',
    environment: 'staging',
    status: 'in_progress',
    ownerQaId: qa.id,
  });
  const failedRun = await TestRunModel.create({
    workspaceId,
    featureTaskId: bugFeature.feature.id,
    qaSubtaskId: bugFeature.qaSubtask.id,
    testCycleId: bugCycle.id,
    testCaseId: bugCase.testCase.id,
    testCaseVersionId: bugCase.version.id,
    readinessBaselineId: bugFeature.baseline.id,
    candidateFingerprint: bugCycle.candidateFingerprint,
    build: 'origin-failing-build',
    environment: 'staging',
    status: 'completed',
    executorId: qa.id,
    completedAt: new Date(),
  });
  const failedResult = await TestResultModel.create({
    workspaceId,
    testRunId: failedRun.id,
    status: 'failed',
    executorId: qa.id,
    actualResult: 'Modal konfirmasi tidak muncul.',
  });
  const bug = await BugModel.create({
    workspaceId,
    featureTaskId: bugFeature.feature.id,
    requirementId: bugFeature.requirement.id,
    testResultId: failedResult.id,
    assigneeId: dev.id,
    title: pageTitles.bug,
    severity: 'high',
    status: 'open',
    reproductionDetails: 'Buka halaman pembayaran lalu konfirmasi pesanan.',
    createdBy: qa.id,
  });
  pageContext.bugId = bug.id;
}
