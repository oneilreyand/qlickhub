import { expect, test, type Page } from '@playwright/test';
import {
  pageContext,
  pagePassword,
  pageTitles,
  pageUsers,
  seedQaPageWork,
} from '../support/qaPageWorkSeed';

// Do not close the shared Sequelize connection here: Playwright runs every spec file in the same
// worker (workers: 1) and qa-role-isolation.spec.ts closes it at the end of the run. This file
// is named so that it runs before that one.
test.beforeAll(async () => {
  await seedQaPageWork();
});

async function login(page: Page, email: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.getByLabel('Alamat Email').fill(email);
  await page.getByRole('textbox', { name: 'Kata Sandi' }).fill(pagePassword);
  await page.getByRole('button', { name: 'Masuk ke Qlick Hub' }).click();
  await expect(page).toHaveURL(/\/work/);
  await page.goto('/my-tasks');
  await expect(page.getByRole('heading', { name: 'Tugas Saya' })).toBeVisible({ timeout: 30_000 });
}

test('A: Tugas Saya QA shows one ready-to-test card per Feature and opens the QA work page', async ({
  page,
}) => {
  await login(page, pageUsers.qa.email);

  // The Feature has two Developer subtasks in review: one card, not two (AC-3.16).
  await expect(page.getByText('2 dari 3 subtask Developer siap diuji.')).toHaveCount(1);
  await expect(page.getByText(pageTitles.prepareFeature, { exact: true })).toHaveCount(1);

  const card = page
    .getByText(pageTitles.prepareFeature, { exact: true })
    .locator('xpath=ancestor::*[.//button[contains(., "Buka pekerjaan")]][1]');
  await card.getByRole('button', { name: /Buka pekerjaan/ }).click();

  await expect(page).toHaveURL(new RegExp(`/work/subtasks/${pageContext.prepareQaSubtaskId}`));
  await expect(page.getByRole('heading', { name: pageTitles.prepareQaSubtask })).toBeVisible();
});

test('B: Tahap Siapkan shows the waiting banner, locks Lulus/Gagal, and activates a draft Test Case', async ({
  page,
}) => {
  await login(page, pageUsers.qa.email);
  await page.goto(`/work/subtasks/${pageContext.prepareQaSubtaskId}`);

  const banner = page.getByRole('region', { name: 'Tahap Siapkan Test Case' });
  await expect(banner).toBeVisible();
  await expect(banner).toContainText('Menunggu Developer: 2 dari 3 subtask siap diuji');

  // Preparing is still allowed: add and activate Test Cases.
  await expect(page.getByRole('button', { name: '+ Test Case' }).first()).toBeEnabled();
  await expect(page.getByText(pageTitles.draftCase)).toBeVisible();
  await page
    .getByRole('button', { name: /Aktifkan/ })
    .first()
    .click();
  await expect(page.getByText('Test Case diaktifkan dan siap dijalankan')).toBeVisible();

  // Once active, the result buttons exist but stay disabled until Developers are done.
  await expect(page.getByRole('button', { name: 'Lulus' }).first()).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Gagal' }).first()).toBeDisabled();
});

test('C: Tahap Uji records a result with evidence and starts the QA subtask', async ({ page }) => {
  await login(page, pageUsers.qa.email);
  await page.goto(`/work/subtasks/${pageContext.testQaSubtaskId}`);

  await expect(page.getByRole('region', { name: 'Tahap Siapkan Test Case' })).toHaveCount(0);
  await expect(page.getByText(pageTitles.activeCase)).toBeVisible();

  await page.getByRole('button', { name: 'Lulus' }).first().click();
  await expect(page).toHaveURL(
    new RegExp(
      `/tests/cases/${pageContext.activeCaseId}/run\\?subtaskId=${pageContext.testQaSubtaskId}`,
    ),
  );

  await page
    .getByLabel('Tautan bukti (mis. rekaman Loom)')
    .fill('https://www.loom.com/share/e2epagework123456');
  await page.getByRole('button', { name: 'Tambah tautan' }).click();
  await page.getByRole('button', { name: 'Simpan hasil' }).click();
  await expect(page.getByText('Hasil pengujian tersimpan dan terkunci')).toBeVisible();

  // Back on the work page the result is shown and the QA subtask is now in progress.
  await page.goto(`/work/subtasks/${pageContext.testQaSubtaskId}`);
  await expect(page.getByText('Sedang diuji')).toBeVisible();
});

test('D: CSV import rejects an unknown Requirement, corrects it in the preview, and imports both rows', async ({
  page,
}) => {
  await login(page, pageUsers.qa.email);
  await page.goto(`/work/subtasks/${pageContext.importQaSubtaskId}`);

  await page.getByRole('button', { name: 'Impor spreadsheet' }).click();
  const csv = [
    'Title,Requirement Code',
    `${pageTitles.importValidCase},${pageContext.importRequirementCode}`,
    `${pageTitles.importFixedCase},REQ-TIDAK-ADA`,
  ].join('\n');
  await page
    .locator('input[type="file"]')
    .setInputFiles({ name: 'e2e-impor.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });

  // Preview: one valid row, one rejected for an unknown Requirement (AC-3.12).
  await expect(page.getByRole('heading', { name: 'Pratinjau Simulasi Impor' })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText('1 baris tidak akan diimpor.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Impor 1 Baris Valid' })).toBeVisible();

  // Correct the Requirement in the preview (row 3 = second data row); the sheet is untouched.
  await page
    .getByLabel('Ganti Requirement baris 3')
    .selectOption(pageContext.importRequirementCode);
  await expect(page.getByRole('button', { name: 'Impor 2 Baris Valid' })).toBeVisible();

  await page.getByRole('button', { name: 'Impor 2 Baris Valid' }).click();
  await expect(page.getByText('Proses Impor Selesai')).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Selesai' }).click();

  // Both Test Cases now appear on the QA work page.
  await expect(page.getByText(pageTitles.importValidCase)).toBeVisible();
  await expect(page.getByText(pageTitles.importFixedCase)).toBeVisible();
});

test('F: a Bug goes Developer resolve -> QA retest -> verified on the Bug work page', async ({
  browser,
}) => {
  const bugPath = `/work/bugs/${pageContext.bugId}`;

  // Developer starts the Bug and sends the fix.
  const devContext = await browser.newContext();
  const devPage = await devContext.newPage();
  await login(devPage, pageUsers.dev.email);
  await devPage.goto(bugPath);
  await expect(devPage.getByRole('heading', { name: pageTitles.bug })).toBeVisible();
  await devPage.getByRole('button', { name: 'Mulai dikerjakan' }).click();
  await expect(devPage.getByText('Bug mulai dikerjakan')).toBeVisible();
  await devPage.getByRole('button', { name: 'Kirim ke QA' }).click();
  await devPage.getByLabel('Kandidat perbaikan').fill('commit:e2e-page-fix-884');
  await devPage
    .getByLabel('Catatan resolusi')
    .fill('Menambahkan modal konfirmasi pada halaman pembayaran.');
  await devPage.getByRole('button', { name: 'Kirim perbaikan', exact: true }).click();
  await expect(devPage.getByText('Perbaikan dikirim ke QA untuk retest')).toBeVisible();
  await devContext.close();

  // QA retests from the Bug work page and records a passing result.
  const qaContext = await browser.newContext();
  const qaPage = await qaContext.newPage();
  await login(qaPage, pageUsers.qa.email);
  await qaPage.goto(bugPath);
  await expect(qaPage.getByText('Menunggu retest').first()).toBeVisible();
  await qaPage.getByRole('button', { name: 'Mulai retest' }).click();
  await expect(qaPage).toHaveURL(/\/tests\/cases\/.+\/run/, { timeout: 30_000 });

  await qaPage.getByRole('group', { name: 'Hasil' }).getByRole('button', { name: 'Lulus' }).click();
  await qaPage
    .getByLabel('Tautan bukti (mis. rekaman Loom)')
    .fill('https://www.loom.com/share/e2epageretest123456');
  await qaPage.getByRole('button', { name: 'Tambah tautan' }).click();
  await qaPage.getByRole('button', { name: 'Simpan hasil' }).click();
  await expect(qaPage.getByText('Retest lulus: Bug terverifikasi')).toBeVisible({
    timeout: 30_000,
  });

  await qaPage.goto(bugPath);
  await expect(qaPage.getByRole('button', { name: 'Buka kembali' })).toBeVisible();
  await qaContext.close();
});

test('E: a Developer sees the QA work page read-only', async ({ page }) => {
  await login(page, pageUsers.dev.email);
  await page.goto(`/work/subtasks/${pageContext.prepareQaSubtaskId}`);

  await expect(page.getByRole('heading', { name: pageTitles.prepareQaSubtask })).toBeVisible();
  await expect(page.getByRole('button', { name: '+ Test Case' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Aktifkan/ })).toHaveCount(0);
});
