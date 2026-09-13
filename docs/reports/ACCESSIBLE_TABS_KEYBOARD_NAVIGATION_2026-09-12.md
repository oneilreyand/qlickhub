## Task

ACCESSIBLE-TABS-KEYBOARD-NAVIGATION — menyelaraskan komponen tab dengan pola aksesibilitas umum.

## Outcome

Semua pemakaian `Tabs` kini mengekspos `tablist` dan `tab` dengan nama konteks yang jelas. Tab aktif menjadi satu-satunya elemen yang masuk urutan fokus (roving `tabIndex`), status aktif tersedia melalui `aria-selected`, dan navigasi keyboard mendukung ArrowLeft/ArrowRight dengan perpindahan melingkar serta Home/End.

## Source of truth and impact

- **Applicable SSoT:** [UI Atomic Design System](../3_UI_ATOMIC_DESIGN_SYSTEM.md), [Workflow and Roles](../2_WORKFLOW_AND_ROLES.md)
- **Policy IDs:** `UI-001`, `UI-002`, `TEST-001`, `DOC-003`, `DOC-004`
- **Data/interface impact:** Tidak ada perubahan API, kontrak, atau data persisten. Prop opsional `ariaLabel` ditambahkan pada komponen UI bersama.
- **Authorization impact:** Tidak ada.
- **Migration risk:** Tidak ada migrasi atau perubahan schema.

## Changed files

- `apps/web/src/components/ui/molecules/Tabs.tsx` — menambahkan semantik tablist/tab, status aktif, roving focus, navigasi keyboard, dan pengguliran tab aktif.
- `apps/web/src/components/ui/molecules/__tests__/Tabs.test.tsx` — menguji dua varian, status aksesibilitas, dan navigasi keyboard.
- `apps/web/src/components/ui/organisms/TaskDetailDrawer.tsx` — memberi nama konteks tab detail Task.
- `apps/web/src/components/ui/organisms/SubtaskAccordionItem.tsx` — memberi nama konteks tab detail Subtask.
- `apps/web/src/components/ui/organisms/myTasks/DevWorkingDesk.tsx` — memberi nama konteks tab area kerja Developer.
- `apps/web/src/components/ui/organisms/myTasks/MyTaskDetailWorkspaceDrawer.tsx` — memberi nama konteks tab tampilan kerja berbasis peran.
- `apps/web/src/components/ui/organisms/myTasks/RoleAwareWorkQueuePanel.tsx` — memberi nama konteks tab filter antrean kerja.
- `apps/web/src/components/ui/organisms/__tests__/TaskDetailDrawer.test.tsx` — menyelaraskan query tab dengan role aksesibel.
- `apps/web/src/components/ui/organisms/__tests__/SubtaskList.test.tsx` — menyelaraskan query tab Subtask dengan role aksesibel.
- `apps/web/src/components/ui/organisms/myTasks/__tests__/MyTaskDetailWorkspaceDrawer.test.tsx` — menyelaraskan query tab workspace dengan role aksesibel.
- `apps/web/src/components/ui/organisms/__tests__/MyTasksDashboard.test.tsx` — menyelaraskan query tab antrean dengan role aksesibel.

## Validation

- `npm --prefix apps/web run typecheck` — lulus.
- ESLint pada seluruh file slice — lulus tanpa error; 2 warning hook yang sudah ada pada `SubtaskAccordionItem.tsx` dan `RoleAwareWorkQueuePanel.tsx`.
- Prettier pada seluruh file slice — lulus.
- Tes terfokus Tabs dan konsumen — 6 file, 59/59 tes lulus.
- `npm --prefix apps/web run test` — 81 file, 426/426 tes lulus; terdapat warning React `act(...)` yang sudah ada pada beberapa tes WorkspaceSettings, QA desk, Header/NotificationBell, dan TaskTimeline.
- `npm run build:web` — lulus; Vite menghasilkan build produksi.
- Browser lokal terautentikasi — desktop 1.624×969 dan viewport ponsel 319×851 diperiksa; login/workspace terbuka, tidak ada error/peringatan browser. Workspace lokal mengembalikan 0 Task sehingga perpindahan tab pada data Task nyata tidak dapat diklik; perilaku tersebut dicakup oleh tes komponen 4/4 dan tes konsumen.

## Risks or follow-up

- Tidak ada risiko fungsional yang diketahui. Saat fixture Task tersedia kembali, lakukan satu smoke check manual pada detail Task untuk memastikan fokus berpindah dan tab aktif otomatis terscroll pada data nyata.

## TODO update

- ACCESSIBLE-TABS-KEYBOARD-NAVIGATION → `Done`
