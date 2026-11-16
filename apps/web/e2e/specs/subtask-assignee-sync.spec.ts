import { expect, test as base } from '@playwright/test';
import { TaskSchema } from '@qlick/contracts';
import { sequelize } from '../../../api/src/db/sequelize';
import { seedAssigneeSync } from '../support/assigneeSyncSeed';

const test = base.extend<{}, { fixture: Awaited<ReturnType<typeof seedAssigneeSync>> }>({
  fixture: [
    async ({ browser: _browser }, use) => {
      try {
        await use(await seedAssigneeSync());
      } finally {
        await sequelize.close();
      }
    },
    { scope: 'worker' },
  ],
});
const api = `http://localhost:${process.env.BROWSER_TEST_API_PORT || 4100}/v1`;

test('reassigning a subtask updates every place that shows its assignee', async ({
  page,
  fixture,
}, testInfo) => {
  await page.goto('/login');
  await page.getByLabel('Alamat Email').fill(fixture.po.email);
  await page.getByRole('textbox', { name: 'Kata Sandi' }).fill(fixture.password);
  await page.getByRole('button', { name: 'Masuk ke Qlick Hub' }).click();
  await expect(page).toHaveURL(/\/work/);

  const tasks = `${api}/workspaces/${fixture.workspace.id}/tasks`;
  const root = TaskSchema.parse(
    (
      await (
        await page.request.post(tasks, {
          data: { title: `Assignee sync ${testInfo.project.name}` },
        })
      ).json()
    ).data,
  );
  const child = TaskSchema.parse(
    (
      await (
        await page.request.post(`${tasks}/${root.id}/subtasks`, {
          data: {
            title: 'Assignee sync subtask',
            deliveryArea: 'backend',
            assigneeId: fixture.first.id,
          },
        })
      ).json()
    ).data,
  );

  await page.goto(`/work/features/${root.id}?tahap=task`);
  const summary = page.getByRole('region', { name: 'Subtask', exact: true });
  await expect(summary.getByTitle('Andi Backend')).toBeVisible();

  await summary.getByRole('button', { name: 'Kelola', exact: true }).click();
  await page.getByRole('button', { name: /Assignee sync subtask/ }).click();
  await page.getByRole('tab', { name: /Detail/ }).click();
  await page
    .locator('select')
    .filter({ has: page.locator('option', { hasText: 'Budi Backend (DEV)' }) })
    .first()
    .selectOption({ label: 'Budi Backend (DEV)' });
  const saved = page.waitForResponse(
    (r) => r.url().endsWith(`/tasks/${child.id}`) && r.request().method() === 'PATCH',
  );
  await page.getByRole('button', { name: 'Simpan Detail' }).click();
  expect((await saved).status()).toBe(200);
  await page.screenshot({ path: testInfo.outputPath('after-save-manage.png'), fullPage: true });

  // Server state is the reference.
  const readback = TaskSchema.parse(
    (await (await page.request.get(`${tasks}/${child.id}`)).json()).data,
  );
  expect(readback.assigneeId).toBe(fixture.second.id);

  // 1) The accordion header in the manage view.
  await expect(
    page.getByRole('button', { name: /Assignee sync subtask/ }).getByText('Budi Backend'),
  ).toBeVisible();

  // 2) The Feature summary, without reloading the page.
  await page.getByRole('button', { name: 'Kembali ke ringkasan' }).click();
  await expect(summary.getByTitle('Budi Backend')).toBeVisible();
  await expect(summary.getByTitle('Andi Backend')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('after-save-summary.png'), fullPage: true });

  // 3) The subtask work page opened from the summary.
  await summary
    .getByRole('button', { name: /Assignee sync subtask/ })
    .first()
    .click();
  await expect(page.getByText('Budi Backend').first()).toBeVisible();
  await expect(page.getByText('Andi Backend')).toHaveCount(0);

  // 4) Tugas Saya: the previous assignee no longer sees it, the new assignee does.
  for (const [who, visible] of [
    [fixture.first, false],
    [fixture.second, true],
  ] as const) {
    await page.context().clearCookies();
    await page.goto('/login');
    await page.getByLabel('Alamat Email').fill(who.email);
    await page.getByRole('textbox', { name: 'Kata Sandi' }).fill(fixture.password);
    await page.getByRole('button', { name: 'Masuk ke Qlick Hub' }).click();
    await expect(page).toHaveURL(/\/work/);
    await page.goto('/my-tasks');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: testInfo.outputPath(`my-tasks-${who.name}.png`),
      fullPage: true,
    });
    if (visible) await expect(page.getByText('Assignee sync subtask').first()).toBeVisible();
    else await expect(page.getByText('Assignee sync subtask')).toHaveCount(0);
  }
});
