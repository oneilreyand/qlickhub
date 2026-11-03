import { expect, test, type Page } from '@playwright/test';
import { seedFeaturePlanning } from '../support/featurePlanningSeed';
import { FeatureSpecSchema, TaskListResponseSchema } from '@qlick/contracts';

let fixture: Awaited<ReturnType<typeof seedFeaturePlanning>>;
test.beforeAll(async () => {
  fixture = await seedFeaturePlanning();
});
async function login(page: Page) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Alamat Email').fill(fixture.po.email);
  await page.getByRole('textbox', { name: 'Kata Sandi' }).fill(fixture.password);
  await page.getByRole('button', { name: 'Masuk ke Qlick Hub' }).click();
  await expect(page).toHaveURL(/\/work/);
}

test('PO reviews Plan → PRD → Tasks and explicitly applies a persisted version', async ({
  page,
}) => {
  await login(page);
  await page.goto(`/work/features/${fixture.spec.featureTaskId}?tahap=plan`);
  await page.getByLabel(/Latar belakang dan masalah/).fill('Pembeli kehilangan data checkout.');
  await page.getByLabel(/Pengguna sasaran/).fill('Pembeli terdaftar');
  await page.getByLabel(/^Tujuan/).fill('Checkout tersimpan dengan lengkap');
  await page.getByLabel(/Ukuran keberhasilan/).fill('Hasil dapat dibaca ulang');
  await page.getByLabel(/Platform target/).selectOption('web');
  await page.getByLabel(/^Prioritas/).selectOption('high');
  await page.locator('#spec-startDate').fill('2026-11-03');
  await page.locator('#spec-dueDate').fill('2026-11-20');
  await page.getByRole('button', { name: 'Lanjut ke PRD', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Draf PRD' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Lanjut ke Task', exact: true })).toBeDisabled();
  await page.getByLabel('In Scope · Wajib', { exact: true }).fill('Simpan checkout');
  await page.getByLabel('Out of Scope · Wajib', { exact: true }).fill('Pembayaran eksternal');
  await page.getByRole('button', { name: 'Tambah Requirement', exact: true }).click();
  await page.getByLabel('Judul Requirement · Wajib').fill('Simpan checkout');
  await page.getByLabel('Deskripsi Requirement · Wajib').fill('Simpan input valid ke database.');
  await page.getByLabel(/Given —/).fill('Data lengkap');
  await page.getByLabel(/When —/).fill('Form dikirim');
  await page.getByLabel(/Then —/).fill('Checkout tersimpan');
  await page.getByRole('button', { name: 'Lanjut ke Task', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Draf Task' })).toBeVisible();
  await page.getByRole('button', { name: 'Tambah Subtask', exact: true }).click();
  await page.getByLabel('Judul subtask · Wajib').fill('Backend checkout persisten');
  await page.getByLabel('Deskripsi subtask · Wajib').fill('Simpan dan baca checkout.');
  await page.getByLabel('Area delivery · Wajib').selectOption('backend');
  await page.getByLabel('Penanggung jawab · Wajib').selectOption(fixture.dev.id);
  const requirement = page.getByRole('checkbox', { name: /Simpan checkout/ });
  await requirement.focus();
  await requirement.press('Space');
  await expect(requirement).toBeChecked();
  await page.getByRole('button', { name: 'Simpan draf Task', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Tinjau dan Terapkan' })).toBeEnabled();
  await page.getByRole('button', { name: 'Tinjau dan Terapkan' }).click();
  await expect(page.getByRole('dialog')).toContainText('Backend checkout persisten');
  await page.getByRole('button', { name: 'Terapkan sekarang' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  const api = process.env.VITE_API_URL!;
  const read = await page.request.get(
    `${api}/workspaces/${fixture.workspace.id}/feature-specs/${fixture.spec.id}`,
  );
  expect(read.status()).toBe(200);
  const result = FeatureSpecSchema.parse((await read.json()).featureSpec);
  expect(result.status).toBe('applied');
  expect(result.tasks.subtasks).toHaveLength(1);
  const delivery = await page.request.get(
    `${api}/workspaces/${fixture.workspace.id}/tasks/${fixture.spec.featureTaskId}/subtasks`,
  );
  expect(delivery.status()).toBe(200);
  expect(TaskListResponseSchema.parse((await delivery.json()).data).tasks).toHaveLength(1);
});

test('draft design remains usable at phone, tablet and desktop widths in both themes', async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000);
  await login(page);
  for (const width of [390, 768, 1440])
    for (const dark of [false, true])
      for (const stage of ['prd', 'task'] as const) {
        await page.setViewportSize({ width, height: 1000 });
        const featureId =
          stage === 'prd' ? fixture.preview.featureTaskId : fixture.taskPreview.featureTaskId;
        await page.goto(`/work/features/${featureId}?tahap=${stage}`);
        await expect(
          page.getByRole('heading', { name: stage === 'prd' ? 'Draf PRD' : 'Draf Task' }),
        ).toBeVisible();
        await page.evaluate(
          (value) => document.documentElement.classList.toggle('dark', value),
          dark,
        );
        const field = page.getByLabel(
          stage === 'prd' ? 'In Scope · Wajib' : 'Judul subtask · Wajib',
          { exact: true },
        );
        await expect(field).toBeVisible();
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        ).toBe(true);
        await field.focus();
        await expect(field).toBeFocused();
        await page.screenshot({
          path: testInfo.outputPath(`planning-${stage}-${width}-${dark ? 'dark' : 'light'}.png`),
          fullPage: true,
        });
        if (stage === 'task') {
          await page.getByRole('button', { name: 'Tinjau dan Terapkan' }).click();
          const confirm = page.getByRole('button', { name: 'Terapkan sekarang' });
          await expect(confirm).toBeVisible();
          await confirm.focus();
          await expect(confirm).toBeFocused();
          const target = await confirm.boundingBox();
          expect(target!.height).toBeGreaterThanOrEqual(44);
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
          ).toBe(true);
          await page.screenshot({
            path: testInfo.outputPath(`planning-apply-${width}-${dark ? 'dark' : 'light'}.png`),
            fullPage: true,
          });
          await page.keyboard.press('Escape');
          await expect(page.getByRole('dialog')).toBeHidden();
        }
      }
});
