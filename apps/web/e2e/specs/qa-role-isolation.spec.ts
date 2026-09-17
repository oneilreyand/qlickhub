import { expect, test, type Page } from '@playwright/test';
import bcrypt from 'bcryptjs';
import {
  BugEvidenceLinkModel,
  BugModel,
  BugResolutionEventModel,
  BugRetestAttemptModel,
  RequirementModel,
  TaskModel,
  TaskRequirementModel,
  TestCaseModel,
  TestCaseRequirementModel,
  TestResultModel,
  TestRunModel,
  UserModel,
  WorkspaceMemberModel,
  WorkspaceModel,
} from '../../../api/src/db/models/index.js';
import { sequelize } from '../../../api/src/db/sequelize.js';

const password = 'E2ePassword123!';
// Each Playwright project runs this file in its own worker process against the
// same disposable database, so the process id prevents parallel factories from
// racing on email and workspace-slug uniqueness constraints.
const stamp = `${Date.now()}-${process.pid}`;
const users = {
  po: { email: `e2e.po.${stamp}@example.test`, role: 'po' as const, name: 'E2E Product Owner' },
  dev: { email: `e2e.dev.${stamp}@example.test`, role: 'dev' as const, name: 'E2E Developer' },
  qa: { email: `e2e.qa.${stamp}@example.test`, role: 'qa' as const, name: 'E2E QA Assignee' },
  qaObserver: {
    email: `e2e.qa-observer.${stamp}@example.test`,
    role: 'qa' as const,
    name: 'E2E QA Observer',
  },
};

let workspaceId = '';
let featureTaskId = '';
let qaSubtaskId = '';
let createdUserIds: string[] = [];
const bugTitle = 'Browser E2E payment confirmation fails';

async function login(page: Page, email: string) {
  // Vite's dev server can take a little longer to finish the first module graph
  // load when the desktop and mobile projects start together. DOM readiness is
  // enough for the login form and avoids waiting on non-critical network work.
  await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.getByLabel('Alamat Email').fill(email);
  await page.getByRole('textbox', { name: 'Kata Sandi' }).fill(password);
  await page.getByRole('button', { name: 'Masuk ke Qlick Hub' }).click();
  await expect(page).toHaveURL(/\/work/);
  await page.goto('/my-tasks');
  await expect(page.getByRole('heading', { name: 'Tugas Saya' })).toBeVisible();
}

test.beforeAll(async () => {
  await sequelize.authenticate();
  const passwordHash = await bcrypt.hash(password, 10);
  const persistedUsers = await Promise.all(
    Object.values(users).map((user) =>
      UserModel.create({ ...user, passwordHash, onboardingCompletedAt: new Date() }),
    ),
  );
  createdUserIds = persistedUsers.map((user) => user.id);
  const [po, dev, qa, qaObserver] = persistedUsers;

  const workspace = await WorkspaceModel.create({
    name: 'Browser E2E QA Workspace',
    slug: `browser-e2e-qa-${stamp}`,
    ownerId: po.id,
  });
  workspaceId = workspace.id;
  await WorkspaceMemberModel.bulkCreate([
    { workspaceId, userId: po.id, role: 'po' },
    { workspaceId, userId: dev.id, role: 'dev' },
    { workspaceId, userId: qa.id, role: 'qa' },
    { workspaceId, userId: qaObserver.id, role: 'qa' },
  ]);

  const feature = await TaskModel.create({
    workspaceId,
    title: 'Browser E2E QA Feature',
    status: 'in_progress',
    priority: 'high',
    reporterId: po.id,
  });
  featureTaskId = feature.id;
  await TaskModel.create({
    workspaceId,
    parentTaskId: feature.id,
    deliveryArea: 'frontend',
    title: 'Browser E2E Development',
    status: 'done',
    priority: 'high',
    assigneeId: dev.id,
    reporterId: po.id,
  });
  const qaSubtask = await TaskModel.create({
    workspaceId,
    parentTaskId: feature.id,
    deliveryArea: 'qa',
    title: 'Browser E2E QA Assignee Task',
    status: 'in_progress',
    priority: 'high',
    assigneeId: qa.id,
    reporterId: po.id,
  });
  qaSubtaskId = qaSubtask.id;

  const requirement = await RequirementModel.create({
    workspaceId,
    code: `REQ-BROWSER-${stamp}`,
    title: 'Payment confirmation is displayed',
    status: 'active',
    createdBy: po.id,
  });
  await TaskRequirementModel.create({
    workspaceId,
    taskId: feature.id,
    requirementId: requirement.id,
    linkedBy: po.id,
  });
  const testCase = await TestCaseModel.create({
    workspaceId,
    title: 'Payment confirmation browser workflow',
    status: 'active',
    testType: 'e2e',
    priority: 'high',
    steps: ['Submit the payment'],
    expectedResult: 'Confirmation is shown',
    createdBy: qa.id,
  });
  await TestCaseRequirementModel.create({
    workspaceId,
    testCaseId: testCase.id,
    requirementId: requirement.id,
    linkedBy: qa.id,
  });
  const originalRun = await TestRunModel.create({
    workspaceId,
    testCaseId: testCase.id,
    build: 'browser-e2e-origin',
    environment: 'staging',
    status: 'completed',
    executorId: qa.id,
    completedAt: new Date(),
  });
  const originalResult = await TestResultModel.create({
    workspaceId,
    testRunId: originalRun.id,
    status: 'failed',
    executorId: qa.id,
    actualResult: 'Confirmation never appears.',
  });
  const bug = await BugModel.create({
    workspaceId,
    featureTaskId: feature.id,
    requirementId: requirement.id,
    testResultId: originalResult.id,
    assigneeId: dev.id,
    title: bugTitle,
    severity: 'high',
    status: 'verified',
    reproductionDetails: 'Submit payment and wait for confirmation.',
    createdBy: qa.id,
    resolvedAt: new Date(),
    verifiedAt: new Date(),
  });
  const firstResolution = await BugResolutionEventModel.create({
    workspaceId,
    bugId: bug.id,
    sequence: 1,
    candidateFingerprint: 'commit:browser-e2e-fix-1',
    resolutionNotes: 'First payment confirmation fix.',
    resolvedBy: dev.id,
  });
  const firstRetestRun = await TestRunModel.create({
    workspaceId,
    testCaseId: testCase.id,
    retestBugId: bug.id,
    retestResolutionEventId: firstResolution.id,
    build: 'browser-e2e-fix-1',
    environment: 'staging',
    status: 'completed',
    executorId: qa.id,
    completedAt: new Date(),
  });
  const firstRetestResult = await TestResultModel.create({
    workspaceId,
    testRunId: firstRetestRun.id,
    status: 'failed',
    executorId: qa.id,
    actualResult: 'Confirmation still does not appear.',
  });
  await BugRetestAttemptModel.create({
    workspaceId,
    bugId: bug.id,
    resolutionEventId: firstResolution.id,
    testResultId: firstRetestResult.id,
    outcome: 'reopened',
    attemptedBy: qa.id,
  });
  const secondResolution = await BugResolutionEventModel.create({
    workspaceId,
    bugId: bug.id,
    sequence: 2,
    candidateFingerprint: 'commit:browser-e2e-fix-2',
    resolutionNotes: 'Second payment confirmation fix.',
    resolvedBy: dev.id,
  });
  const secondRetestRun = await TestRunModel.create({
    workspaceId,
    testCaseId: testCase.id,
    retestBugId: bug.id,
    retestResolutionEventId: secondResolution.id,
    build: 'browser-e2e-fix-2',
    environment: 'staging',
    status: 'completed',
    executorId: qa.id,
    completedAt: new Date(),
  });
  const secondRetestResult = await TestResultModel.create({
    workspaceId,
    testRunId: secondRetestRun.id,
    status: 'passed',
    executorId: qa.id,
    actualResult: 'Confirmation appears after payment.',
  });
  await BugRetestAttemptModel.create({
    workspaceId,
    bugId: bug.id,
    resolutionEventId: secondResolution.id,
    testResultId: secondRetestResult.id,
    outcome: 'verified',
    attemptedBy: qa.id,
  });
  await BugEvidenceLinkModel.bulkCreate([
    {
      workspaceId,
      bugId: bug.id,
      url: 'https://example.test/evidence/fix-1',
      normalizedUrl: 'https://example.test/evidence/fix-1',
      provider: 'other',
      mediaKind: 'video',
      label: 'Bukti perbaikan pertama',
      addedBy: dev.id,
      evidenceStage: 'resolution',
      resolutionEventId: firstResolution.id,
    },
    {
      workspaceId,
      bugId: bug.id,
      url: 'https://example.test/evidence/fix-2',
      normalizedUrl: 'https://example.test/evidence/fix-2',
      provider: 'other',
      mediaKind: 'video',
      label: 'Bukti perbaikan kedua',
      addedBy: dev.id,
      evidenceStage: 'resolution',
      resolutionEventId: secondResolution.id,
    },
  ]);
});

test.afterAll(async () => {
  await sequelize.close();
});

test('QA assignee sees an authenticated persisted workspace', async ({ page }, testInfo) => {
  await login(page, users.qa.email);

  await expect(page.getByText('Peran: qa')).toBeVisible();
  await expect(page.getByText('Browser E2E QA Assignee Task')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('qa-assignee.png'), fullPage: true });
});

test('QA non-assignee cannot receive the assignee task', async ({ page }) => {
  await login(page, users.qaObserver.email);

  await expect(page.getByText('Peran: qa')).toBeVisible();
  await expect(page.getByText('Browser E2E QA Assignee Task')).not.toBeVisible();
});

test('QA non-assignee is denied before a direct Test Cycle mutation can persist', async ({
  page,
}) => {
  await login(page, users.qaObserver.email);

  const status = await page.evaluate(
    async ({
      workspaceId: persistedWorkspaceId,
      featureTaskId: persistedFeatureTaskId,
      qaTaskId,
    }) => {
      const response = await fetch(
        `http://localhost:4100/v1/workspaces/${persistedWorkspaceId}/qa-test-cycles`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            featureTaskId: persistedFeatureTaskId,
            qaSubtaskId: qaTaskId,
            candidateFingerprint: 'commit:forbidden-browser-e2e',
            build: 'forbidden-browser-e2e',
            environment: 'staging',
          }),
        },
      );
      return response.status;
    },
    { workspaceId, featureTaskId, qaTaskId: qaSubtaskId },
  );

  expect(status).toBe(403);
});

test('QA reads both persisted Bug retest cycles from the task workspace', async ({ page }) => {
  await login(page, users.qa.email);
  await page
    .getByRole('button', {
      name: 'Buka pekerjaan: Browser E2E QA Assignee Task. Tindakan berikutnya: Kerjakan Task QA',
    })
    .click();
  await expect(
    page
      .getByRole('toolbar', { name: 'Browser E2E QA Assignee Task' })
      .getByText('Area Pengujian & Mutu QA'),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Bug & Retest' }).click();
  await expect(page.getByText(bugTitle)).toBeVisible();
  await page.getByRole('button', { name: 'Riwayat Retest' }).click();

  const history = page.getByRole('dialog');
  await expect(history.getByText('Siklus perbaikan #1')).toBeVisible();
  await expect(history.getByText('Siklus perbaikan #2')).toBeVisible();
  await expect(history.getByText('Confirmation still does not appear.')).toBeVisible();
  await expect(history.getByText('Confirmation appears after payment.')).toBeVisible();
  await expect(history.getByText('Bukti perbaikan pertama')).toBeVisible();
  await expect(history.getByText('Bukti perbaikan kedua')).toBeVisible();
});

test('QA direct task link remains authenticated and restores its QA workspace after refresh', async ({
  page,
}) => {
  await login(page, users.qa.email);
  await page.goto(`/projects/${workspaceId}/tasks/${qaSubtaskId}`);

  const qaToolbar = page
    .getByRole('toolbar', { name: 'Browser E2E QA Assignee Task' })
    .getByText('Area Pengujian & Mutu QA');
  await expect(qaToolbar).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/projects/${workspaceId}/tasks/${qaSubtaskId}$`));

  await page.reload();
  await expect(qaToolbar).toBeVisible();
  await expect(page.getByRole('tabpanel', { name: 'Persiapan dan eksekusi QA' })).toBeVisible();
});

test('QA sees an execution loading error and can retry against the persisted backend', async ({
  page,
}) => {
  let shouldAbortExecutionLoad = true;
  await page.route('**/v1/workspaces/*/tasks/*/test-executions', async (route) => {
    if (!shouldAbortExecutionLoad) {
      await route.continue();
      return;
    }
    shouldAbortExecutionLoad = false;
    await route.abort('failed');
  });

  await login(page, users.qa.email);
  await page
    .getByRole('button', {
      name: 'Buka pekerjaan: Browser E2E QA Assignee Task. Tindakan berikutnya: Kerjakan Task QA',
    })
    .click();
  await page.getByRole('tab', { name: 'Persiapan & Eksekusi' }).click();
  const preparation = page.getByRole('tabpanel', { name: 'Persiapan dan eksekusi QA' });
  await expect(preparation.getByText('Eksekusi pengujian tidak dapat dimuat')).toBeVisible();

  await page.unroute('**/v1/workspaces/*/tasks/*/test-executions');
  await page.getByRole('button', { name: 'Muat ulang eksekusi pengujian' }).click();
  await expect(
    page.getByRole('heading', { name: 'Payment confirmation browser workflow' }),
  ).toBeVisible();
});

test('Developer and PO each receive their persisted role view', async ({ browser }) => {
  const developer = await browser.newPage();
  await login(developer, users.dev.email);
  await expect(developer.getByText('Peran: dev')).toBeVisible();

  const productOwner = await browser.newPage();
  await login(productOwner, users.po.email);
  await expect(productOwner.getByText('Peran: po')).toBeVisible();

  await developer.close();
  await productOwner.close();
});

test('factory records are persisted and assigned to the intended QA actor', async () => {
  const persisted = await TaskModel.findByPk(qaSubtaskId);
  expect(persisted?.workspaceId).toBe(workspaceId);
  expect(persisted?.assigneeId).toBe(createdUserIds[2]);
});
