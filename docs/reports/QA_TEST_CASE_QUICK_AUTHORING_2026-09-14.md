# Agent Report — QA Test Case Quick Authoring

## Task

`QA-TEST-CASE-QUICK-AUTHORING` — otomatisasi nomor Test Case per Workspace dan tambahkan skenario
Edge Case.

## Outcome

QA tidak lagi mengetik nomor pada form native. Test Case baru tanpa referensi mendapat nomor
`TC-0001`, `TC-0002`, dan seterusnya secara atomik per Workspace dari PostgreSQL. Penyimpanan paralel
tidak menghasilkan nomor ganda, nomor tidak digunakan ulang, dan referensi eksplisit tetap tersedia
untuk API/integrasi serta spreadsheet lama. Jenis skenario baru `edge` tersedia sebagai **Edge Case
(Kondisi Batas)** pada form dan didukung penuh oleh shared contract, API, database, template,
preview, serta commit impor.

Setelah rekonsiliasi dengan peningkatan QA terbaru di `origin/main`, aksi **Ajukan untuk Review**
tetap satu klik bagi pengguna tetapi menjalankan dua mutasi resmi secara berurutan: membuat draf,
kemudian mengajukannya ke `in_review`. Ini mencegah request create melompati lifecycle backend.

## Source of truth and impact

- **Applicable SSoT:**
  [`docs/1_ARCHITECTURE.md`](../1_ARCHITECTURE.md),
  [`docs/2_WORKFLOW_AND_ROLES.md`](../2_WORKFLOW_AND_ROLES.md), dan
  [`docs/3_UI_ATOMIC_DESIGN_SYSTEM.md`](../3_UI_ATOMIC_DESIGN_SYSTEM.md).
- **Feature Card:**
  [`docs/features/QA_TEST_CASE_QUICK_AUTHORING.md`](../features/QA_TEST_CASE_QUICK_AUTHORING.md).
- **Policy IDs:** `AUTH-001`, `DATA-001`, `DATA-002`, `CONTRACT-001`, `QA-001`, `UI-001`,
  `UI-002`, `TEST-001`, `DOC-003`.
- **Data/interface impact:** tabel additive `test_case_reference_counters`, trigger PostgreSQL
  `BEFORE INSERT`, perluasan `scenario_kind`, serta shared contract `positive | negative | edge`.
  Endpoint tetap sama dan `externalReference` tetap opsional pada create.
- **Authorization impact:** tidak ada perubahan. QA tetap hanya membuat/mengubah draf sesuai
  lifecycle; penerbitan tetap milik Planner.
- **Migration risk:** migration 70 menginisialisasi counter dari referensi numerik `TC-<angka>`
  terbesar yang sudah ada tanpa mengubah record Test Case lama. Rollback ditolak bila record `edge`
  sudah ada agar data tidak dirusak. Production membutuhkan backup, migration 70, lalu deployment
  API/web yang kompatibel dalam urutan tersebut.

## Changed files

- `apps/api/src/db/migrations/20260914000070-add-test-case-auto-reference-and-edge-scenario.cjs`
  — counter Workspace, trigger atomik, seed nomor existing, check constraint `edge`, dan rollback
  guard.
- `apps/api/src/db/models/testCase.ts` — tipe model menerima `edge`.
- `apps/api/src/modules/testManagement/testCaseImportService.ts` — nomor impor opsional, contoh Edge
  Case, validasi `edge`, dan audit menyimpan nomor hasil alokasi.
- `packages/contracts/src/testManagement.ts` — shared scenario contract menerima `edge`.
- `apps/web/src/components/ui/organisms/myTasks/TestCaseFormModal.tsx` — nomor otomatis hanya-baca dan
  opsi Edge Case.
- `apps/web/src/components/ui/organisms/myTasks/TestCaseImportWizardModal.tsx` — label nomor opsional
  dan daftar skenario baru.
- Tes contracts, frontend, dan HTTP/PostgreSQL terkait — regresi kontrak, interaksi form, alokasi
  paralel per Workspace, persistensi `edge`, dan impor kosong nomor.
- `docs/1_ARCHITECTURE.md`, `docs/2_WORKFLOW_AND_ROLES.md`, Feature Card, TODO, dan laporan ini —
  source of truth, traceability, serta evidence.

## Validation

- `npm --prefix packages/contracts test` — lulus 70/70; 0 gagal, 0 skipped.
- `npm --prefix apps/web test -- TestCaseFormModal.test.tsx QaTestingDesk.test.tsx` — lulus 18/18,
  termasuk urutan create-draft lalu submit-review.
- Focused HTTP/PostgreSQL Test Case intake integration — lulus 32/32; membuktikan alokasi paralel,
  scope Workspace, `edge`, serta impor nomor kosong pada PostgreSQL test.
- `npm --prefix apps/api run db:verify:clean-migrations` — lulus seluruh 54 migrasi pada disposable
  PostgreSQL database `qa_management_phase0_verify_4547`.
- `npm --prefix apps/web test` — lulus 465/465 pada 88 file; 0 gagal, 0 skipped. Ada warning React
  `act(...)` lama pada test yang tidak terkait.
- `npm --prefix apps/api run test:integration` — lulus 425/425 pada 97 suite; 0 gagal, 0 skipped.
  SMTP/FCM test seams tidak dikonfigurasi dan dilaporkan sebagai skip pengiriman, bukan skipped test.
- `npm run typecheck` — lulus contracts, API, dan web.
- `npm run lint` — lulus dengan 0 error dan 21 warning lama pada file yang tidak diubah untuk task
  ini.
- `npm run docs:check` — lulus 5/5 test governance dan pemeriksaan dokumentasi.
- Targeted `npx prettier --check ...` dan `git diff --check` — lulus.
- `npm run build` — lulus contracts/API/web; Vite memproses 1.710 modul.
- Visual aktual komponen pada Chrome lokal — lulus tema terang/gelap di desktop 1624×969 dan mobile
  viewport 390×844; nomor otomatis, helper text, responsive stacking, dan kontras terbaca tanpa
  overflow horizontal. Preview memakai komponen aplikasi aktual dan tidak mengirim data.

## Risks or follow-up

- Migration dan build ini belum diterapkan ke Production. Release harus menjalankan backup serta
  migration 70 sebelum mengalihkan traffic ke API/web baru.
- Test Case lama dengan `external_reference` kosong tetap dipertahankan apa adanya; alokasi otomatis
  berlaku untuk insert baru. Jika backfill histori dibutuhkan, lakukan sebagai keputusan data
  terpisah dengan audit dampak.

## TODO update

- `QA-TEST-CASE-QUICK-AUTHORING` → `Done`.
