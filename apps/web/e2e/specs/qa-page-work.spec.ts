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

test('E: a Developer sees the QA work page read-only', async ({ page }) => {
  await login(page, pageUsers.dev.email);
  await page.goto(`/work/subtasks/${pageContext.prepareQaSubtaskId}`);

  await expect(page.getByRole('heading', { name: pageTitles.prepareQaSubtask })).toBeVisible();
  await expect(page.getByRole('button', { name: '+ Test Case' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Aktifkan/ })).toHaveCount(0);
});
