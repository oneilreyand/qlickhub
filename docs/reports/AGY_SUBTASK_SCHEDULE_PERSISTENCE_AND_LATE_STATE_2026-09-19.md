## Task

AGY-SUBTASK-SCHEDULE-PERSISTENCE-AND-LATE-STATE — persistensi jadwal Subtask dan state
keterlambatan yang dimiliki backend.

## Outcome

`startDate` dan `dueDate` Subtask terbukti disimpan dan dibaca ulang. Respons Task kini selalu
menambahkan `scheduleHealth` yang dievaluasi backend. Dashboard, timeline, dan desk kerja membaca
nilai tersebut sehingga browser tidak lagi menentukan Subtask terlambat dari jam lokalnya.

## Source of truth and impact

- **Applicable SSoT:** [Architecture](../1_ARCHITECTURE.md), [Workflow §4](../2_WORKFLOW_AND_ROLES.md), [UI Design System](../3_UI_ATOMIC_DESIGN_SYSTEM.md), [Agent Guidelines](../4_AGENT_DEV_GUIDELINES.md), dan [Feature Card](../features/SUBTASK_SCHEDULE_PERSISTENCE_AND_LATE_STATE.md).
- **Policy IDs:** `FLOW-004`, `AUTH-002`, `DATA-001`, `CONTRACT-001`, `TEST-001`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** `Task` menambahkan read model `scheduleHealth`; tidak ada tabel, migrasi, atau perubahan input endpoint.
- **Authorization impact:** Tidak ada. Planner tetap satu-satunya pihak yang mengubah tanggal; pembacaan mengikuti otorisasi Task yang ada.
- **Migration risk:** Tidak ada.

## Changed files

- `packages/contracts/src/task.ts` — kontrak `TaskScheduleHealth`.
- `apps/api/src/modules/tasks/internal/taskScheduleHealth.ts` — evaluator jadwal backend.
- `apps/api/src/modules/tasks/internal/taskQuery.ts` — menyertakan status jadwal pada respons Task.
- `apps/web/src/lib/utils/scheduleHealth.ts` — membaca state backend alih-alih menghitung ulang keterlambatan.
- `apps/web/src/components/ui/organisms/TaskReportDashboard.tsx` — antrean perhatian memakai state backend.
- `apps/web/src/components/ui/organisms/TaskTimelineView.tsx` dan `apps/web/src/components/ui/organisms/myTasks/DevWorkingDesk.tsx` — indikator keterlambatan memakai state backend.
- `apps/api/src/modules/tasks/__tests__/taskApiIntegration.test.ts` dan test UI jadwal terkait — regression coverage.

## Validation

- `npm --prefix packages/contracts run build` — passed, exit 0.
- `npm --prefix apps/api run build` — passed, exit 0.
- `NODE_ENV=test node --test apps/api/dist/modules/tasks/__tests__/taskApiIntegration.test.js` — passed, 30/30 pada PostgreSQL test disposable. Pesan FCM tanpa token aktif muncul tanpa kegagalan test.
- `npm --prefix apps/web run test -- src/components/ui/organisms/__tests__/TaskReportDashboard.test.tsx src/components/ui/molecules/__tests__/SubtaskRoleTimeline.test.tsx src/lib/utils/__tests__/scheduleHealth.test.ts src/components/ui/organisms/__tests__/CreateSubtaskModal.test.tsx` — passed, 15/15.
- `npm --prefix apps/web run typecheck` — passed, exit 0.
- `npm --prefix apps/web run build` — passed, 1,715 modul ditransformasi.
- `npm run docs:check` — passed, 5/5.
- `git diff --check` — passed.

## Risks or follow-up

- Deployment Production `https://qlickhub-okoqqoe48-oneilreyands-projects.vercel.app` berstatus Ready.
- UAT Production baca-saja sebagai QA memuat ulang Subtask `test billing v3`: antrean menunjukkan tenggat 2026-09-18 dan desk QA pada 2026-09-19 menampilkan badge `Terlambat`. Tidak ada mutasi data dilakukan.
- UAT XLSX pada rilis sebelumnya telah mencapai wizard Production, tetapi pemilih berkas native tidak dapat diisi oleh otomasi browser. Tidak ada Test Case baru yang di-commit.

## TODO update

- `AGY-SUBTASK-SCHEDULE-PERSISTENCE-AND-LATE-STATE` → `Done`.
