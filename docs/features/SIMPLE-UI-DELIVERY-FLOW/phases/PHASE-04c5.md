# SIMPLE-UI-DELIVERY-FLOW — Tahap 4: Build Phase 04c5 (P4c-5) — Hapus komponen desk lama yang tidak terjangkau

**Status:** Kandidat teruji — pemeriksaan di browser menunggu (FE saja, tanpa migrasi)
**Breakdown:** [../breakdown.md](../breakdown.md)
**AC phase ini:** tidak ada AC baru (pembersihan kode yang sudah tidak dapat dijangkau; perilaku aplikasi tidak berubah)
**Applicable Policy IDs:** AI-009, AI-013, UI-001
**Prinsip (Owner):** desain lama dihapus setelah semua peran memakai halaman baru (P3e, P4c-4).

## 1. Temuan inventaris

| Temuan                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Setelah `MyTaskDetailWorkspaceDrawer` dihapus (P4c-4), lima komponen di `organisms/myTasks/` tidak lagi dirender di mana pun (hanya diekspor `features/myTasks/index.ts` dan diuji sendiri): `DevWorkingDesk` (1.021 baris) dengan `devDeliverables.ts`, `PoTeamICardGrid` (716), `MyTaskFeatureContext` (321), dan `TestCaseFormModal` (pemakainya dulu dialog desk QA). |
| Tidak ada referensi dari e2e, skrip, atau konfigurasi; satu-satunya jejak di luar `apps/web/src` adalah artefak build lama `.vercel/output`.                                                                                                                                                                                                                              |
| Molekul yang dipakai komponen itu masih dipakai tempat lain (`TaskCommentBox`, `SubtaskCommentBox`, `DeliveryTraceSignal`, `ReleaseReadinessSignal`, `TaskScheduleHealthBadge`, `CreateSubtaskModal`, `FormattedText`, `ProgressBar`), sehingga tidak ikut dihapus.                                                                                                       |
| `devDeliverables.ts` hanya dipakai `DevWorkingDesk`; test-nya ikut dihapus bersamanya.                                                                                                                                                                                                                                                                                    |

## 2. Approval Window

| Item                             | Isi                                                                                                                                                                                                                                                                                                                          |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task ID                          | SIMPLE-UI-P4c-5                                                                                                                                                                                                                                                                                                              |
| Branch / baseline                | `feat/simple-ui-p4c5-remove-orphan-desks`, bertumpuk di `feat/simple-ui-p4c4-retire-qa-desk`                                                                                                                                                                                                                                 |
| Rencana teknis                   | Hapus `DevWorkingDesk`, `devDeliverables.ts`, `PoTeamICardGrid`, `MyTaskFeatureContext`, `TestCaseFormModal` beserta test-nya; rapikan `features/myTasks/index.ts`. Setelah itu cari komponen lain yang menjadi yatim lewat typecheck/eslint dan pencarian impor; hanya yang benar-benar tidak punya referensi yang dihapus. |
| File/path yang diizinkan         | `apps/web/src/components/ui/organisms/myTasks/` (file di atas dan test-nya), `apps/web/src/features/myTasks/index.ts`, `breakdown.md`, dokumen ini. Tanpa perubahan API, kontrak, atau migrasi.                                                                                                                              |
| Di luar scope                    | Halaman Tugas Saya PO; `BugExperiencePanel` dan `TaskDetailDrawer`; artefak `.vercel/output`.                                                                                                                                                                                                                                |
| Pemeriksaan yang akan dijalankan | Pencarian impor sebelum dan sesudah (nol referensi ke file yang dihapus), typecheck, eslint, vitest 8 shard, build, `theme:check`, `docs:check`, dan pemeriksaan cepat di browser: Tugas Saya dan halaman kerja QA/Developer tetap terbuka.                                                                                  |
| Risiko & recovery                | Risiko rendah: kode tidak terjangkau. Bila ada referensi dinamis yang terlewat, build atau test akan gagal. Rollback: revert commit; kode tetap ada di riwayat git.                                                                                                                                                          |
| Disetujui                        | Owner (chat: "Setuju, jalankan")                                                                                                                                                                                                                                                                                             |

## 3. Hasil

- Dihapus: `DevWorkingDesk`, `devDeliverables.ts`, `PoTeamICardGrid`, `MyTaskFeatureContext`, `TestCaseFormModal`, dan test-nya; ekspor di `features/myTasks/index.ts` dirapikan.
- Yatim turunan yang ikut dihapus (tidak punya referensi selain test-nya sendiri setelah desk QA dilepas di P4c-4): `QaWorkflowSummaryWidget`, `QaExecutionFilterToolbar`, `QaNextActionCard`.
- `ImageLightboxModal` (yatim sebelum fase ini; penggantinya `MediaLightboxModal`) dihapus kemudian atas persetujuan Owner.
- Pemeriksaan: pencarian impor nol referensi; typecheck; eslint 0 error; vitest 8 shard; build; `theme:check`; `docs:check`.

## 4. Perbaikan susulan: panel Persetujuan QA tidak ikut berubah

Laporan Owner: setelah menambah atau menghapus Test Case, gate kesiapan di bagian Persetujuan QA tidak berubah. Penyebab: `ReleaseAssurancePanel` memuat catatan dan snapshot kesiapan sekali saat halaman dibuka, dan `QaSubtaskWorkSection` memuat ringkasan alur QA sekali saja; muat ulang daftar Test Case tidak menyentuh keduanya. Perbaikan: prop `refreshToken` pada panel (diisi `reloadKey`) dan ringkasan QA dimuat ulang pada `reloadKey` yang sama; muat ulang berjalan diam-diam tanpa mengosongkan panel. Test baru: panel memuat ulang saat `refreshToken` berubah tanpa tampilan memuat.
