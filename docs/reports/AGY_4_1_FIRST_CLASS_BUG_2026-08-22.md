# Agent Report — AGY-4.1 First-class Bug

## Task

AGY-4.1: Add Bug as a first-class record.

## Outcome

Bug is now a persisted, Workspace-scoped domain record instead of text serialized into Task `reviewNotes`.

- Each Bug has explicit links to its root Feature / Story Task, Requirement, failed or blocked originating Test Result, and Developer assignee.
- Creation, assignment, metadata changes, Developer work, resolution, QA reopen, and QA verification produce append-only Bug activity.
- Owner, Admin, and QA may open and manage assignment/metadata. Product Owner is read-only. A Developer can read and work only Bugs assigned to that Developer.
- Developer transitions are `open|reopened → in_progress → resolved`; resolution notes are required. Owner/Admin/QA independently verify or reopen resolved work.
- PostgreSQL composite foreign keys enforce Workspace integrity for Feature, Requirement, Test Result, assignee, creator, Bug activity, and activity actor.
- The My Tasks QA desk now requires persisted failed/blocked Result evidence plus a Developer assignee and submits to the Bug API. It no longer changes the QA subtask status or writes a defect string to `reviewNotes`.
- The shared Modal now moves focus inside on open, traps Tab within the dialog, supports Escape, and restores the launcher focus on close.

No unresolved schema, authorization, or migration decision remains for AGY-4.1. Role-specific Bug and retest queue presentation remains explicitly scoped to AGY-4.2.

## Changed files

- `packages/contracts/src/bug.ts`, `packages/contracts/src/index.ts`, `packages/contracts/src/contracts.test.ts` — add Bug, update, list, severity/status, and activity contracts with validation evidence.
- `apps/api/src/db/migrations/20260822000053-create-first-class-bugs.cjs` — add `bugs` and `bug_activities`, lifecycle checks, indexes, and composite Workspace foreign keys.
- `apps/api/src/db/models/bug.ts`, `apps/api/src/db/models/bugActivity.ts`, `apps/api/src/db/models/index.ts`, `apps/api/src/db/models/associations.ts` — add Sequelize models and explicit associations.
- `apps/api/src/policies/bugPolicy.ts`, `apps/api/src/policies/__tests__/bugPolicy.test.ts` — enforce creation, read, update, assignment, and lifecycle authorization.
- `apps/api/src/modules/bugs/bugService.ts`, `bugController.ts`, `bugRoutes.ts`, `__tests__/bugApiIntegration.test.ts`, `apps/api/src/app.ts` — add authenticated Bug endpoints, transactional validation/audit, and PostgreSQL HTTP coverage.
- `apps/web/src/lib/api/bugService.ts` — add the first-class Bug creation client.
- `apps/web/src/components/ui/organisms/myTasks/QaTestingDesk.tsx`, `__tests__/QaTestingDesk.test.tsx` — replace `reviewNotes` defect serialization with persisted evidence/assignee selection and Bug creation.
- `apps/web/src/components/ui/molecules/Modal.tsx`, `__tests__/Modal.test.tsx` — make shared modal focus behavior keyboard-safe.
- `TODO.md` — mark AGY-4.1 complete with verification evidence.

## Data/interface impact

- Additive tables: `bugs`, `bug_activities`.
- New authenticated interfaces:
  - `GET /v1/workspaces/:workspaceId/bugs`
  - `POST /v1/workspaces/:workspaceId/bugs`
  - `GET /v1/workspaces/:workspaceId/bugs/:bugId`
  - `PATCH /v1/workspaces/:workspaceId/bugs/:bugId`
  - `GET /v1/workspaces/:workspaceId/bugs/:bugId/activity`
- No existing Task data or `reviewNotes` content is migrated, rewritten, or deleted.
- Migration 53 was applied successfully to both test and development environments.

## Authorization impact

- Owner/Admin/QA: create and read Bugs; manage assignee and metadata; verify/reopen through the verification transition policy.
- PO: read-only.
- Dev: list/read only own assigned Bugs; update only status and resolution notes on own assigned Bugs.
- Non-members and cross-Workspace IDs are rejected at HTTP boundaries; persisted cross-Workspace trace links are rejected by PostgreSQL.

## Validation

- `npm run test --workspace=@qlick/contracts` — passed, 43/43, 0 skipped.
- `npm run db:verify:clean-migrations --workspace=@qlick/api` — passed from an empty disposable PostgreSQL database through migration 53.
- `npm run db:migrate:test --workspace=@qlick/api` — passed; migrations 52 and 53 applied to the test environment.
- `npm run build --workspace=@qlick/api && NODE_ENV=test node --test apps/api/dist/policies/__tests__/bugPolicy.test.js apps/api/dist/modules/bugs/__tests__/bugApiIntegration.test.js` — passed, 8/8.
- `npm test --workspace=@qlick/api` — passed, 188/188 across 55 suites, 0 skipped.
- `npm run typecheck --workspace=@qlick/api && npm run build --workspace=@qlick/api` — passed.
- `npm test --workspace=@qlick/web -- --run src/components/ui/molecules/__tests__/Modal.test.tsx src/components/ui/organisms/myTasks/__tests__/QaTestingDesk.test.tsx` — passed, 7/7.
- `npm test --workspace=@qlick/web` — passed, 213/213 across 49 files.
- `npm run typecheck --workspace=@qlick/web && npm run build --workspace=@qlick/web` — passed. Vite retained the existing chunk-size warning for the JavaScript bundle above 500 kB.
- Browser QA with the actual shared components and a temporary contract-valid visual fixture — passed at 1280×720 and 390×844: no horizontal overflow, dialog fit the viewport, focus entered Close, Tab wrapped within the modal, submit completed, and the subtask remained `In Progress`. The temporary fixture files and local server were removed after inspection.
- `npm run db:migrate --workspace=@qlick/api` — passed; migration 53 applied to the development environment.

## Risks or follow-up

- AGY-4.2 must surface linked Bug lists plus Developer and QA retest queues; AGY-4.1 deliberately provides only the first-class persistence/API and the QA creation entry point.
- The existing production bundle-size warning remains; no new framework or production fixture was introduced.

## TODO update

- AGY-4.1: Add Bug as a first-class record → `Done`
