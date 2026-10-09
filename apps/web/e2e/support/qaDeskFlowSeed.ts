import { expect, type Page } from '@playwright/test';
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

export const password = 'E2ePassword123!';
const stamp = `${Date.now()}-${process.pid}`;
export const users = {
  po: { email: `e2e.po.flow.${stamp}@example.test`, role: 'po' as const, name: 'E2E PO Flow' },
  dev: { email: `e2e.dev.flow.${stamp}@example.test`, role: 'dev' as const, name: 'E2E Dev Flow' },
  qa: { email: `e2e.qa.flow.${stamp}@example.test`, role: 'qa' as const, name: 'E2E QA Flow' },
};

let workspaceId = '';
let featureTaskId = '';
let bugFeatureTaskId = '';
let devUserId = '';

/** Ids created by {@link seedQaDeskFlow}; read them inside tests, after beforeAll ran. */
export const flowContext = {
  get workspaceId() {
    return workspaceId;
  },
  get featureTaskId() {
    return featureTaskId;
  },
  get bugFeatureTaskId() {
    return bugFeatureTaskId;
  },
  get devUserId() {
    return devUserId;
  },
};

export async function login(page: Page, email: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.getByLabel('Alamat Email').fill(email);
  await page.getByRole('textbox', { name: 'Kata Sandi' }).fill(password);
  await page.getByRole('button', { name: 'Masuk ke Qlick Hub' }).click();
  await expect(page).toHaveURL(/\/work/);
  await page.goto('/my-tasks');
  await expect(page.getByRole('heading', { name: 'Tugas Saya' })).toBeVisible();
}

/** Seeds the workspace, users, Features and QA subtasks used by the QA Desk flow e2e spec. */
export async function seedQaDeskFlow() {
  await sequelize.authenticate();
  const passwordHash = await bcrypt.hash(password, 10);
  const persistedUsers = await Promise.all(
    Object.values(users).map((user) =>
      UserModel.create({ ...user, passwordHash, onboardingCompletedAt: new Date() }),
    ),
  );
  const [po, dev, qa] = persistedUsers;
  devUserId = dev.id;

  const workspace = await WorkspaceModel.create({
    name: 'Browser E2E QA Desk Flow Workspace',
    slug: `browser-e2e-flow-${stamp}`,
    ownerId: po.id,
  });
  workspaceId = workspace.id;

  await WorkspaceMemberModel.bulkCreate([
    { workspaceId, userId: po.id, role: 'po' },
    { workspaceId, userId: dev.id, role: 'dev' },
    { workspaceId, userId: qa.id, role: 'qa' },
  ]);

  // Feature 1: Pass Flow
  const passFeature = await TaskModel.create({
    workspaceId,
    title: 'E2E Automated Checkout Workflow',
    status: 'in_progress',
    priority: 'high',
    reporterId: po.id,
  });
  featureTaskId = passFeature.id;

  await TaskModel.create({
    workspaceId,
    parentTaskId: passFeature.id,
    deliveryArea: 'backend',
    title: 'E2E Backend Checkout Implementation',
    status: 'done',
    priority: 'high',
    assigneeId: dev.id,
    reporterId: po.id,
  });

  const passRequirement = await RequirementModel.create({
    workspaceId,
    code: `REQ-PASS-${stamp}`,
    title: 'Payment confirmation is displayed upon checkout',
    status: 'active',
    createdBy: po.id,
  });
  await AcceptanceCriterionModel.create({
    workspaceId,
    requirementId: passRequirement.id,
    sequence: 1,
    text: 'Payment confirmation modal displays order summary.',
    status: 'active',
    createdBy: po.id,
  });
  await TaskRequirementModel.create({
    workspaceId,
    taskId: passFeature.id,
    requirementId: passRequirement.id,
    linkedBy: po.id,
  });

  await TaskModel.create({
    workspaceId,
    parentTaskId: passFeature.id,
    deliveryArea: 'qa',
    title: 'QA Eksekusi Alur Pass Sederhana',
    status: 'todo',
    priority: 'high',
    assigneeId: qa.id,
    reporterId: po.id,
  });

  const brief1 = await QaDocumentModel.create({
    workspaceId,
    title: 'Checkout E2E Baseline Brief',
    docType: 'product_brief',
    status: 'approved',
    createdBy: po.id,
    ownerId: po.id,
    currentVersion: 1,
  });
  const briefVersion1 = await QaDocumentVersionModel.create({
    workspaceId,
    documentId: brief1.id,
    version: 1,
    title: brief1.title,
    contentMarkdown: 'Baseline specification for checkout flow.',
    createdBy: po.id,
  });
  const baseline1 = await FeatureReadinessBaselineModel.create({
    workspaceId,
    featureTaskId: passFeature.id,
    sequence: 1,
    productBriefVersionId: briefVersion1.id,
    snapshot: { schemaVersion: 1, integrationFixture: true } as any,
    establishedBy: po.id,
  });
  await FeatureReadinessBaselineRequirementModel.create({
    workspaceId,
    baselineId: baseline1.id,
    requirementId: passRequirement.id,
  });

  // Feature 2: Bug & Retest Flow
  const bugFeature = await TaskModel.create({
    workspaceId,
    title: 'E2E Bug and Retest Checkout Workflow',
    status: 'in_progress',
    priority: 'high',
    reporterId: po.id,
  });
  bugFeatureTaskId = bugFeature.id;

  await TaskModel.create({
    workspaceId,
    parentTaskId: bugFeature.id,
    deliveryArea: 'backend',
    title: 'E2E Backend Bug Fix Implementation',
    status: 'done',
    priority: 'high',
    assigneeId: dev.id,
    reporterId: po.id,
  });

  const bugReq = await RequirementModel.create({
    workspaceId,
    code: `REQ-BUG-${stamp}`,
    title: 'Payment gateway connection retries on network timeout',
    status: 'active',
    createdBy: po.id,
  });
  await TaskRequirementModel.create({
    workspaceId,
    taskId: bugFeature.id,
    requirementId: bugReq.id,
    linkedBy: po.id,
  });

  const bugSubtask = await TaskModel.create({
    workspaceId,
    parentTaskId: bugFeature.id,
    deliveryArea: 'qa',
    title: 'QA Eksekusi Alur Bug dan Retest',
    status: 'in_progress',
    priority: 'high',
    assigneeId: qa.id,
    reporterId: po.id,
  });

  const baseline2 = await FeatureReadinessBaselineModel.create({
    workspaceId,
    featureTaskId: bugFeature.id,
    sequence: 1,
    productBriefVersionId: briefVersion1.id,
    snapshot: { schemaVersion: 1, integrationFixture: true } as any,
    establishedBy: po.id,
  });
  await FeatureReadinessBaselineRequirementModel.create({
    workspaceId,
    baselineId: baseline2.id,
    requirementId: bugReq.id,
  });

  const tc = await TestCaseModel.create({
    workspaceId,
    title: 'Payment timeout handling workflow',
    status: 'active',
    testType: 'e2e',
    priority: 'high',
    steps: ['Simulate network timeout', 'Verify retry banner'],
    expectedResult: 'System retries within 15 seconds',
    createdBy: qa.id,
  });
  const tcVersion = await TestCaseVersionModel.create({
    workspaceId,
    testCaseId: tc.id,
    revision: 1,
    lifecycleStatus: 'active',
    definitionSnapshot: {
      title: tc.title,
      steps: tc.steps,
      expectedResult: tc.expectedResult,
      requirementIds: [bugReq.id],
    },
    authoredBy: qa.id,
    publishedBy: qa.id,
    publishedAt: new Date(),
    origin: 'native_revision',
  });

  await TestCaseRequirementModel.create({
    workspaceId,
    testCaseId: tc.id,
    requirementId: bugReq.id,
    linkedBy: qa.id,
  });

  const bugAc = await AcceptanceCriterionModel.create({
    workspaceId,
    requirementId: bugReq.id,
    sequence: 1,
    text: 'Payment gateway connection retries on network timeout.',
    status: 'active',
    createdBy: po.id,
  });
  await TestCaseVersionAcceptanceCriterionModel.create({
    workspaceId,
    testCaseVersionId: tcVersion.id,
    acceptanceCriterionId: bugAc.id,
    mappingStatus: 'mapped',
    mappedBy: qa.id,
  });

  const initialCycle = await QaTestCycleModel.create({
    workspaceId,
    featureTaskId: bugFeature.id,
    qaSubtaskId: bugSubtask.id,
    readinessBaselineId: baseline2.id,
    candidateFingerprint: 'candidate:origin-failing-build-staging',
    build: 'origin-failing-build',
    environment: 'staging',
    status: 'in_progress',
    ownerQaId: qa.id,
  });

  const failedRun = await TestRunModel.create({
    workspaceId,
    featureTaskId: bugFeature.id,
    qaSubtaskId: bugSubtask.id,
    testCycleId: initialCycle.id,
    testCaseId: tc.id,
    testCaseVersionId: tcVersion.id,
    readinessBaselineId: baseline2.id,
    candidateFingerprint: initialCycle.candidateFingerprint,
    build: 'origin-failing-build',
    environment: 'staging',
    status: 'completed',
    executorId: qa.id,
    completedAt: new Date(),
  });

  await TestResultModel.create({
    workspaceId,
    testRunId: failedRun.id,
    status: 'failed',
    executorId: qa.id,
    actualResult: 'Timeout exception thrown without retry.',
  });
}
