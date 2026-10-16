# QUICK — QA-DESK-AWAIT-BASELINE Meja QA menunggu Baseline Kesiapan sebelum Versi Uji

**Status:** Menunggu persetujuan
**WRA:** 3/16 — lapisan 1 (frontend saja), ketersinggungan 1 (meja QA), validasi 1

Status yang diizinkan: Draft, Menunggu persetujuan, Disetujui, Selesai, Blocked.

## Problem

- Gejala: pada Feature yang Brief Produk-nya belum disetujui (belum ada Feature Readiness Baseline),
  meja QA tetap menampilkan "Tahap 1: Versi Uji" dengan tombol **Tetapkan Versi Uji** aktif. Saat
  disimpan, `POST /qa-test-cycles` ditolak 409 ("A persisted Feature Readiness Baseline is required…"),
  tetapi UI menampilkan pesan umum "data terkait telah berubah… Muat ulang halaman lalu coba lagi" —
  memuat ulang tidak pernah menolong.
- Bukti (smoke test lokal 2026-10-16, Feature 817e3fca, data tidak berubah):
  - `GET /qa-workflow-summary` mengembalikan `blockers: ["feature_baseline_missing"]`,
    `nextAction.code: "await_baseline"`, `blockerReason: "Menunggu PO menyetujui Brief Feature"`.
  - `apps/web/src/components/ui/molecules/QaNextActionCard.tsx` tidak menangani `await_baseline`;
    status `in_progress` tanpa test cycle selalu jatuh ke `set_version`.
  - `apps/web/src/lib/api/apiClient.ts` tidak memetakan pesan 409 baseline, sehingga jatuh ke teks
    CONFLICT generik.
- Backend sudah benar; ini murni presentasi.

## Perubahan

- File/path: `apps/web/src/components/ui/molecules/QaNextActionCard.tsx`,
  `apps/web/src/components/ui/organisms/myTasks/qaDesk/tabs/QaTestCaseExecutionTab.tsx`,
  `apps/web/src/components/ui/organisms/myTasks/QaTestingDesk.tsx` (meneruskan prop),
  `apps/web/src/lib/api/apiClient.ts`, test terkait di `__tests__/`, Quick Card ini.
- Perilaku:
  - Kartu langkah berikutnya punya state baru `await_baseline` (dipakai bila
    `nextAction.code === 'await_baseline'` atau `blockers` memuat `feature_baseline_missing`):
    judul "Menunggu Kesiapan Feature", deskripsi dari `blockerReason`, tombol utama **Buka Feature**
    (melihat Brief), tanpa tombol Versi Uji.
  - Tombol **Tetapkan Versi Uji** di tab Test Case & Eksekusi dinonaktifkan dengan alasan yang terbaca
    selama baseline belum ada.
  - Pesan 409 baseline dipetakan ke: "Versi uji belum dapat ditetapkan karena Feature belum memiliki
    Baseline Kesiapan. Minta Product Owner menyetujui Brief Produk Feature ini terlebih dahulu."
- Bukan scope: perubahan backend/kontrak, alur persetujuan Brief, migrasi data.

## Acceptance Criteria → bukti

| AC                                                                                   | Bukti (E-level) | Perintah / observasi                          |
| ------------------------------------------------------------------------------------ | --------------- | --------------------------------------------- |
| AC-1 `await_baseline` menampilkan "Menunggu Kesiapan Feature" tanpa tombol Versi Uji | E1              | `QaNextActionCard.test.tsx`                   |
| AC-2 Tombol Tetapkan Versi Uji di tab eksekusi nonaktif dengan alasan                | E1              | `QaTestingDesk.test.tsx`                      |
| AC-3 409 baseline menampilkan pesan yang menyebut Brief Produk                       | E1              | test `apiClient`                              |
| AC-4 Feature dengan baseline tetap menampilkan langkah Versi Uji seperti sebelumnya  | E1              | test yang ada tetap lulus                     |
| AC-5 Perilaku nyata di lokal                                                         | E3              | Playwright lokal pada Feature 817e3fca        |
| AC-6 Tidak ada regresi web                                                           | E2              | `npm --prefix apps/web test`, lint, typecheck |

## Approval Window

- Task / baseline: QA-DESK-AWAIT-BASELINE @ `f2cf336`
- Path yang diizinkan: daftar pada bagian Perubahan
- Urutan aksi: edit → test → commit → patch → Owner publish → PR → merge (Tier 1; tidak ada path Tier 2)
- Masa berlaku dan stop condition: sampai PR dibuat; berhenti bila suite web gagal atau perubahan
  ternyata memerlukan backend/kontrak

**Disetujui:** —

## Hasil

- Perintah — exit code — pass/fail/skip: —
- PR dan tier: —
- Gap: —
