import { expect, test, type Browser, type Page } from '@playwright/test';
import { flowPassword, seedSdlcFlow } from '../support/sdlcFlowSeed';

/**
 * E2E-SDLC-FLOW P5 (QA-1): one Feature from the PO's idea to the Release Decision, through the UI
 * only. Only accounts and the Workspace are seeded. The QA account's global role is `dev` while
 * its Workspace role is `qa`, so every QA step proves the web app follows the Workspace role.
 *
 * Runs before qa-role-isolation.spec.ts, which closes the shared Sequelize connection.
 */
let fixture: Awaited<ReturnType<typeof seedSdlcFlow>>;

const titles = {
  feature: 'Pendaftaran Pasien E2E',
  requirement: 'Simpan data pasien',
  be: 'Backend pendaftaran pasien',
  fe: 'Form pendaftaran pasien',
  qa: 'Uji pendaftaran pasien',
  testCase: 'Pasien baru tersimpan',
  bug: 'Data pasien tidak tersimpan',
};

const day = (offset: number) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
};

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function signIn(browser: Browser, email: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.getByLabel('Alamat Email').fill(email);
  await page.getByRole('textbox', { name: 'Kata Sandi' }).fill(flowPassword);
  await page.getByRole('button', { name: 'Masuk ke Qlick Hub' }).click();
  await expect(page).toHaveURL(/\/work/);
  return { page, close: () => context.close() };
}

/** Opens a Tugas Saya card by its title and checks the page is not a dead end (AC step 9). */
async function openQueueCard(page: Page, title: string, nextAction?: string) {
  await page.goto('/my-tasks');
  await expect(page.getByRole('heading', { name: 'Tugas Saya' })).toBeVisible({ timeout: 30_000 });
  const action = page.getByRole('button', {
    name: new RegExp(
      `^[^:]+: ${escape(title)}\\.${nextAction ? ` Tindakan berikutnya: ${escape(nextAction)}` : ''}`,
    ),
  });
  await expect(action.first()).toBeVisible({ timeout: 30_000 });
  await action.first().click();
  await expect(page.getByText(/tidak dapat dibuka/)).toHaveCount(0);
}

async function addEvidence(page: Page, url: string) {
  await page.getByLabel('Tautan bukti (mis. rekaman Loom)').fill(url);
  await page.getByRole('button', { name: 'Tambah tautan' }).click();
}

async function developerSendsToQa(
  browser: Browser,
  email: string,
  title: string,
  handoff?: { build: string; environment: string; testCase: string },
) {
  const dev = await signIn(browser, email);
  await openQueueCard(dev.page, title);
  await expect(dev.page).toHaveURL(/\/work\/subtasks\//);
  await dev.page.getByRole('button', { name: 'Mulai dikerjakan' }).click();
  const send = dev.page.getByRole('button', { name: 'Kirim ke QA' });
  await expect(send).toBeVisible({ timeout: 30_000 });
  // The Developer self-checks every criterion inherited from the Requirement before sending.
  const criteria = dev.page.getByRole('region', { name: 'Selesai jika' }).getByRole('checkbox');
  await expect(criteria.first()).toBeEnabled();
  const count = await criteria.count();
  for (let index = 0; index < count; index += 1) {
    await criteria.nth(index).check();
    await expect(criteria.nth(index)).toBeChecked();
  }
  await expect(dev.page.getByText(`${count} dari ${count} dicek`)).toBeVisible();
  if (handoff) {
    // P7 (AC-13): the Developer sees the QA Test Case read-only as its reference.
    const testCases = dev.page.getByRole('region', { name: 'Test Case QA' });
    await expect(testCases).toContainText(handoff.testCase);
    await expect(testCases).toContainText('Belum diuji');
    // P7 (AC-14): build and environment go with the handoff and prefill the QA cycle form.
    await dev.page.getByLabel('Build / versi (opsional)').fill(handoff.build);
    await dev.page.getByLabel('Lingkungan (opsional)').fill(handoff.environment);
  }
  await dev.page.getByRole('button', { name: 'Kirim ke QA' }).click();
  await expect(dev.page.getByRole('button', { name: 'Kirim ke QA' })).toHaveCount(0, {
    timeout: 30_000,
  });
  await dev.close();
}

async function developerFixesBug(
  browser: Browser,
  candidate: string,
  via: 'queue' | 'bell' = 'queue',
) {
  const dev = await signIn(browser, fixture.devBe.email);
  if (via === 'bell') {
    // P6: the Bug notification in the bell opens the Bug work page, not the Feature.
    await dev.page.goto('/my-tasks');
    await dev.page.getByRole('button', { name: 'Notifikasi' }).click();
    await dev.page.getByText(`Bug baru "${titles.bug}" perlu ditangani.`).first().click();
  } else {
    await openQueueCard(dev.page, titles.bug);
  }
  await expect(dev.page).toHaveURL(/\/work\/bugs\//);
  await dev.page.getByRole('button', { name: 'Mulai dikerjakan' }).click();
  await expect(dev.page.getByText('Bug mulai dikerjakan')).toBeVisible();
  await dev.page.getByRole('button', { name: 'Kirim ke QA' }).click();
  await dev.page.getByLabel('Kandidat perbaikan').fill(candidate);
  await dev.page.getByLabel('Catatan resolusi').fill(`Perbaikan ${candidate}.`);
  await dev.page.getByRole('button', { name: 'Kirim perbaikan', exact: true }).click();
  await expect(dev.page.getByText('Perbaikan dikirim ke QA untuk retest')).toBeVisible();
  await dev.close();
}

async function qaRetests(browser: Browser, outcome: 'Lulus' | 'Gagal') {
  const qa = await signIn(browser, fixture.qa.email);
  await openQueueCard(qa.page, titles.bug);
  await expect(qa.page).toHaveURL(/\/work\/bugs\//);
  await qa.page.getByRole('button', { name: 'Mulai retest' }).click();
  await expect(qa.page).toHaveURL(/\/tests\/cases\/.+\/run/, { timeout: 30_000 });
  await qa.page
    .getByRole('group', { name: 'Hasil' })
    .getByRole('button', { name: outcome })
    .click();
  if (outcome === 'Gagal') {
    await qa.page.getByLabel('Hasil aktual (wajib)').fill('Data pasien masih hilang.');
  }
  await addEvidence(qa.page, `https://www.loom.com/share/e2eflowretest${outcome.toLowerCase()}1`);
  await qa.page.getByRole('button', { name: 'Simpan hasil' }).click();
  await expect(
    qa.page.getByText(
      outcome === 'Lulus'
        ? 'Retest lulus: Bug terverifikasi'
        : 'Retest tidak lulus: Bug dibuka kembali untuk Developer',
    ),
  ).toBeVisible({ timeout: 30_000 });
  await qa.close();
}

test.beforeAll(async () => {
  fixture = await seedSdlcFlow();
});

test('one Feature runs from idea to Release Decision through the UI (E2E-SDLC-FLOW)', async ({
  browser,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'One full flow is enough per run.');
  test.setTimeout(300_000);
  let featurePath = '';

  await test.step('1. PO writes the idea, completes Plan, PRD and Task, then applies', async () => {
    const po = await signIn(browser, fixture.po.email);
    await po.page.goto('/work?tab=tasks');
    await po.page.getByRole('button', { name: 'Tulis ide' }).click();
    await po.page.getByLabel('Judul Feature').fill(titles.feature);
    await po.page.getByLabel('Ide awal').fill('Petugas mendaftarkan pasien baru dari satu form.');
    await po.page.getByRole('button', { name: 'Simpan dan lanjut' }).click();
    await expect(po.page).toHaveURL(/\/work\/features\/.+\?tahap=plan/);
    featurePath = new URL(po.page.url()).pathname;

    await po.page.getByLabel(/Latar belakang dan masalah/).fill('Pendaftaran masih di kertas.');
    await po.page.getByLabel(/Pengguna sasaran/).fill('Petugas pendaftaran');
    await po.page.getByLabel(/^Tujuan/).fill('Pasien baru tercatat di sistem');
    await po.page.getByLabel(/Ukuran keberhasilan/).fill('Data pasien dapat dibaca ulang');
    await po.page.getByLabel(/Platform target/).selectOption('web');
    await po.page.getByLabel(/^Prioritas/).selectOption('high');
    await po.page.locator('#spec-startDate').fill(day(0));
    await po.page.locator('#spec-dueDate').fill(day(21));
    await po.page.getByRole('button', { name: 'Lanjut ke PRD', exact: true }).click();
    await expect(po.page.getByRole('heading', { name: 'Draf PRD' })).toBeVisible();

    await po.page.getByLabel('In Scope · Wajib', { exact: true }).fill('Form pasien baru');
    await po.page.getByLabel('Out of Scope · Wajib', { exact: true }).fill('Rekam medis');
    await po.page.getByRole('button', { name: 'Tambah Requirement', exact: true }).click();
    await po.page.getByLabel('Judul Requirement · Wajib').fill(titles.requirement);
    await po.page.getByLabel('Deskripsi Requirement · Wajib').fill('Data pasien valid tersimpan.');
    await po.page.getByLabel(/Given —/).fill('Form pasien lengkap');
    await po.page.getByLabel(/When —/).fill('Petugas menekan Simpan');
    await po.page.getByLabel(/Then —/).fill('Pasien tampil di daftar pasien');
    await po.page.getByRole('button', { name: 'Lanjut ke Task', exact: true }).click();
    await expect(po.page.getByRole('heading', { name: 'Draf Task' })).toBeVisible();

    const rows: Array<[string, string, string]> = [
      [titles.be, 'backend', fixture.devBe.id],
      [titles.fe, 'frontend', fixture.devFe.id],
      [titles.qa, 'qa', fixture.qa.id],
    ];
    for (const [index, [title, area, assigneeId]] of rows.entries()) {
      await po.page.getByRole('button', { name: 'Tambah Subtask', exact: true }).click();
      await po.page.getByLabel('Judul subtask · Wajib').nth(index).fill(title);
      await po.page.getByLabel('Deskripsi subtask · Wajib').nth(index).fill(`${title}.`);
      await po.page.getByLabel('Area delivery · Wajib').nth(index).selectOption(area);
      const mode = po.page.getByLabel('Penugasan · Wajib').nth(index);
      if (await mode.isVisible()) await mode.selectOption('assigned');
      await po.page.getByLabel('Penanggung jawab · Wajib').nth(index).selectOption(assigneeId);
      const requirement = po.page
        .getByRole('checkbox', { name: new RegExp(titles.requirement) })
        .nth(index);
      // The checkbox is visually hidden behind its label; use the keyboard like the planning spec.
      await requirement.focus();
      await requirement.press('Space');
      await expect(requirement).toBeChecked();
    }
    await po.page.getByRole('button', { name: 'Simpan draf Task', exact: true }).click();
    await po.page.getByRole('button', { name: 'Tinjau dan Terapkan' }).click();
    await po.page.getByRole('button', { name: 'Terapkan sekarang' }).click();
    await expect(po.page.getByRole('dialog')).toBeHidden({ timeout: 30_000 });

    // Apply leaves the Product Brief as a draft; QA can start a Test Cycle once the PO approves it.
    // P7 (AC-11): Tugas Saya asks the PO to approve the Brief and opens the PRD stage.
    await po.page.goto('/my-tasks');
    await po.page
      .getByRole('button', { name: /Setujui Brief/ })
      .first()
      .click();
    await expect(po.page).toHaveURL(/tahap=prd/);
    const brief = po.page.getByRole('region', { name: 'Product Brief' });
    await expect(brief.getByTestId('product-brief-status')).not.toHaveText('Disetujui');
    await brief.getByRole('button', { name: 'Setujui Brief' }).click();
    await expect(brief.getByTestId('product-brief-status')).toHaveText('Disetujui', {
      timeout: 30_000,
    });
    await expect(brief.getByRole('button', { name: 'Setujui Brief' })).toHaveCount(0);
    await po.close();
  });

  await test.step('2. Developer BE opens the card, works the subtask, and sends it to QA', () =>
    developerSendsToQa(browser, fixture.devBe.email, titles.be));

  await test.step('3. QA (global dev, Workspace qa) prepares a Test Case while FE is pending', async () => {
    const qa = await signIn(browser, fixture.qa.email);
    await openQueueCard(qa.page, titles.qa);
    await expect(qa.page).toHaveURL(/\/work\/subtasks\//);
    // K4: Apply gives the Requirement a short code.
    await expect(
      qa.page.getByRole('complementary', { name: 'Status uji' }).getByText(/REQ-\d{3}/),
    ).toBeVisible();
    const banner = qa.page.getByRole('region', { name: 'Tahap Siapkan Test Case' });
    await expect(banner).toContainText(
      'Menunggu Developer: 1 dari 2 subtask Developer untuk requirement subtask QA ini siap diuji.',
    );

    await qa.page.getByRole('button', { name: 'Tambah Test Case untuk AC ini' }).click();
    await qa.page.getByLabel('Judul').fill(titles.testCase);
    await qa.page.getByRole('button', { name: /REQ-\d{3} AC-1/ }).click();
    await qa.page.getByLabel('Langkah 1').fill('Isi form pasien dan tekan Simpan');
    await qa.page.getByLabel('Hasil yang diharapkan').fill('Pasien tampil di daftar pasien');
    await qa.page.getByRole('button', { name: 'Simpan Test Case' }).click();
    await expect(qa.page).toHaveURL(/\/work\/subtasks\//, { timeout: 30_000 });
    const activate = qa.page.getByRole('button', { name: `Aktifkan Test Case ${titles.testCase}` });
    if (await activate.isVisible()) await activate.click();
    await expect(qa.page.getByRole('button', { name: 'Gagal' }).first()).toBeDisabled();
    await qa.close();
  });

  await test.step('4. Developer FE reads the QA Test Case and sends to QA with its build', () =>
    developerSendsToQa(browser, fixture.devFe.email, titles.fe, {
      build: 'web-pasien-1',
      environment: 'staging',
      testCase: titles.testCase,
    }));

  await test.step('5. QA runs the Test Case: Gagal, then sends a Bug to Developer BE', async () => {
    const qa = await signIn(browser, fixture.qa.email);
    await openQueueCard(qa.page, titles.qa);
    await expect(qa.page.getByRole('region', { name: 'Tahap Siapkan Test Case' })).toHaveCount(0);
    await qa.page.getByRole('button', { name: 'Gagal' }).first().click();
    await expect(qa.page).toHaveURL(/\/tests\/cases\/.+\/run/);
    // P7 (AC-14): the Developer handoff prefilled build and environment.
    await expect(qa.page.getByLabel('Build')).toHaveValue('web-pasien-1');
    await expect(qa.page.getByLabel('Environment')).toHaveValue('staging');
    await qa.page.getByLabel('Kandidat (commit atau tag)').fill('commit:pasien-1');
    await qa.page.getByRole('button', { name: 'Mulai siklus uji' }).click();
    await expect(qa.page.getByText('Siklus uji dimulai')).toBeVisible();
    await qa.page
      .getByRole('group', { name: 'Hasil' })
      .getByRole('button', { name: 'Gagal' })
      .click();
    await qa.page.getByLabel('Hasil aktual (wajib)').fill('Pasien tidak muncul di daftar.');
    await addEvidence(qa.page, 'https://www.loom.com/share/e2eflowfail1');
    await qa.page.getByRole('button', { name: 'Simpan hasil' }).click();
    await expect(qa.page.getByText('Hasil pengujian tersimpan dan terkunci')).toBeVisible();

    await expect(qa.page.getByRole('heading', { name: 'Tindak lanjut' })).toBeVisible();
    await qa.page.getByLabel('Judul bug').fill(titles.bug);
    await qa.page.getByLabel('Developer penerima').selectOption(fixture.devBe.id);
    await qa.page.getByLabel('Langkah reproduksi').fill('Isi form, tekan Simpan, buka daftar.');
    await qa.page.getByRole('button', { name: 'Kirim bug ke Developer' }).click();
    await expect(qa.page.getByText(/Bug dikirim ke/).first()).toBeVisible();
    await qa.close();
  });

  await test.step('6. Developer fixes, QA retest fails (reopened), fixes again, retest passes', async () => {
    await developerFixesBug(browser, 'commit:pasien-fix-1', 'bell');
    await qaRetests(browser, 'Gagal');
    await developerFixesBug(browser, 'commit:pasien-fix-2');
    await qaRetests(browser, 'Lulus');
  });

  await test.step('7. QA completes the QA subtask and records QA Sign-off', async () => {
    const qa = await signIn(browser, fixture.qa.email);
    await openQueueCard(qa.page, titles.qa);
    // QA approves the Developer work it tested: one per item, then the rest together with
    // closing its own QA subtask in one transaction (P7, AC-15).
    await qa.page.getByRole('button', { name: `Setujui ${titles.be}` }).click();
    await expect(qa.page.getByRole('button', { name: `Setujui ${titles.be}` })).toHaveCount(0);
    await qa.page.getByRole('button', { name: 'Setujui semua & selesaikan eksekusi' }).click();
    await expect(qa.page.getByText('Eksekusi QA selesai. Catat Persetujuan QA.')).toBeVisible();
    const signOff = qa.page.getByRole('button', { name: 'Catat Persetujuan QA' });
    await expect(signOff).toBeEnabled({ timeout: 30_000 });
    await signOff.click();
    const dialog = qa.page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Catat Keputusan' }).click();
    await expect(dialog).toBeHidden({ timeout: 30_000 });

    // The QA signer has no release panel on the Feature page.
    await qa.page.goto(featurePath);
    await expect(qa.page.getByRole('region', { name: 'Keputusan rilis' })).toHaveCount(0);
    await qa.close();
  });

  await test.step('8. PO opens "Catat Keputusan Rilis" from Tugas Saya and approves', async () => {
    const po = await signIn(browser, fixture.po.email);
    await openQueueCard(po.page, titles.feature, 'Catat Keputusan Rilis');
    await expect(po.page).toHaveURL(/\/work\/features\/.+fokus=rilis/);
    const panel = po.page.getByRole('region', { name: 'Keputusan rilis' });
    await panel.getByRole('button', { name: 'Catat Keputusan Rilis' }).click();
    const dialog = po.page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Catat Keputusan' }).click();
    await expect(dialog).toBeHidden({ timeout: 30_000 });
    await expect(panel.getByText('Disetujui').first()).toBeVisible();
    await po.close();
  });
});
