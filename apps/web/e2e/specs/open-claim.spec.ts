import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { TaskSchema } from '@qlick/contracts';
import { seedOpenClaim } from '../support/openClaimSeed';

let fixture: Awaited<ReturnType<typeof seedOpenClaim>>;
test.beforeAll(async () => {
  fixture = await seedOpenClaim();
});

const api = () => process.env.VITE_API_URL!;

async function login(page: Page, email: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Alamat Email').fill(email);
  await page.getByRole('textbox', { name: 'Kata Sandi' }).fill(fixture.password);
  await page.getByRole('button', { name: 'Masuk ke Qlick Hub' }).click();
  await expect(page).toHaveURL(/\/work/);
}

async function readTask(request: APIRequestContext, taskId: string) {
  const response = await request.get(`${api()}/workspaces/${fixture.workspace.id}/tasks/${taskId}`);
  expect(response.status()).toBe(200);
  return TaskSchema.parse((await response.json()).data);
}

function available(page: Page) {
  return page.getByRole('region', { name: 'Tersedia untuk Diambil' });
}

test('Developer claims matching open work from Tugas Saya and the claim persists (AC-5.10)', async ({
  page,
}) => {
  await login(page, fixture.devBackend.email);
  await page.goto('/my-tasks');
  const section = available(page);
  await expect(section.getByText('Webhook pembayaran terbuka')).toBeVisible();
  // Frontend and QA open work do not match a Backend Developer.
  await expect(section.getByText('Form checkout terbuka')).toHaveCount(0);
  await expect(section.getByText('QA checkout terbuka')).toHaveCount(0);

  await section.getByRole('button', { name: 'Ambil: Webhook pembayaran terbuka' }).click();
  await expect(
    page.getByText('Subtask "Webhook pembayaran terbuka" sekarang milik Anda.'),
  ).toBeVisible();
  await expect(section.getByText('Webhook pembayaran terbuka')).toHaveCount(0);
  await expect(
    page
      .getByRole('region', { name: 'Pekerjaan yang Ditugaskan' })
      .getByText('Webhook pembayaran terbuka')
      .or(
        page
          .getByRole('region', { name: 'Mulai dari sini' })
          .getByText('Webhook pembayaran terbuka'),
      ),
  ).toBeVisible();

  const persisted = await readTask(page.request, fixture.backendOpen.id);
  expect(persisted.assigneeId).toBe(fixture.devBackend.id);
  expect(persisted.assignmentMode).toBe('assigned');
  expect(persisted.status).toBe('todo');
});

test('a stale card gets the conflict message after someone else claims first', async ({
  page,
  browser,
}) => {
  await login(page, fixture.devFullstack.email);
  await page.goto('/my-tasks');
  const section = available(page);
  // Fullstack sees backend and frontend open work, never QA work.
  await expect(section.getByText('Rekonsiliasi saldo terbuka')).toBeVisible();
  await expect(section.getByText('Form checkout terbuka')).toBeVisible();
  await expect(section.getByText('QA checkout terbuka')).toHaveCount(0);

  // The Backend Developer claims the same subtask through their own authenticated session.
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await login(otherPage, fixture.devBackend.email);
  const current = await readTask(otherPage.request, fixture.raceOpen.id);
  const claim = await otherPage.request.post(
    `${api()}/workspaces/${fixture.workspace.id}/tasks/${fixture.raceOpen.id}/claim`,
    { data: { expectedUpdatedAt: current.updatedAt } },
  );
  expect(claim.status()).toBe(200);
  await other.close();

  await section.getByRole('button', { name: 'Ambil: Rekonsiliasi saldo terbuka' }).click();
  await expect(
    page.getByText(
      'Subtask ini sudah diambil anggota lain atau baru berubah. Antrean dimuat ulang.',
    ),
  ).toBeVisible();
  await expect(section.getByText('Rekonsiliasi saldo terbuka')).toHaveCount(0);
  // Unclaimed open work stays readable only as a queue card (no Task read before a claim).
  await expect(section.getByText('Form checkout terbuka')).toBeVisible();
  const denied = await page.request.get(
    `${api()}/workspaces/${fixture.workspace.id}/tasks/${fixture.frontendOpen.id}`,
  );
  expect(denied.status()).toBe(403);
});

test('QA claims open QA work; PO releases assigned work back to the open queue', async ({
  page,
  browser,
}) => {
  await login(page, fixture.qa.email);
  await page.goto('/my-tasks');
  await available(page).getByRole('button', { name: 'Ambil: QA checkout terbuka' }).click();
  await expect(page.getByText('Subtask "QA checkout terbuka" sekarang milik Anda.')).toBeVisible();
  expect((await readTask(page.request, fixture.qaOpen.id)).assigneeId).toBe(fixture.qa.id);

  const poContext = await browser.newContext();
  const poPage = await poContext.newPage();
  await login(poPage, fixture.po.email);
  await poPage.goto(`/work/features/${fixture.feature.id}?tahap=task`);
  await poPage
    .getByRole('region', { name: 'Subtask' })
    .getByRole('button', { name: 'Kelola' })
    .click();
  await poPage
    .getByRole('button', { name: /API refund ditugaskan/ })
    .first()
    .click();
  await poPage
    .getByRole('tab', { name: /Detail/ })
    .last()
    .click();
  await poPage.getByRole('button', { name: 'Lepas ke antrean terbuka' }).click();
  await expect(poPage.getByText('Subtask dilepas ke antrean terbuka.')).toBeVisible();
  const released = await readTask(poPage.request, fixture.assigned.id);
  expect(released.assigneeId).toBeNull();
  expect(released.assignmentMode).toBe('open');
  expect(released.status).toBe('todo');
  // The open subtask panel stays where the PO is working and now shows the open state.
  await expect(poPage.getByText('Penugasan terbuka', { exact: true })).toBeVisible();
  await expect(poPage.getByRole('button', { name: 'Lepas ke antrean terbuka' })).toHaveCount(0);
  await expect(
    poPage
      .getByRole('button', { name: /API refund ditugaskan/ })
      .first()
      .getByText('Terbuka'),
  ).toBeVisible();
  await poContext.close();
});

test('available work is usable at phone, tablet and desktop widths in both themes', async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000);
  await login(page, fixture.devFullstack.email);
  for (const width of [390, 768, 1440])
    for (const dark of [false, true]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto('/my-tasks');
      const section = available(page);
      const claim = section.getByRole('button', { name: 'Ambil: Form checkout terbuka' });
      await expect(claim).toBeVisible();
      await page.evaluate(
        (value) => document.documentElement.classList.toggle('dark', value),
        dark,
      );
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      await claim.focus();
      await expect(claim).toBeFocused();
      const box = await claim.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      await section.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: testInfo.outputPath(`claim-available-${width}-${dark ? 'dark' : 'light'}.png`),
        fullPage: true,
      });
    }
});
