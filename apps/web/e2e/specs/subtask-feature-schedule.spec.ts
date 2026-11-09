import { expect, test as base } from '@playwright/test';
import { FeatureSpecSchema, TaskSchema } from '@qlick/contracts';
import { TaskModel } from '../../../api/src/db/models/index';
import { sequelize } from '../../../api/src/db/sequelize';
import { seedFeaturePlanning } from '../support/featurePlanningSeed';

/** Accounts/Workspace factories are persisted; user data is created through authenticated HTTP. */
const test = base.extend<
  {},
  {
    scheduleFixture: Awaited<ReturnType<typeof seedFeaturePlanning>>;
  }
>({
  // A distinct worker fixture keeps this suite independent of file-scoped database cleanup
  // in earlier suites. Own the connection for this worker, then close it exactly once.
  scheduleFixture: [
    async ({ browser: _browser }, use) => {
      try {
        await use(await seedFeaturePlanning());
      } finally {
        await sequelize.close();
      }
    },
    { scope: 'worker' },
  ],
});
const api = `http://localhost:${process.env.BROWSER_TEST_API_PORT || 4100}/v1`;

for (const viewport of [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
]) {
  for (const theme of ['light', 'dark']) {
    test(`F1 Plan conflict and legacy indicator ${viewport.width}px ${theme}`, async ({
      page,
      scheduleFixture: fixture,
    }, testInfo) => {
      await page.setViewportSize(viewport);
      await page.addInitScript((value) => localStorage.setItem('theme', value), theme);
      await page.goto('/login');
      await page.getByLabel('Alamat Email').fill(fixture.po.email);
      await page.getByRole('textbox', { name: 'Kata Sandi' }).fill(fixture.password);
      await page.getByRole('button', { name: 'Masuk ke Qlick Hub' }).click();
      await expect(page).toHaveURL(/\/work/);
      const specs = `${api}/workspaces/${fixture.workspace.id}/feature-specs/${fixture.spec.id}`;
      const existing = await page.request.get(specs);
      expect(existing.status()).toBe(200);
      const spec = FeatureSpecSchema.parse((await existing.json()).featureSpec);
      const saved = await page.request.put(`${specs}/sections/plan`, {
        data: {
          version: spec.version,
          complete: false,
          content: { ...spec.plan, startDate: '2026-11-01', dueDate: '2026-11-30' },
        },
      });
      expect(saved.status()).toBe(200);
      const tasks = `${api}/workspaces/${fixture.workspace.id}/tasks`;
      const created = await page.request.post(`${tasks}/${spec.featureTaskId}/subtasks`, {
        data: {
          title: `F1 API integration ${viewport.width} ${theme}`,
          deliveryArea: 'backend',
          assigneeId: fixture.po.id,
          startDate: '2026-11-05',
          dueDate: '2026-11-20',
        },
      });
      expect(created.status()).toBe(201);
      await page.goto(`/work/features/${spec.featureTaskId}?tahap=plan`);
      const due = page.locator('#spec-dueDate');
      await due.fill('2026-11-15');
      const failure = page.waitForResponse(
        (r) => r.url().endsWith('/sections/plan') && r.request().method() === 'PUT',
      );
      await page.getByRole('button', { name: 'Simpan draf', exact: true }).focus();
      await page.keyboard.press('Enter');
      expect((await failure).status()).toBe(409);
      await expect(
        page.getByRole('alert').filter({ hasText: 'F1 API integration' }).first(),
      ).toBeVisible();
      await expect(due).toHaveValue('2026-11-15');
      await due.focus();
      await expect(due).toBeFocused();
      const readback = await page.request.get(`${tasks}/${spec.featureTaskId}`);
      expect(TaskSchema.parse((await readback.json()).data).dueDate).toBe('2026-11-30');
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath(`plan-conflict-${viewport.width}-${theme}.png`),
        fullPage: true,
      });

      // Persisted, explicitly labelled legacy factory, then read back through the real API/UI.
      const rootResponse = await page.request.post(tasks, {
        data: {
          title: `F1 legacy fixture ${viewport.width} ${theme}`,
          startDate: '2026-11-01',
          dueDate: '2026-11-30',
        },
      });
      expect(rootResponse.status()).toBe(201);
      const root = TaskSchema.parse((await rootResponse.json()).data);
      const childResponse = await page.request.post(`${tasks}/${root.id}/subtasks`, {
        data: {
          title: 'F1 legacy child fixture',
          deliveryArea: 'backend',
          assigneeId: fixture.po.id,
          startDate: '2026-11-05',
          dueDate: '2026-11-20',
        },
      });
      expect(childResponse.status()).toBe(201);
      const child = TaskSchema.parse((await childResponse.json()).data);
      await TaskModel.update(
        { dueDate: '2026-12-05' },
        { where: { id: child.id, workspaceId: fixture.workspace.id } },
      );
      const legacy = await page.request.get(`${tasks}/${child.id}`);
      expect(TaskSchema.parse((await legacy.json()).data).featureScheduleConstraint?.status).toBe(
        'outside',
      );
      await page.goto(`/work/features/${root.id}?tahap=task`);
      await expect(page.getByText('Di luar jadwal Feature', { exact: true }).first()).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath(`legacy-${viewport.width}-${theme}.png`),
        fullPage: true,
      });
      await page
        .getByRole('region', { name: 'Subtask', exact: true })
        .getByRole('button', { name: 'Kelola', exact: true })
        .click();
      await page.getByRole('button', { name: /F1 legacy child fixture/ }).click();
      await page.getByRole('tab', { name: /Detail/ }).click();
      const released = page.waitForResponse(
        (response) =>
          response.url().endsWith(`/${child.id}/release`) && response.request().method() === 'POST',
      );
      await page.getByRole('button', { name: 'Lepas ke antrean terbuka' }).click();
      const releaseResponse = await released;
      expect(releaseResponse.status()).toBe(200);
      expect(
        TaskSchema.parse((await releaseResponse.json()).data).featureScheduleConstraint?.status,
      ).toBe('outside');
      await expect(page.getByText('Penugasan terbuka', { exact: true })).toBeVisible();
      await expect(page.getByText('Di luar jadwal Feature', { exact: true }).first()).toBeVisible();
      await expect(page.getByText(/Rentang Feature: 2026-11-01/).first()).toBeVisible();
      const modalRootResponse = await page.request.post(tasks, {
        data: { title: 'F1 modal fixture', startDate: '2026-11-01', dueDate: '2026-11-30' },
      });
      expect(modalRootResponse.status()).toBe(201);
      const modalRoot = TaskSchema.parse((await modalRootResponse.json()).data);
      await page.goto(`/work/features/${modalRoot.id}?tahap=task`);
      await page.getByRole('button', { name: '+ Subtask', exact: true }).click();
      const modal = page.getByRole('dialog');
      await modal.getByLabel('Judul Subtask *').fill('F1 concurrent form fixture');
      await modal.getByRole('button', { name: /Backend/ }).click();
      await modal.getByLabel('Pelaksana').selectOption(fixture.dev.id);
      const start = modal.getByLabel('Tanggal Mulai (pasangan opsional)');
      const end = modal.getByLabel('Tanggal Tenggat (pasangan opsional)');
      await expect(start).toHaveAttribute('min', '2026-11-01');
      await expect(end).toHaveAttribute('max', '2026-11-30');
      await start.fill('2026-11-05');
      await end.fill('2026-11-20');
      expect((await end.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      const changed = await page.request.patch(`${tasks}/${modalRoot.id}`, {
        data: { dueDate: '2026-11-15' },
      });
      expect(changed.status()).toBe(200);
      const rejected = page.waitForResponse(
        (r) => r.url().endsWith(`/${modalRoot.id}/subtasks`) && r.request().method() === 'POST',
      );
      await modal.getByRole('button', { name: 'Buat Subtask', exact: true }).click();
      expect((await rejected).status()).toBe(400);
      await expect(modal.getByRole('alert').filter({ hasText: /2026-11-15/ })).toBeVisible();
      await expect(end).toHaveValue('2026-11-20');
      await expect(end).toHaveAttribute('max', '2026-11-15');
      const noChild = await page.request.get(`${tasks}/${modalRoot.id}/subtasks`);
      expect((await noChild.json()).data.total).toBe(0);
      expect(await modal.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath(`child-conflict-${viewport.width}-${theme}.png`),
        fullPage: true,
      });
    });
  }
}
