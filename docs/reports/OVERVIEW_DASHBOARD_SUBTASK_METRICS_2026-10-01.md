## Task

OVERVIEW-DASHBOARD-SUBTASK-METRICS — selaraskan penghitungan Total Tugas di Ikhtisar (Overview Dashboard) dan Task Hub agar menghitung Tugas Utama (root task) secara kanonis dan menampilkan badge/keterangan Subtask yang terhubung secara transparan.

## Outcome

Penghitungan metrik di halaman Ikhtisar (`OverviewStoreDashboard.tsx`) sebelumnya memanggil `fetchTasks` tanpa parameter `rootOnly: true`. Akibatnya, API backend mengembalikan seluruh baris tabel `tasks` secara datar (flat), mencampuradukkan 1 Tugas Utama dan seluruh Subtask-nya (atau 5 subtask yang ditugaskan kepada developer) sehingga kartu "Total Tugas" menampilkan angka 5.

Perbaikan ini:

1. Menyelaraskan query `fetchTasks` di `OverviewStoreDashboard.tsx` dengan menyertakan `rootOnly: true`, `includeSubtasks: true`, dan `includeSubtaskSummary: true`.
2. Menghitung `rootWorkspaceTasks` (tugas tanpa `parentTaskId`) sebagai basis metrik Tugas Utama, serta mengagregasi total dan progres Subtask terhubung (`subtasksCountSummary`).
3. Pada kartu KPI "Total Tugas", menyajikan angka Tugas Utama yang akurat (misal: 1), badge eksplisit `{total} Subtask`, dan subtitle deskriptif (`{totalTasks} tugas utama ({totalSubtasks} subtask terhubung)`).
4. Pada kartu KPI "Tingkat Selesai", menyertakan catatan penyelesaian subtask (`{completed}/{total} subtask selesai`).
5. Pada komponen `TaskHubMetrics.tsx` dan `TaskHubDashboardTemplate.tsx`, menambahkan prop dan tampilan badge `{total} Subtask` yang selaras.

## Source of truth and impact

- **Applicable SSoT:** [Architecture](../1_ARCHITECTURE.md) §4 (diagram hierarki Feature sebagai root task dan 1 tingkat subtask), [UI Design System](../3_UI_ATOMIC_DESIGN_SYSTEM.md), dan [TASK_SUBTASK_COLLABORATION_PLAN](../plans/TASK_SUBTASK_COLLABORATION_PLAN.md).
- **Policy IDs:** `DOMAIN-002`, `FLOW-004`, `UI-001`, `UI-002`, `DATA-001`, `TEST-001`, `DOC-001`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** Tidak ada perubahan schema, migrasi database, atau kontrak API backend.
- **Authorization impact:** Tidak ada. Otorisasi dan batas privasi membership tetap ditegakkan oleh backend.
- **Migration risk:** Tidak ada.

## Changed files

- `apps/web/src/components/ui/organisms/OverviewStoreDashboard.tsx` — menyelaraskan query `fetchTasks` ke root task + subtask summary, menghitung metrik root tasks dan subtask terhubung, serta menampilkan badge dan subtitle subtask.
- `apps/web/src/components/ui/organisms/taskHub/TaskHubMetrics.tsx` — menambahkan prop `totalSubtasksCount` dan badge subtask di widget Total Task.
- `apps/web/src/components/ui/templates/TaskHubDashboardTemplate.tsx` — mengagregasi total subtask dari `hubTasks` dan meneruskannya ke `TaskHubMetrics`.
- `apps/web/src/components/ui/organisms/__tests__/OverviewStoreDashboard.test.tsx` — menambahkan pengujian unit untuk 1 root task dan 5 subtask badge.
- `apps/web/src/components/ui/organisms/__tests__/TaskHubMetrics.test.tsx` — menambahkan pengujian unit untuk badge total subtask.
- `TODO.md` — mencatat penyelesaian item `OVERVIEW-DASHBOARD-SUBTASK-METRICS`.

## Validation

- `npm test --workspace=@qlick/web -- src/components/ui/organisms/__tests__/OverviewStoreDashboard.test.tsx src/components/ui/organisms/__tests__/TaskHubMetrics.test.tsx` — 9/9 lulus (6/6 di OverviewStoreDashboard, 3/3 di TaskHubMetrics).
- `npm test --workspace=@qlick/web -- src/components/ui/organisms/__tests__/TaskCollection.test.tsx src/components/ui/organisms/__tests__/TaskReportDashboard.test.tsx src/components/ui/organisms/__tests__/MyTasksDashboard.test.tsx` — 19/19 lulus.
- `npm run typecheck` — 0 error di `@qlick/contracts`, `@qlick/api`, dan `@qlick/web`.
- `npm run build` — lulus untuk seluruh monorepo; Vite membangun 1.722 modul.
- `npm run docs:check` — 8/8 tes dokumentasi lulus dan governance check lulus.
- `git diff --check` — lulus tanpa whitespace error.

## Risks or follow-up

- Perubahan bersifat frontend UI data loading & presentation alignment; tidak memerlukan migrasi database atau deployment backend tambahan.
