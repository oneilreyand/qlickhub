## Task

UI-WORKSPACE-REFRESH / P3.3 — Kanban subtask paginated per Feature.

## Outcome

Kanban no longer presents root Feature cards as if they were subtasks. A user selects one Feature
through the presentation-only `kanbanFeatureId` URL value; the board reads only that Feature's
subtasks through the existing authenticated endpoint and presents their persisted canonical status
on the current page. Kanban remains read-only.

## Work assurance

- **SDLC stage and path (`SDLC-001`):** Stage 4 Build, Full path; P3.3 E2/E3 candidate.
- **Work Readiness Assessment:** 8/16, Ready after split. UI/test/docs plus persisted interface
  evidence; no schema, authorization, shared contract, or endpoint change.
- **User plan approval:** Owner said `lanjut` after P3.3 Approval Window on 2026-10-26.
- **Approval Window:** baseline `a4e5642`; approved UI/query/test/docs changes and disposable
  PostgreSQL evidence, commit and push. No dependency, backend behavior, RBAC, migration, merge,
  or deploy.
- **Agent capability and access:** source, existing API/test seams, and a clean local PostgreSQL
  database were available. Browser session is expired, so E4 is not claimed.

| Acceptance Criterion | Required / achieved evidence level | Primary evidence and environment                                                          | Verification status  |
| -------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------- | -------------------- |
| AC-3.1               | E2/E3/E4 / E2/E3                   | 20/20 focused web tests; clean PostgreSQL subtask integration 11/11                       | Accepted with E4 gap |
| AC-3.2               | E2/E4 / E2                         | Loading, empty, generic error/retry, 403 restricted, status labels, and theme guard tests | Accepted with E4 gap |

- **Evidence outcomes:** web tests passed 20/20; web and API typecheck passed; web production build
  passed; theme check/test passed 4/4; clean PostgreSQL migration and subtask integration passed
  11/11, then the disposable database was verified removed.
- **Change Impact Map:** `taskHubQueryState` → shareable Kanban scope; dashboard template → passes
  visible Feature scope; Kanban organism → one existing paginated read per selected Feature.
  Existing backend controller/service/policy enforce membership; no backend source changes.
- **Decision Snapshot:** a distinct `kanbanFeatureId` was selected over `taskId` (which opens the
  detail drawer) or auto-selecting a first Feature (hidden, unstable scope). The URL value is
  non-sensitive and can be cleared; rollback is a code revert with no data recovery.
- **Agent handoff and independent verification:** P5 independent review established the original
  mismatch. An independent P3.3 review rechecked URL scope, selected-parent fetch, six status
  columns, pagination, state coverage, clean PostgreSQL evidence, typecheck, docs, and diff; result
  **Accepted with gaps** because authenticated E4 remains pending. Feature-wide G5 remains open.
- **Quality review:** reused `taskService.listSubtasks`, `Select`, `EmptyState`, `Skeleton`,
  `Alert`, `AccessRestricted`, `Button`, and `TaskStatusBadge`; no parallel API/state calculation.
  Search confirmed one Kanban subtask fetch for the selected parent per page. No obsolete code or
  unused imports were introduced in the changed scope.
- **Cross-layer quality gates:** board uses paired Light/Dark classes and passes theme gate. E4
  phone/tablet/desktop still requires an authenticated browser session; no database relation,
  index, or API behavior changed.

## Source of truth and impact

- **Applicable SSoT:** `docs/1_ARCHITECTURE.md`, `docs/2_WORKFLOW_AND_ROLES.md`,
  `docs/3_UI_ATOMIC_DESIGN_SYSTEM.md`, `docs/4_AGENT_DEV_GUIDELINES.md`, and the Feature PRD.
- **Policy IDs:** `UI-001`, `UI-002`, `UI-003`, `UI-004`, `AUTH-001`, `AUTH-002`,
  `CONTRACT-001`, `DATA-001`, `TEST-001`, `SDLC-001`.
- **Data/interface impact:** one existing read endpoint is now consumed by the Kanban UI; no
  request/response contract changes.
- **Authorization impact:** None; backend membership enforcement and 403 presentation remain intact.
- **Migration risk:** None.

## Changed files

- Task Hub query helper/template/Kanban organism and focused tests — explicit Feature scope,
  paginated subtask rendering, and UI states.
- Existing subtask integration test — persisted parent-scope pagination proof.
- Feature records, TODO, and this report — phase evidence.

## Validation

- Focused web tests — 20/20 passed, 0 failed/skipped.
- `npm --prefix apps/web run typecheck` and `npm --prefix apps/api run typecheck` — passed.
- `npm --prefix apps/web run build` — passed.
- `npm run theme:test && npm run theme:check` — 4/4 passed; coverage passed.
- Clean PostgreSQL — canonical migrations passed; subtask integration 11/11 passed; database removal
  query returned `f`.

## Risks or follow-up

- Authenticated browser E4 is still required for Feature selection, parent-only cards, pagination,
  Light/Dark, and phone/tablet/desktop before P3 can be accepted.

## Human decision summary

The original AC-3.1 mismatch is resolved without weakening the requirement. The only remaining P3
decision is runtime verification with an authenticated user; no product or data policy changed.

## TODO update

- `UI-WORKSPACE-REFRESH` → `In progress`.
