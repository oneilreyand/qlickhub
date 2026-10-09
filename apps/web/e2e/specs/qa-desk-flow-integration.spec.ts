import { expect, test, type Page } from '@playwright/test';
import { BugModel } from '../../../api/src/db/models/index.js';
import { flowContext, login, seedQaDeskFlow, users } from '../support/qaDeskFlowSeed';

test.beforeAll(async () => {
  await seedQaDeskFlow();
});

// Do not close the shared Sequelize connection here: Playwright runs every spec file in the same
// worker (workers: 1), so closing it would break the specs that run after this one
// (qa-role-isolation.spec.ts closes it at the end of the run).

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
  await expect(devSelect.locator(`option[value="${flowContext.devUserId}"]`)).toBeAttached({
    timeout: 10000,
  });
  await devSelect.selectOption(flowContext.devUserId);

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
    where: { workspaceId: flowContext.workspaceId, featureTaskId: flowContext.bugFeatureTaskId },
    order: [['createdAt', 'DESC']],
  });
  expect(createdBug).toBeTruthy();

  // Developer transisikan Bug ke in_progress dan catat resolusi dengan candidateCode
  await devPage.evaluate(
    async ({ wsId, bId, candidate }) => {
      const started = await fetch(`http://localhost:4100/v1/workspaces/${wsId}/bugs/${bId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'in_progress' }),
      });
      if (!started.ok) throw new Error(`Bug in_progress failed: ${started.status}`);
      const resolved = await fetch(
        `http://localhost:4100/v1/workspaces/${wsId}/bugs/${bId}/resolution-events`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            candidateFingerprint: candidate,
            resolutionNotes: 'Menambahkan retry 15 detik pada gateway pembayaran.',
          }),
        },
      );
      if (!resolved.ok) throw new Error(`Bug resolution failed: ${resolved.status}`);
    },
    { wsId: flowContext.workspaceId, bId: createdBug!.id, candidate: candidateCode },
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
