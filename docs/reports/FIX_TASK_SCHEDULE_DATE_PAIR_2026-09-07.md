# Agent Report — Task and Subtask schedule date pair validation

## Task

`FIX-TASK-SCHEDULE-DATE-PAIR`: require complete and ordered Start/Due date pairs for Task and
Subtask timelines.

## Outcome

Task and Subtask create/edit flows now allow a fully blank timeline or a complete date pair where
`startDate <= dueDate`. One-sided and reversed timelines are rejected consistently by the shared
contract, UI, backend service, and PostgreSQL. Backend update validation evaluates the final merged
record, so valid partial edits to one date remain supported when the other persisted date completes
the pair. Failed updates roll back without changing the stored schedule.

## Source of truth and impact

- **Applicable SSoT:** `docs/2_WORKFLOW_AND_ROLES.md`,
  `docs/adr/ADR-007-TASK-SCHEDULE-DATE-PAIR.md`, and
  `docs/features/TASK_SCHEDULE_DATE_PAIR.md`.
- **Policy IDs:** `FLOW-002`, `FLOW-004`, `CONTRACT-001`, `DATA-002`, `TEST-001`, `UI-001`,
  `UI-002`, `DOC-002`, `DOC-004`.
- **Data/interface impact:** Existing request/response fields remain unchanged. Create rejects an
  incomplete pair at the shared boundary; update validates the merged stored state and returns the
  existing bad-request error family. PostgreSQL now enforces the invariant directly.
- **Authorization impact:** None. Owner/Admin/PO planning-field authority remains unchanged and the
  backend remains authoritative.
- **Migration risk:** Low for audited environments. Aggregate read-only audits found zero invalid
  rows among 3 local Tasks and 5 Production Tasks. Migration 66 is additive, stops rather than
  rewriting historical invalid data, and its rollback removes only the check constraint. It was
  applied locally and to Production; the application was deployed on 2026-09-08.

## Changed files

- `packages/contracts/src/task.ts` and `packages/contracts/src/contracts.test.ts` — define and prove
  the shared timeline invariant.
- `apps/api/src/modules/tasks/internal/taskLifecycle.ts` — defensively validate create inputs and
  final merged update state inside the existing transaction.
- `apps/api/src/db/migrations/20260907000066-enforce-task-schedule-date-pair.cjs` — reject invalid
  historical state and add the database check constraint.
- `apps/api/src/modules/tasks/__tests__/taskApiIntegration.test.ts` and
  `apps/api/scripts/verifyCleanMigrations.cjs` — prove contract, service rollback, direct database
  rejection, and clean migration behavior.
- `apps/api/src/modules/notifications/__tests__/notificationApiIntegration.test.ts` and
  `apps/api/src/modules/workQueue/__tests__/workQueueApiIntegration.test.ts` — update old one-sided
  fixtures to contract-valid date pairs without weakening their original assertions.
- `apps/web/src/components/ui/organisms/CreateTaskModal.tsx`, `CreateSubtaskModal.tsx`,
  `TaskDetailDrawer.tsx`, `SubtaskAccordionItem.tsx`, and
  `taskDetail/TaskDetailOverviewTab.tsx` — prevent invalid create/edit requests and expose inline,
  screen-reader-readable feedback.
- `apps/web/src/components/ui/organisms/__tests__/CreateTaskModal.test.tsx` and
  `CreateSubtaskModal.test.tsx` — prove accessible one-sided-date feedback.
- `docs/2_WORKFLOW_AND_ROLES.md`, `docs/POLICY_REGISTRY.md`,
  `docs/adr/ADR-007-TASK-SCHEDULE-DATE-PAIR.md`, and
  `docs/features/TASK_SCHEDULE_DATE_PAIR.md` — record the owner decision and traceability.
- `TODO.md` — claim and close the task with evidence.

## Validation

- Reproduction before implementation — `CreateTaskSchema` accepted Start-only and Due-only inputs;
  new regression test failed 1 of 61 assertions as expected.
- Existing-data aggregate audit — local 3 total/0 one-sided/0 reversed; Production 5 total/0
  one-sided/0 reversed. No row content or credentials were logged.
- `npm test --workspace=@qlick/contracts -- --runInBand` — 61/61 passed, 0 skipped.
- Focused frontend tests for both create modals — 2 files, 4/4 passed.
- `npm test --workspace=@qlick/web` — 67 files, 330/330 passed, 0 skipped. An earlier composite run
  reported two post-teardown asynchronous errors from the unchanged `DevWorkingDesk` test; the
  standalone full rerun passed cleanly. Existing jsdom navigation, React `act`, and nested-button
  warnings remain unrelated test-output warnings.
- Focused Task PostgreSQL integration — 29/29 passed, proving service rejection, transactional
  rollback, and direct constraint rejection.
- Focused notification and work-queue PostgreSQL suites — 20/20 passed after converting stale
  one-sided fixtures into valid pairs.
- `npm run test:integration --workspace=@qlick/api` — 396/396 passed across 93 suites, 0 skipped.
- `npm run db:verify:clean-migrations --workspace=@qlick/api` — all 50 canonical migrations applied
  to a fresh disposable PostgreSQL database and the new constraint was present.
- Local migration — migrations 64, 65, and 66 applied because the development database was at 63;
  the final audit returned 0 invalid timelines and an active schedule constraint.
- `npm run validate` — documentation 5/5, lint 0 errors with 27 existing warnings, and all package
  typechecks passed.
- `npm run build` — contracts, API, and web Production build passed; Vite transformed 1,695 modules.
- `git diff --check` — passed.

The reusable diagnosis workflow changed the implementation by requiring a failing regression test
before the fix, isolating shared-contract/service/database causes separately, and preserving the
merged-state behavior needed by partial update requests.

## Risks or follow-up

- Production migration 66 and the new application build are live. Post-release status showed all
  50 migrations `up`, and health returned `200` with database `connected`.
- The disposable test database contained 84 historical one-sided fixture rows from earlier runs.
  They were repaired only in `qa_management_test` by copying the existing date to its missing pair so
  migration 66 could apply; no local-development or Production task data was modified.

## TODO update

- `FIX-TASK-SCHEDULE-DATE-PAIR` → `Done`.
