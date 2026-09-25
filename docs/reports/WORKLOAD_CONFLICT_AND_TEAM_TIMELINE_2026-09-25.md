# Agent Report — Workload Conflict & Team Timeline

## Task

`WORKLOAD-CONFLICT-AND-TEAM-TIMELINE` — Implementasi deteksi irisan jadwal penugasan Subtask (Workload Conflict) dan Timeline Tim visual pada `/reports`. Menghadirkan preview konflik inklusif non-blocking dengan redaksi privasi lintas Workspace (AUTH-011, FLOW-007), indeks database additive, read model backend `/capacity`, integrasi modal/accordion Subtask, komponen `TeamCapacityTimeline`, serta perombakan halaman `/reports` menjadi Timeline Tim murni.

## Outcome

Seluruh implementasi selesai dan diverifikasi pada branch `workload_conflict_team_timeline`. Tidak ada deployment Production untuk sprint ini — fitur memerlukan PO sign-off sebelum merge ke `main`.

Perubahan utama yang dihadirkan:

1. **Backend — Modul Capacity (`/workspaces/:workspaceId/capacity/`):**
   - `POST /assignment-preview` — Mendeteksi irisan jadwal inklusif (`existing.startDate <= candidate.dueDate && existing.dueDate >= candidate.startDate`) pada Subtask aktif (`todo`, `in_progress`, `in_review`, `changes_requested`). Subtask `done`/`canceled` diabaikan. Hasil bersifat advisory-only; tidak pernah memblokir penyimpanan.
   - `GET /timeline` — Read model Gantt per-member dengan query range, filter scope/member/role/area/status, dan hit-index `(assignee_id, start_date, due_date, status)`.
   - RBAC: preview hanya untuk `owner`/`admin`/`po`; timeline untuk semua member workspace. Non-member → 403.
   - Privacy (AUTH-011): Subtask lintas Workspace yang actor-nya bukan member → `title`/`workspaceId` diredaksi, `isRedacted: true`.

2. **Database — Migrasi Additive:**
   - `20260925000085-add-tasks-assignee-schedule-status-index.cjs` — composite index `(assignee_id, start_date, due_date, status)` pada tabel Tasks untuk query overlap yang performan.

3. **Contracts Package — Skema Baru (`packages/contracts/src/capacity.ts`):**
   - `AssignmentConflictItemSchema`, `UnscheduledSubtaskItemSchema`, `AssignmentConflictPreviewInputSchema`, `AssignmentConflictPreviewResponseSchema`, `TeamCapacityTimelineQuerySchema`, `TeamCapacityMemberTimelineSchema`, `TeamCapacityTimelineResponseSchema`, `TimelineSubtaskItemSchema`.

4. **Frontend — Service, Hook, Komponen:**
   - `capacityService.ts` — Client API dengan Zod parse-on-response.
   - `useAssignmentConflictPreview` hook — Debounced 300ms, race-condition-safe via `requestIdRef`, disabled saat assignee/dates belum valid.
   - `AssignmentConflictBanner` molecule — Banner amber advisory-only: menampilkan baris konflik per item, jumlah redacted lintas Workspace, notis beban aktif tanpa jadwal, dan link ke `/reports?memberId=...`. Tidak pernah memblokir tombol Simpan.
   - `TeamCapacityTimeline` organism — Gantt-style per-member timeline, skala hari/minggu/bulan, filter lengkap, seksi unscheduled expandable, modal klik-detail dengan redaction notice (AUTH-011).
   - `CreateSubtaskModal.tsx` — Integrasi hook + banner; banner muncul otomatis saat assignee dan rentang tanggal valid, submission tetap bisa dilakukan.
   - `SubtaskAccordionItem.tsx` — Integrasi serupa di tab Detail, `excludeSubtaskId` diteruskan agar Subtask yang sedang diedit tidak dihitung konflik dengan dirinya sendiri.
   - `ReportPage.tsx` — Halaman `/reports` dikosongkan dari dashboard/laporan lama dan kini menjadi host tunggal `TeamCapacityTimeline`; URL params (`memberId`, `startDate`, `endDate`, `scale`, `scope`) diteruskan dari search params.

5. **Dokumentasi & ADR:**
   - `docs/adr/ADR-016-WORKLOAD-CONFLICT-AND-CROSS-WORKSPACE-PRIVACY-BOUNDARY.md` — ADR untuk kebijakan privacy lintas Workspace.
   - `docs/features/WORKLOAD_CONFLICT_AND_TEAM_TIMELINE.md` — Feature Card lengkap.
   - `docs/1_ARCHITECTURE.md` — Catatan AUTH-011 dan FLOW-007.
   - `docs/2_WORKFLOW_AND_ROLES.md` — Catatan FLOW-007.
   - `docs/POLICY_REGISTRY.md` — Entry FLOW-007.

## Source of truth and impact

- **Applicable SSoT:** [Product Knowledge Map](../0_PRODUCT_KNOWLEDGE_MAP.md), [Architecture](../1_ARCHITECTURE.md), [Workflow & Roles](../2_WORKFLOW_AND_ROLES.md), [UI Design System](../3_UI_ATOMIC_DESIGN_SYSTEM.md), [Agent Guidelines](../4_AGENT_DEV_GUIDELINES.md).
- **Policy IDs:** `AUTH-001`, `AUTH-002`, `AUTH-004`, `AUTH-011`, `FLOW-002`, `FLOW-004`, `FLOW-007`, `DATA-001`, `DATA-002`, `CONTRACT-001`, `UI-001`, `UI-002`, `TEST-001`, `DOC-001`, `DOC-002`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** Additive. Dua endpoint baru di `/workspaces/:workspaceId/capacity/`; satu composite index additive pada tabel Tasks; delapan skema Zod baru di contracts package. Tidak ada perubahan skema kolom yang sudah ada.
- **Authorization impact:** Backend menegakkan RBAC dan privacy AUTH-011 di service layer. Tidak ada perubahan pada auth middleware yang sudah ada.
- **Migration risk:** Rendah — hanya `CREATE INDEX CONCURRENTLY` additive. Tidak ada DDL destruktif, tidak ada ALTER COLUMN, tidak ada DROP. Rollback: `DROP INDEX IF EXISTS`.

## Changed files

### Backend
- `apps/api/src/app.ts` — Mendaftarkan `capacityRouter` di `/workspaces/:workspaceId/capacity`.
- `apps/api/src/db/migrations/20260925000085-add-tasks-assignee-schedule-status-index.cjs` — [NEW] Additive composite index.
- `apps/api/src/modules/capacity/capacityController.ts` — [NEW] Controller dua endpoint.
- `apps/api/src/modules/capacity/capacityService.ts` — [NEW] Business logic overlap query + privacy redaction.
- `apps/api/src/modules/capacity/capacityRouter.ts` — [NEW] Express router + RBAC guard.
- `apps/api/src/modules/capacity/__tests__/capacityApiIntegration.test.js` — [NEW] 9 integration tests (real PostgreSQL).

### Contracts
- `packages/contracts/src/capacity.ts` — [NEW] Semua skema kapasitas/konflik.
- `packages/contracts/src/index.ts` — Re-export skema baru.
- `packages/contracts/src/contracts.test.ts` — 4 contract tests baru.

### Frontend
- `apps/web/src/lib/api/capacityService.ts` — [NEW] API client.
- `apps/web/src/lib/hooks/useAssignmentConflictPreview.ts` — [NEW] Debounced conflict preview hook.
- `apps/web/src/components/ui/molecules/AssignmentConflictBanner.tsx` — [NEW] Advisory conflict banner molecule.
- `apps/web/src/components/ui/molecules/__tests__/AssignmentConflictBanner.test.tsx` — [NEW] 5 unit tests.
- `apps/web/src/components/ui/organisms/TeamCapacityTimeline.tsx` — [NEW] Gantt-style team timeline organism.
- `apps/web/src/components/ui/organisms/__tests__/TeamCapacityTimeline.test.tsx` — [NEW] 5 unit tests.
- `apps/web/src/components/ui/organisms/CreateSubtaskModal.tsx` — Integrasi banner konflik.
- `apps/web/src/components/ui/organisms/__tests__/CreateSubtaskModal.test.tsx` — 3 test cases (termasuk advisory banner).
- `apps/web/src/components/ui/organisms/SubtaskAccordionItem.tsx` — Integrasi banner konflik di tab Detail.
- `apps/web/src/components/ui/organisms/__tests__/SubtaskAccordionItem.test.tsx` — [NEW] 1 test case.
- `apps/web/src/features/reports/index.ts` — Export `TeamCapacityTimeline`.
- `apps/web/src/pages/ReportPage.tsx` — Full replacement menjadi host `TeamCapacityTimeline`.
- `apps/web/src/pages/__tests__/ReportPage.test.tsx` — [NEW] 3 unit tests.

### Docs
- `docs/adr/ADR-016-WORKLOAD-CONFLICT-AND-CROSS-WORKSPACE-PRIVACY-BOUNDARY.md` — [NEW] ADR.
- `docs/features/WORKLOAD_CONFLICT_AND_TEAM_TIMELINE.md` — [NEW] Feature Card.
- `docs/1_ARCHITECTURE.md` — Catatan AUTH-011 dan FLOW-007.
- `docs/2_WORKFLOW_AND_ROLES.md` — Catatan FLOW-007.
- `docs/POLICY_REGISTRY.md` — Entry FLOW-007.
- `TODO.md` — Status diperbarui ke `Done`.
- `docs/reports/WORKLOAD_CONFLICT_AND_TEAM_TIMELINE_2026-09-25.md` — Laporan ini.

## Validation

### Backend Integration Tests (Real PostgreSQL)
```
node --test apps/api/dist/modules/capacity/__tests__/capacityApiIntegration.test.js
```
**Hasil: 9/9 lulus (100%)**
- ✅ POST /assignment-preview → 200 dengan konflik terdeteksi
- ✅ POST /assignment-preview → 200 tanpa konflik
- ✅ POST /assignment-preview → 200 abaikan subtask done/canceled
- ✅ POST /assignment-preview → 200 redaksi lintas Workspace AUTH-011
- ✅ POST /assignment-preview → 403 non-member workspace
- ✅ POST /assignment-preview → 403 role developer
- ✅ GET /timeline → 200 data member timeline terformat
- ✅ GET /timeline → 200 unscheduled active subtasks tercakup
- ✅ GET /timeline → 403 non-member workspace

### Contract Tests
```
npm --prefix packages/contracts run test
```
**Hasil: 77/77 lulus (100%)**
- 4 test baru: `AssignmentConflictPreviewResponse`, `TeamCapacityTimelineResponse`, unscheduled items, redacted cross-workspace items.

### Frontend Unit Tests
```
npm --prefix apps/web run test -- src/components/ui/molecules/__tests__/AssignmentConflictBanner.test.tsx
npm --prefix apps/web run test -- src/components/ui/organisms/__tests__/TeamCapacityTimeline.test.tsx
npm --prefix apps/web run test -- src/components/ui/organisms/__tests__/CreateSubtaskModal.test.tsx
npm --prefix apps/web run test -- src/components/ui/organisms/__tests__/SubtaskAccordionItem.test.tsx
npm --prefix apps/web run test -- src/pages/__tests__/ReportPage.test.tsx
```
**Hasil: 17/17 lulus (100%)**
- `AssignmentConflictBanner.test.tsx`: 5/5 (null/no-conflict/loading/error/full conflict + redacted)
- `TeamCapacityTimeline.test.tsx`: 5/5 (fetch+render, unscheduled expand, modal open, redacted modal, error+retry)
- `CreateSubtaskModal.test.tsx`: 3/3 (existing + advisory banner + submission tetap bisa)
- `SubtaskAccordionItem.test.tsx`: 1/1 (advisory banner di tab Detail, Save tetap enabled)
- `ReportPage.test.tsx`: 3/3 (loading spinner, empty workspace, URL params forwarded)

### Build
```
npm --prefix apps/web run build
```
**Hasil: Exit code 0, 1.719 modul, dist/ terbentuk**

### Docs Check
```
npm run docs:check
```
**Hasil: 5/5 lulus**

## Known gaps

- **Pre-existing failures (tidak disebabkan PR ini):**
  - `TaskTimelineView.test.tsx` — 1 kegagalan pre-existing ("separates the persisted plan from open and completed delay extensions") tidak terkait fitur ini.
  - `QaTestingDesk.test.tsx` — 2 timeout failure pre-existing tidak terkait fitur ini.
- **Production deployment:** Belum dilakukan. Fitur memerlukan PO sign-off dan review tim QA sebelum merge ke `main` dan deploy ke Production. E2E UAT pada staging environment diperlukan sebelum rilis.
- **Migration execution:** Index additive belum dijalankan pada staging/Production. Harus dijalankan bersamaan dengan deployment branch.
