## Task

Menyiapkan dan mengaudit siklus E2E QRIS lintas PO, Developer, dan QA pada Production Qlick Hub.

## Outcome

Feature `Checkout QRIS E2E — lintas peran dan retest` telah tersimpan di folder `E2E Production Audit 2026-09-18` dengan Product Brief v1 disetujui, baseline kesiapan #1, tiga Subtask (FE, BE, QA), 10 Requirement Backend, 20 Requirement Frontend, dan 50 Test Case QA.

Siklus QA aktif tersimpan untuk kandidat `deployment:qlickhub-prod-audit-20260918-r1`, build `v2026.09.18-e2e`, environment `production`. TC-BE-02 telah aktif dan siap diuji; 49 Test Case lain masih Draft. Tidak ada hasil eksekusi, transaksi QRIS, Bug, Retest, atau evidence video yang dibuat tanpa temuan nyata.

## Source of truth and impact

- **Applicable SSoT:** [Architecture §4](../1_ARCHITECTURE.md#4-diagram-relasi-entitas--hierarki-data), [Workflow §§2, 5–7](../2_WORKFLOW_AND_ROLES.md), dan [Agent Guidelines §3](../4_AGENT_DEV_GUIDELINES.md#3-kebijakan-basis-data--bukti-pengujian-database--test-evidence).
- **Policy IDs:** DOMAIN-003, DOMAIN-004, FLOW-005, QA-001, QA-002, QA-006, QA-007, QA-008, QA-009, RELEASE-001, RELEASE-002, RELEASE-003, DATA-001, DATA-005, DOC-003.
- **Data/interface impact:** Data workflow Production baru tersimpan melalui UI terautentikasi: Product Brief, 30 Requirement aktif dengan Acceptance Criteria, readiness feedback, baseline, Test Case, dan Test Cycle.
- **Authorization impact:** Mutasi dilakukan pada peran yang tepat: Product Owner untuk Brief/Requirement/baseline, Developer untuk masukan kesiapan dan diskusi, QA untuk Subtask dan Test Cycle.
- **Migration risk:** Tidak ada migrasi.

## Bukti tercatat

| Artefak              | Kondisi terverifikasi                                                                        |
| -------------------- | -------------------------------------------------------------------------------------------- |
| Feature              | 1 Feature utama, tenggat 10 Sep 2026                                                         |
| Subtask              | FE 1, BE 1, QA 1; QA `Sedang Dikerjakan`                                                     |
| Requirement          | BE 10 + FE 20 = 30 aktif; masing-masing memiliki 1 Acceptance Criterion aktif                |
| Product Brief        | v1 disetujui                                                                                 |
| Readiness            | feedback Developer dan QA berstatus siap; Baseline #1 berhasil dibuat                        |
| Test Case            | 50 diimpor; TC-BE-02 aktif dan 49 masih Draft; 0 hasil pengujian                             |
| Test Cycle           | aktif pada kandidat/build/environment di atas                                                |
| Diskusi              | 1 komentar Developer di Feature, 2 komentar di thread Backend, dan 1 handoff QA di thread QA |
| Bug / Retest / Video | 0 / 0 / 0; sengaja tidak dibuat sebagai data sintetis                                        |

Spreadsheet sumber Test Case tersedia di `outputs/e2e-production-audit/qa_test_cases_qris_50.xlsx` dan CSV yang benar-benar berhasil diimpor tersedia di `outputs/e2e-production-audit/qa_test_cases_qris_50.csv`.

## Temuan audit

1. **Belum ada bukti QA yang sah.** TC-BE-02 sudah aktif tetapi belum dieksekusi; 49 Test Case lain masih Draft. Membuat 29 Bug, 10 Retest berulang, atau video tanpa hasil run nyata akan melanggar QA-002, QA-007, QA-008, dan DATA-005.
2. **Target QRIS sandbox nonfinansial kini tersedia untuk QA.** Target membatasi transaksi ke Rp0 dan tidak menghubungi pihak pembayaran. Smoke test selanjutnya tersimpan pada kandidat `sandbox:qris:nonfinancial-v1`; bukti lengkap ada di [laporan sandbox](QA_NONFINANCIAL_QRIS_SANDBOX_2026-09-19.md). Ini bukan bukti QRIS finansial dan tidak membuat Result, Bug, Retest, maupun video otomatis.
3. **Tenggat Subtask tidak tersimpan.** UI pembuatan menerima jadwal, tetapi ketiga Subtask tampil sebagai `Tanpa Tenggat`. Akibatnya keterlambatan FE tidak dapat dibuktikan pada level Subtask, walau Feature induk bertenggat 10 Sep 2026 dan masih belum selesai.
4. **Import XLSX gagal dengan pesan validasi generik.** CSV berhasil setelah pemetaan kolom manual: 50 dibuat, 0 diperbarui, 0 dilewati, 0 gagal. Ini menunjukkan kegagalan parser/pemetaan otomatis pada jalur XLSX.
5. **Aktivasi Test Case sudah dipulihkan di Production.** Akar 500 adalah trigger database Production yang melarang mutasi lifecycle langsung pada baris `TestCaseVersion` immutable. Aktivasi `draft → active` sekarang menyegel revision baru aktif yang menggantikan snapshot Draft, beserta pemetaan Acceptance Criterion-nya. Pada deployment `dpl_Cfbd8c8QuoAovN2TQDKUjPzqsRUA`, QA mengaktifkan TC-BE-02 melalui UI; setelah data dimuat ulang status tetap `Aktif (Siap Diuji)`, tombol Mulai Pengujian tersedia, dan riwayat pengujian tetap 0.
6. **Diskusi Frontend tidak tersimpan pada thread FE.** Saat panel FE dimuat ulang, pesan kesiapan kedua masuk ke thread Backend. Pesan tidak dihapus agar jejak audit Production tetap utuh.
7. **Ada Feature root tak direncanakan.** `E2E Prod — Checkout QRIS dengan Audit Retest` berada di root workspace. Tidak dihapus karena tindakan itu membutuhkan persetujuan eksplisit.

## Changed files

- `apps/web/src/components/ui/organisms/TaskDetailDrawer.tsx` — menghapus loading gate readiness yang membuat drawer detail terus menjadi skeleton ketika request readiness lambat.
- `apps/web/src/components/ui/organisms/__tests__/TaskDetailDrawer.test.tsx` — menyesuaikan cakupan test drawer.
- `apps/api/src/modules/testManagement/testManagementService.ts` — menyegel revision immutable baru saat aktivasi langsung QA agar kompatibel dengan trigger lifecycle Production.
- `apps/api/src/modules/testManagement/__tests__/testCaseIntakeAndEvidenceApiIntegration.test.ts` — menegaskan regresi aktivasi menghasilkan revision aktif baru, termasuk Test Case legacy tanpa version history.
- `docs/reports/E2E_PRODUCTION_QRIS_AUDIT_2026-09-18.md` — laporan bukti dan batasan audit ini.

## Validation

- Production UI authenticated checks — Product Brief v1, 30 Requirement/Acceptance Criteria, readiness feedback, Baseline #1, 50 Test Case, dan Test Cycle aktif teramati melalui UI.
- Production UI authenticated verification — TC-BE-02 diaktifkan oleh QA, kemudian halaman penuh, daftar, dan panel detail dimuat ulang: status `Aktif (Siap Diuji)`, tombol Mulai Pengujian tersedia, 0 riwayat pengujian.
- `npm --prefix apps/api run typecheck` — passed.
- `npm --prefix apps/api run build` — passed.
- Targeted PostgreSQL integration command (`testCaseIntakeAndEvidenceApiIntegration`) — tidak dapat dijalankan lokal karena disposable PostgreSQL test database tidak tersedia; hook gagal dengan `SequelizeConnectionError`, sehingga tidak diklaim sebagai test pass.
- `npm run docs:check` — passed sebelum rilis.
- `git diff --check` — passed sebelum rilis.
- `npm --prefix apps/web run test -- --run src/components/ui/organisms/__tests__/TaskDetailDrawer.test.tsx` — 32 passed; 1 kegagalan pra-ada yang tidak terkait pada `BugExperiencePanel.tsx:508` (`originatingTestCase.availability`).
- `npm run typecheck:web` — passed.
- `npm run build:web` — passed.
- Deploy Production — berhasil; drawer detail masih mengalami latensi pemuatan, tetapi tidak lagi terkunci pada skeleton akibat readiness fetch.

## Risks or follow-up

- **Blocked untuk eksekusi QRIS nyata:** aktivasi Test Case sudah berfungsi. Tetap diperlukan kandidat QRIS non-finansial/bersandbox atau otorisasi eksplisit untuk menjalankan transaksi Production bernilai aman. Baru QA dapat membuat hasil, Bug/Retest, dan evidence yang benar-benar terjadi.
- Perbaiki persistensi tanggal Subtask dan fallback import XLSX sebelum siklus berikutnya.
- Minta persetujuan sebelum menghapus atau mengarsipkan Feature root yang tidak direncanakan.

## TODO update

- Aktivasi Test Case QA Production — `Done`; siklus E2E QRIS tetap `Blocked` untuk eksekusi QA nyata, Bug/Retest, dan evidence video sampai target QRIS aman tersedia.
