import { expect, test, type Page } from '@playwright/test';
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

const password = 'E2ePassword123!';
const stamp = `${Date.now()}-${process.pid}`;
const users = {
  po: { email: `e2e.po.flow.${stamp}@example.test`, role: 'po' as const, name: 'E2E PO Flow' },
  dev: { email: `e2e.dev.flow.${stamp}@example.test`, role: 'dev' as const, name: 'E2E Dev Flow' },
  qa: { email: `e2e.qa.flow.${stamp}@example.test`, role: 'qa' as const, name: 'E2E QA Flow' },
};

let workspaceId = '';
let featureTaskId = '';
let bugFeatureTaskId = '';
let devUserId = '';

async function login(page: Page, email: string) {
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
});

test.afterAll(async () => {
  await sequelize.close();
});

test('Alur Pass Lengkap: Inisiasi modal rantai 5 langkah, eksekusi versi aktif, catat hasil, selesai, sign-off, dan screenshot 390px', async ({
  page,
}) => {
  let actualClickCount = 0;
  const click = async (target: ReturnType<Page['getByRole']> | ReturnType<Page['getByLabel']>) => {
    await target.click();
    actualClickCount++;
  };

  await login(page, users.qa.email);

  // 1. Buka drawer tugas QA dari dashboard My Tasks
  const taskButton = page.getByRole('button', { name: /QA Eksekusi Alur Pass Sederhana/i });
  await expect(taskButton).toBeVisible();
  await click(taskButton);

  const drawer = page.getByRole('region', { name: /QA Eksekusi Alur Pass Sederhana content/i });
  await expect(drawer).toBeVisible();

  // Verifikasi kartu Langkah Berikutnya dalam keadaan tahap 1 inisiasi
  await expect(page.getByText('Mulai Pengerjaan Tugas QA')).toBeVisible();

  // 2. Klik "Mulai Tugas QA" untuk membuka Dialog 1 Rantai Inisiasi
  const startBtn = page.getByRole('button', { name: 'Mulai Tugas QA' }).first();
  await expect(startBtn).toBeVisible();
  await click(startBtn);

  // 3. Masukkan Build / Versi pada formulir inisiasi
  await expect(page.getByText('Mulai Tugas QA & Aktifkan Pengujian')).toBeVisible();
  const buildInput = page.getByLabel(/^Build/i);
  await click(buildInput);
  await buildInput.fill('v1.0.0-rc1-pass');

  // 4. Klik "Simpan & Aktifkan" (menjalankan rantai a-e: status -> cycle -> draft -> ac -> activate)
  const saveAndActivateBtn = page.getByRole('button', { name: 'Simpan & Aktifkan' }).first();
  await click(saveAndActivateBtn);

  // Tunggu modal tertutup dan kartu langkah berikutnya diperbarui
  await expect(page.getByText('Mulai Tugas QA & Aktifkan Pengujian')).not.toBeVisible();
  await expect(page.getByRole('heading', { name: 'Jalankan Test Case' })).toBeVisible();

  // 5. Klik "Jalankan Test Case" pada kartu Langkah Berikutnya (langsung menggunakan versi aktif)
  const runBtn = page.getByRole('button', { name: 'Jalankan Test Case', exact: true }).first();
  await click(runBtn);

  // 6. Kartu Langkah Berikutnya bertransisi ke "Catat Hasil Pengujian", klik tombol untuk membuka modal
  const recordResultCardBtn = page.getByRole('button', { name: 'Catat Hasil Pengujian' }).first();
  await expect(recordResultCardBtn).toBeVisible();
  await click(recordResultCardBtn);

  // Dialog Catat Hasil Pengujian langsung terbuka
  const resultDialog = page.getByRole('dialog', { name: 'Catat Hasil Pengujian' });
  await expect(resultDialog).toBeVisible();

  // 7. Klik "Tambah Tautan" untuk melampirkan bukti URL
  const addLinkBtn = resultDialog.getByRole('button', { name: 'Tambah Tautan' }).first();
  await click(addLinkBtn);

  const evidenceInput = resultDialog.getByPlaceholder(/https:\/\/www\.youtube\.com/i);
  await evidenceInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

  // 8. Simpan Hasil pengujian (Lulus)
  const submitResultBtn = resultDialog.getByRole('button', { name: 'Catat Hasil' }).first();
  await click(submitResultBtn);

  await expect(resultDialog).not.toBeVisible();

  // 9. Kartu langkah berikutnya berganti ke "Selesaikan Tugas QA"
  await expect(page.getByRole('heading', { name: 'Selesaikan Tugas QA' })).toBeVisible({
    timeout: 10000,
  });
  const completeTaskBtn = page.getByRole('button', { name: 'Selesaikan Tugas QA' }).first();
  await click(completeTaskBtn);

  // 10. Kartu langkah berikutnya berganti ke "Beri Persetujuan QA", klik tombol
  await expect(page.getByRole('heading', { name: /Beri Persetujuan QA/i })).toBeVisible();
  const navSignOffBtn = page.getByRole('button', { name: 'Beri Persetujuan QA' }).first();
  await click(navSignOffBtn);

  // Berpindah ke tab Persetujuan & Riwayat
  await expect(page.getByRole('tab', { name: 'Persetujuan & Riwayat' })).toHaveAttribute(
    'aria-selected',
    'true',
  );

  // 11. Klik tombol "Catat Persetujuan QA" pada ReleaseAssurancePanel
  const recordSignOffBtn = page
    .getByRole('tabpanel', { name: 'Persetujuan QA dan riwayat' })
    .getByRole('button', { name: 'Catat Persetujuan QA', exact: true });
  await expect(recordSignOffBtn).toBeVisible();
  await click(recordSignOffBtn);

  // 12. Modal Catat Persetujuan QA terbuka, konfirmasi keputusan persetujuan
  const signOffDialog = page.getByRole('dialog', { name: 'Catat Persetujuan QA' });
  await expect(signOffDialog).toBeVisible();
  const confirmSignOffBtn = signOffDialog.getByRole('button', { name: 'Catat Keputusan' }).first();
  await click(confirmSignOffBtn);

  // 13. Verifikasi kartu Langkah Berikutnya ter-update langsung ke terminal state tanpa tutup drawer
  await expect(page.getByText('Pengujian & Persetujuan QA Selesai')).toBeVisible();
  await expect(page.getByText('Persetujuan QA Tercatat')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Beri Persetujuan QA' })).not.toBeVisible();

  // Verifikasi hitungan klik aktual: Target Prompt 6 adalah <= 12 klik (realistis 10-11 klik)
  expect(actualClickCount).toBeLessThanOrEqual(12);

  // Tangkap Screenshot Desktop (1280x800)
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(400);
  await page.screenshot({
    path: 'docs/screenshots/qa-flow-pass-desktop.png',
    fullPage: true,
  });

  // Tangkap Screenshot Mobile 390px
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    const drawerEl = document.querySelector('section[aria-label*="content"]');
    if (drawerEl) drawerEl.scrollTop = 0;
  });
  await page.waitForTimeout(400);
  await page.screenshot({
    path: 'docs/screenshots/qa-flow-pass-mobile-390px.png',
  });
});

test('Alur Bug -> Dev Resolve (Candidate Fingerprint) -> QA Retest Prefill -> Sign-off', async ({
  browser,
}) => {
  const qaContext = await browser.newContext();
  const qaPage = await qaContext.newPage();
  await login(qaPage, users.qa.email);

  // QA membuka drawer tugas Bug & Retest
  await qaPage.getByRole('button', { name: /QA Eksekusi Alur Bug dan Retest/i }).click();
  await expect(
    qaPage.getByRole('region', { name: /QA Eksekusi Alur Bug dan Retest content/i }),
  ).toBeVisible();

  // Buka tab Bug & Retest untuk mencatat Bug dari hasil failing
  await qaPage.getByRole('tab', { name: 'Bug & Retest' }).click();
  const logBugBtn = qaPage.getByRole('button', { name: 'Catat Bug' });
  await expect(logBugBtn).toBeVisible();
  await logBugBtn.click();

  const bugModal = qaPage.getByRole('dialog', { name: /Buat Bug/i });
  await expect(bugModal).toBeVisible();

  // Pilih hasil gagal asal dan developer yang ditugaskan
  const traceSelect = qaPage.getByLabel(/Hasil gagal atau terblokir asal/i);
  await traceSelect.selectOption({ index: 0 });

  const devSelect = qaPage.getByLabel('Developer yang ditugaskan');
  await expect(devSelect).toBeVisible();
  await expect(devSelect.locator(`option[value="${devUserId}"]`)).toBeAttached({ timeout: 10000 });
  await devSelect.selectOption(devUserId);

  await qaPage
    .getByLabel(/Judul \/ ringkasan Bug/i)
    .fill('E2E Timeout Bug pada Gateway Pembayaran');
  await qaPage
    .getByLabel(/Langkah reproduksi/i)
    .fill('Lakukan panggilan pembayaran saat simulasi timeout.');
  await qaPage.getByRole('button', { name: 'Kirim Laporan Bug' }).first().click();

  await expect(bugModal).not.toBeVisible();
  await expect(qaPage.getByText('E2E Timeout Bug pada Gateway Pembayaran')).toBeVisible({
    timeout: 10000,
  });

  // Developer login dan menyelesaikan Bug dengan kode kandidat
  const devContext = await browser.newContext();
  const devPage = await devContext.newPage();
  await login(devPage, users.dev.email);

  const candidateCode = 'commit:dev-e2e-patch-884';

  // Dapatkan ID Bug yang baru saja dibuat
  const createdBug = await BugModel.findOne({
    where: { workspaceId, featureTaskId: bugFeatureTaskId },
    order: [['createdAt', 'DESC']],
  });
  expect(createdBug).toBeTruthy();

  // Developer transisikan Bug ke in_progress dan catat resolusi dengan candidateCode
  await devPage.evaluate(
    async ({ wsId, bId, candidate }) => {
      await fetch(`http://localhost:4100/v1/workspaces/${wsId}/bugs/${bId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'in_progress' }),
      });
      await fetch(`http://localhost:4100/v1/workspaces/${wsId}/bugs/${bId}/resolution-events`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateFingerprint: candidate,
          resolutionNotes: 'Menambahkan retry 15 detik pada gateway pembayaran.',
        }),
      });
    },
    { wsId: workspaceId, bId: createdBug!.id, candidate: candidateCode },
  );

  await devContext.close();

  // Kembali ke QA Page: Pindah ke tab Test Case & Eksekusi untuk membuat versi pengujian baru
  await qaPage.getByRole('tab', { name: 'Test Case & Eksekusi' }).click();
  const setVersionBtn = qaPage
    .getByRole('button', { name: /Tetapkan Versi Uji|Siklus Baru/i })
    .first();
  await expect(setVersionBtn).toBeVisible();
  await setVersionBtn.click();

  const cycleModal = qaPage.getByRole('dialog', { name: /Tetapkan Versi yang Diuji/i });
  await expect(cycleModal).toBeVisible();

  // Verifikasi banner dev resolution terlihat dengan kode kandidat Dev
  await expect(
    cycleModal.getByText(new RegExp(`Versi perbaikan dari Dev:.*${candidateCode}`, 'i')),
  ).toBeVisible();

  // Verifikasi input candidateFingerprint telah ter-prefill dengan kandidat Dev
  const fingerprintInput = cycleModal.getByLabel(/Identitas Kandidat/i);
  await expect(fingerprintInput).toHaveValue(candidateCode);

  // Lengkapi build & simpan siklus uji
  await cycleModal.getByLabel(/^Build/i).fill('build-retest-884');
  await cycleModal.getByRole('button', { name: 'Simpan Versi Uji' }).first().click();
  await expect(cycleModal).not.toBeVisible();

  // Pindah ke tab Bug & Retest dan jalankan retest
  await qaPage.getByRole('tab', { name: 'Bug & Retest' }).click();
  const retestBtn = qaPage.getByRole('button', { name: 'Mulai Retest' }).first();
  await expect(retestBtn).toBeVisible();
  await retestBtn.click();

  // Retest run telah dibuat dan aktif. Pindah ke tab Test Case untuk mencatat hasil
  const catatHasilBtn = qaPage.getByRole('button', { name: 'Catat Hasil Pengujian' }).first();
  await expect(catatHasilBtn).toBeVisible({ timeout: 10000 });
  await catatHasilBtn.click();

  // Catat hasil Lulus untuk retest
  const resultModal = qaPage.getByRole('dialog', { name: 'Catat Hasil Pengujian' });
  await expect(resultModal).toBeVisible();
  await resultModal.getByRole('button', { name: 'Tambah Tautan' }).first().click();
  await resultModal
    .getByPlaceholder(/https:\/\/www\.youtube\.com/i)
    .fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  await resultModal.getByRole('button', { name: 'Catat Hasil' }).first().click();
  await expect(resultModal).not.toBeVisible();
  // Selesaikan tugas QA pada kartu Langkah Berikutnya
  await expect(qaPage.getByRole('heading', { name: 'Selesaikan Tugas QA' })).toBeVisible({
    timeout: 10000,
  });
  await qaPage.getByRole('button', { name: 'Selesaikan Tugas QA' }).first().click();
  // Beri Persetujuan QA
  await expect(qaPage.getByRole('heading', { name: /Beri Persetujuan QA/i })).toBeVisible({
    timeout: 10000,
  });
  await qaPage.getByRole('button', { name: 'Beri Persetujuan QA' }).first().click();

  await expect(qaPage.getByRole('tab', { name: 'Persetujuan & Riwayat' })).toHaveAttribute(
    'aria-selected',
    'true',
  );

  const signOffPanelBtn = qaPage
    .getByRole('tabpanel', { name: 'Persetujuan QA dan riwayat' })
    .getByRole('button', { name: 'Catat Persetujuan QA', exact: true });
  await expect(signOffPanelBtn).toBeVisible({ timeout: 10000 });
  await expect(signOffPanelBtn).toBeEnabled({ timeout: 10000 });
  await signOffPanelBtn.evaluate((el) => {
    el.scrollIntoView({ block: 'center' });
    (el as HTMLElement).click();
  });
  const signOffDialog = qaPage.getByRole('dialog', { name: 'Catat Persetujuan QA' });
  await expect(signOffDialog).toBeVisible({ timeout: 10000 });
  await signOffDialog.getByRole('button', { name: 'Catat Keputusan' }).first().click();

  // Verifikasi status terminal pada kartu Langkah Berikutnya
  await expect(qaPage.getByText('Pengujian & Persetujuan QA Selesai')).toBeVisible();
  await expect(qaPage.getByText('Persetujuan QA Tercatat')).toBeVisible();

  // Tangkap Screenshot Retest Desktop dan Mobile
  await qaPage.setViewportSize({ width: 1280, height: 800 });
  await qaPage.waitForTimeout(400);
  await qaPage.screenshot({
    path: 'docs/screenshots/qa-flow-retest-desktop.png',
    fullPage: true,
  });

  await qaPage.setViewportSize({ width: 390, height: 844 });
  await qaPage.evaluate(() => {
    const drawerEl = document.querySelector('section[aria-label*="content"]');
    if (drawerEl) drawerEl.scrollTop = 0;
  });
  await qaPage.waitForTimeout(400);
  await qaPage.screenshot({
    path: 'docs/screenshots/qa-flow-retest-mobile-390px.png',
  });

  await qaContext.close();
});
