# Laporan Pelaksanaan: SUBTASK-ACCORDION-REQUIREMENT-ASSIGNMENT

## Task

SUBTASK-ACCORDION-REQUIREMENT-ASSIGNMENT: Tambahkan pemilih Requirement langsung pada tab Detail di accordion Subtask (SubtaskAccordionItem) agar subtask yang sudah ada dapat ditautkan atau dilepas dari Requirement Feature secara in-place.

## Outcome

Tab "Detail" pada accordion Subtask (`SubtaskAccordionItem`) kini memiliki pemilih Requirement aktif dari Feature induk. Pengguna dengan peran Planner (`owner`, `admin`, `po`) dapat langsung mencentang atau menghapus centang Requirement yang ingin ditautkan ke subtask tersebut, lalu menyimpannya melalui tombol "Simpan Detail". Sistem secara otomatis menyinkronkan penautan via `requirementService.linkRequirement` dan `unlinkRequirement`, serta memperbarui sinyal keterlacakan (_Delivery Trace_ / Jejak Delivery) secara real-time.

## Work assurance

- **Work Readiness Assessment:** 0/16, `Ready`. Perubahan terlokalisasi pada UI accordion subtask dan integrasi pemanggilan service yang sudah ada; tidak ada perubahan skema database, migrasi, otorisasi backend, atau shared contract.
- **User plan approval:** Disetujui eksplisit oleh user pada pesan checkpoint 2026-10-01 ("ok kerjakan").
- **Step approval log:**
  1. Checkpoint 1: Persetujuan claim backlog dan modifikasi `SubtaskAccordionItem.tsx`, `SubtaskList.tsx`, dan `TaskDetailDrawer.tsx` disetujui user ("ok kerjakan").
- **Agent capability and access:** Dapat membaca SSoT, kode komponen web, menjalankan typecheck TypeScript, Vitest unit test, Vite production build, dan `npm run docs:check`.
- **AC-to-evidence matrix:**

| Acceptance Criterion                                                                 | Required / achieved evidence level (E0–E4) | Primary evidence and environment                                                                             | Verification status |
| ------------------------------------------------------------------------------------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ------------------- |
| AC-1: Section "Requirement yang Dicakup" muncul di tab Detail `SubtaskAccordionItem` | E1 / E1                                    | Unit test `SubtaskAccordionItem.test.tsx` memverifikasi rendering daftar checkbox Requirement aktif          | Accepted            |
| AC-2: Requirement yang sudah tertaut otomatis berstatus checked                      | E1 / E1                                    | Unit test memverifikasi `REQ-101` berstatus tercentang saat dimuat                                           | Accepted            |
| AC-3: Planner dapat mengubah centang Requirement                                     | E1 / E1                                    | Unit test mensimulasikan interaksi klik centang pada `REQ-102`                                               | Accepted            |
| AC-4: Klik "Simpan Detail" mengeksekusi `linkRequirement` dan `unlinkRequirement`    | E1 / E1                                    | Unit test menguji pemanggilan `linkRequirement` dan `unlinkRequirement` dengan ID subtask & requirement      | Accepted            |
| AC-5: Kotak informatif ditampilkan jika Feature belum memiliki Requirement aktif     | E1 / E1                                    | Unit test memverifikasi pesan "Belum ada Requirement aktif yang terhubung ke Feature ini" saat daftar kosong | Accepted            |
| AC-6: Non-planner (Dev/QA) melihat status dalam mode disabled (read-only)            | E1 / E1                                    | Atribut `disabled={!canMutate \|\| !isPlanner}` diterapkan pada checkbox                                     | Accepted            |
| AC-7: Tes unit lulus, typecheck bersih, build produksi sukses                        | E1 / E1                                    | Vitest 4/4 passing, `tsc --noEmit` 0 error, Vite build 3.13s exit 0                                          | Accepted            |

- **Evidence outcomes:**
  - `npm --prefix apps/web test src/components/ui/organisms/__tests__/SubtaskAccordionItem.test.tsx`: 4 passed, 0 failed.
  - `npm --prefix apps/web test src/components/ui/organisms/__tests__/SubtaskList.test.tsx src/components/ui/organisms/__tests__/CreateSubtaskModal.test.tsx src/components/ui/organisms/__tests__/TaskDetailDrawer.test.tsx`: 44 passed, 0 failed.
  - `npm --prefix apps/web run typecheck`: exit 0, 0 error.
  - `npm --prefix apps/web run build`: exit 0, built in 3.13s.
  - `npm run docs:check`: exit 0, 8 passed.
- **Change Impact Map:** Module level (`apps/web/src/components/ui/organisms/`). Memperkaya antarmuka `SubtaskAccordionItem` dengan menghubungkannya ke `requirementService`. Tidak ada dampak backend, skema, otorisasi, atau model rilis.
- **Decision Snapshot:** Mengintegrasikan pemilih Requirement langsung di tab "Detail" accordion subtask yang sudah ada daripada membuat modal terpisah, sehingga konsisten dengan alur pengeditan metadata subtask (prioritas, jadwal, pelaksana).
- **Agent handoff and independent verification:** Antigravity mengeksekusi dan memvalidasi seluruh test suite unit, typecheck, dan build produksi.
- **Quality review:**
  - Reuse/DRY: Memakai kembali atom `Checkbox`, `Skeleton`, `Alert`, serta metode API `requirementService.listTaskRequirementLinks`, `linkRequirement`, dan `unlinkRequirement`.
  - Duplicate/overlapping: Tidak ada redundansi fungsi penautan.
  - Obsolete/unused code: None found.
- **Cross-layer quality gates:** Menggunakan token Stitch (#B1E743, dark mode accessible, border-stone-200/800, padding p-2.5).

## Source of truth and impact

- **Applicable SSoT:** `docs/1_ARCHITECTURE.md`, `docs/2_WORKFLOW_AND_ROLES.md`, `docs/3_UI_ATOMIC_DESIGN_SYSTEM.md`, `docs/features/REQUIREMENT_GUIDED_SUBTASK_PLANNING.md`.
- **Policy IDs:** `AUTH-002`, `DOMAIN-002`, `FLOW-002`, `UI-001`, `UI-002`, `CONTRACT-001`, `TEST-001`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** None (antarmuka backend dan tabel `task_requirements` tidak berubah).
- **Authorization impact:** Mengikuti aturan `AUTH-002`, mutasi penautan/pelepasan hanya diizinkan untuk peran Planner (`owner`, `admin`, `po`).
- **Migration risk:** None.

## Changed files

- `apps/web/src/components/ui/organisms/SubtaskAccordionItem.tsx` — Menambahkan pemuatan tautan requirement subtask, checklist requirement aktif di tab Detail, dan sinkronisasi penautan saat simpan.
- `apps/web/src/components/ui/organisms/SubtaskList.tsx` — Meneruskan prop `eligibleRequirements` ke setiap item accordion.
- `apps/web/src/components/ui/organisms/TaskDetailDrawer.tsx` — Meneruskan `featureEligibleRequirements` ke `SubtaskList` dan memicu `loadDeliveryTrace()` saat subtask diperbarui.
- `apps/web/src/components/ui/organisms/__tests__/SubtaskAccordionItem.test.tsx` — Menambahkan 3 skenario uji baru untuk penautan, pelepasan, dan kondisi tanpa requirement.
- `TODO.md` — Mencatat claim dan penyelesaian tugas.

## Validation

- `npm --prefix apps/web test src/components/ui/organisms/__tests__/SubtaskAccordionItem.test.tsx` — 4/4 test lulus (100%).
- `npm --prefix apps/web test src/components/ui/organisms/__tests__/SubtaskList.test.tsx src/components/ui/organisms/__tests__/CreateSubtaskModal.test.tsx src/components/ui/organisms/__tests__/TaskDetailDrawer.test.tsx` — 44/44 test lulus (100%).
- `npm --prefix apps/web run typecheck` — 0 error.
- `npm --prefix apps/web run build` — Build Vite selesai dalam 3.13 detik (exit code 0).
- `npm run docs:check` — 8/8 test dokumentasi lolos.

## Risks or follow-up

None. Fitur bekerja langsung di antarmuka web dan siap dipakai pengguna di browser.

## Human decision summary

Fitur ini menyelesaikan friction di mana pengguna sebelumnya kesulitan menghubungkan Subtask yang dibuat lebih dulu dengan Requirement yang baru dibuat. Sekarang penautan dapat dilakukan langsung di tab Detail accordion Subtask.

## TODO update

- `SUBTASK-ACCORDION-REQUIREMENT-ASSIGNMENT` → `Done`
