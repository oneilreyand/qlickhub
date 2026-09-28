# Rencana Penyelarasan UI/UX Task Hub dan Tugas Saya (Work Queue)

**Status:** In Progress  
**Tanggal:** 2026-09-28  
**Branch:** `analyze_task_count_mismatch`  
**Penulis:** Antigravity  
**Kebijakan Terkait (Policy IDs):** `UI-001`, `UI-002`, `DOMAIN-002`, `FLOW-001`, `FLOW-002`, `FLOW-004`, `AUTH-002`, `CONTRACT-001`, `TEST-001`, `DOC-003`, `DOC-004`, `AI-002`, `AI-003`, `AI-005`, `AI-007`

---

## 1. Fakta Terkonfirmasi (_Confirmed Facts_)

1. **Perbedaan Konsep Task Hub vs Tugas Saya:** Sesuai SSoT Arsitektur (`docs/1_ARCHITECTURE.md`), Task Hub menampilkan **Root Task / Feature** tingkat Workspace (`rootOnly: true`), sedangkan Tugas Saya (`MyTasksPage`) menampilkan **Antrean Kerja Berbasis Peran** (_Role-Aware Work Queue_) yang menyaring item actionable (`todo`, `in_progress`, `changes_requested`, `open bugs`), serta tab Feature yang dibuat pengguna (`myTasksOnly: true, rootOnly: true`).
2. **Ketidaksesuaian Istilah (Ambiguous Naming):** Di `TaskHubControlsBar.tsx`, counter menggunakan label `suffix=" task"` (misal `4 task`), yang membuat pengguna berasumsi 4 objek di Task Hub adalah jenis objek yang sama persis dengan yang ada di Tugas Saya. Padahal 4 objek tersebut adalah **Feature / Story**.
3. **Ketimpangan Badge Counter di Tab Utama Tugas Saya:** Di `MyTasksDashboard.tsx`, tab _Dibuat oleh Saya_ memiliki badge `count: createdTasksState.total` (misal `2`), sedangkan tab utama _Perlu Perhatian_ tidak menampilkan badge angka total tindakan. Hal ini membuat perbandingan angka antar-tab dan antar-halaman terlihat tidak sinkron.
4. **Ketiadaan Contextual Helper:** Tidak ada penjelasan ringkas di antarmuka yang mengedukasi pengguna mengenai perbedaan fokus Task Hub (proyek/Feature) vs Tugas Saya (personal/tindakan).
5. **Ketiadaan Filter Keterlibatan di Task Hub:** Di Task Hub, pengguna harus melihat semua Feature tanpa opsi cepat untuk memfilter Feature yang spesifik melibatkan dirinya sendiri.

---

## 2. Work Readiness Assessment (WRA)

| Dimensi                      | Nilai (0–2) | Keterangan                                                                 |
| :--------------------------- | :---------: | :------------------------------------------------------------------------- |
| **Kejelasan Requirement**    |     `0`     | Sangat jelas, berasal langsung dari analisis mismatch hitungan pengguna.   |
| **Lapisan Terdampak**        |     `0`     | Hanya lapisan UI Presentation Frontend (`apps/web/src/components/ui/*`).   |
| **Data & Migrasi**           |     `0`     | Tidak ada perubahan skema database PostgreSQL dan tidak ada migrasi.       |
| **Authorization (RBAC)**     |     `0`     | Otorisasi backend `AUTH-002` tetap ditegakkan; tidak ada bypass otorisasi. |
| **Shared Contract**          |     `0`     | Kontrak `@qlick/contracts` tetap utuh.                                     |
| **Ketersinggungan Modul**    |     `1`     | Berdampak pada tampilan Task Hub dan Tugas Saya di Web.                    |
| **Validasi**                 |     `1`     | Unit test frontend, typecheck `tsc --noEmit`, lint, dan build web.         |
| **Ketergantungan Eksternal** |     `0`     | Tidak ada dependensi pihak ketiga.                                         |
| **TOTAL SKOR**               | **2 / 16**  | **Status: `Ready`**                                                        |

---

## 3. Scope dan Acceptance Criteria (AC)

1. **AC-1 (Badge Counter Perlu Perhatian):** Tab _Perlu Perhatian_ di `MyTasksDashboard.tsx` menampilkan badge angka total tindakan aktif (`totalAttentionCount`), konsisten dengan tab _Dibuat oleh Saya_.
2. **AC-2 (Contextual Helper Banner):** Terdapat banner/helper note yang informatif dan ramah pengguna di `MyTasksDashboard.tsx` yang menerangkan fokus halaman dan menyediakan tautan langsung ke Task Hub.
3. **AC-3 (Penyelarasan Naming di Task Hub):**
   - Di `TaskHubControlsBar.tsx`, counter diperbarui menjadi `suffix=" Feature"`.
   - Di `TaskCollection.tsx`, header kolom diperbarui menjadi `ID / Judul Feature`.
   - Di `TaskHubHeader.tsx`, subtitle diperjelas menerangkan cakupan Feature Workspace.
4. **AC-4 (Quick Filter Melibatkan Saya di Task Hub):** Di `TaskHubControlsBar.tsx` dan `TaskHubDashboardTemplate.tsx`, terdapat filter cepat antara `Semua Feature` dan `Melibatkan Saya` (_My Features_).
5. **AC-5 (Safety & No Regressions):** Alur kerja PO dan drawer detail tetap 100% utuh tanpa perubahan; semua tes unit frontend lulus tanpa kegagalan.

---

## 4. Change Impact Map

- `apps/web/src/components/ui/organisms/MyTasksDashboard.tsx` — Tambahkan badge count pada tab "Perlu Perhatian" dan info banner edukatif.
- `apps/web/src/components/ui/organisms/taskHub/TaskHubControlsBar.tsx` — Ganti label counter menjadi "Feature", tambahkan segmented filter `Semua Feature` vs `Melibatkan Saya`.
- `apps/web/src/components/ui/templates/TaskHubDashboardTemplate.tsx` — Tangani state filter keterlibatan (`involvementFilter`), saring `visibleTasks`, dan kirimkan prop ke controls bar.
- `apps/web/src/components/ui/organisms/taskHub/TaskHubHeader.tsx` — Perjelas subtitle konteks Feature.
- `apps/web/src/components/ui/organisms/TaskCollection.tsx` — Perbarui label kolom `ID / Judul Feature`.
- `apps/web/src/components/ui/organisms/__tests__/MyTasksDashboard.test.tsx` — Validasi badge count dan banner edukatif.
- `apps/web/src/components/ui/organisms/taskHub/__tests__/TaskHubControlsBar.test.tsx` — Tes unit baru untuk filter kontrol keterlibatan.
- `TODO.md` — Pencatatan tugas dan status.
