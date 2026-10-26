## Task

UI-WORKSPACE-REFRESH / P3.3 — Kanban subtask paginated per Feature.

## Outcome

Kanban no longer presents root Feature cards as if they were subtasks. A user selects one Feature
through the presentation-only `kanbanFeatureId` URL value; the board reads only that Feature's
subtasks through the existing authenticated endpoint and presents their persisted canonical status
on the current page. Kanban remains read-only.

## Work assurance

- **SDLC stage and path (`SDLC-001`):** Stage 4 Build, Full path; P3.3 E2/E3 accepted, with a
  narrow E4 pagination gap.
- **Work Readiness Assessment:** 8/16, Ready after split. UI/test/docs plus persisted interface
  evidence; no schema, authorization, shared contract, or endpoint change.
- **User plan approval:** Owner said `lanjut` after P3.3 Approval Window on 2026-10-26.
- **Approval Window:** baseline `a4e5642`; approved UI/query/test/docs changes and disposable
  PostgreSQL evidence, commit and push. No dependency, backend behavior, RBAC, migration, merge,
  or deploy.
- **Agent capability and access:** source, existing API/test seams, a clean local PostgreSQL
  database, and an authenticated local browser session were available.

| Acceptance Criterion | Required / achieved evidence level | Primary evidence and environment                                                                            | Verification status             |
| -------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------- |
| AC-3.1               | E2/E3/E4 / E2/E3 plus partial E4   | 20/20 focused web tests; clean PostgreSQL subtask integration 11/11; authenticated parent-scope observation | Accepted with pagination E4 gap |
| AC-3.2               | E2/E4 / E2/E4                      | UI states/theme guard tests; authenticated Light/Dark observation at three viewports                        | Accepted                        |

- **Evidence outcomes:** web tests passed 20/20; web and API typecheck passed; web production build
  passed; theme check/test passed 4/4; clean PostgreSQL migration and subtask integration passed
  11/11, then the disposable database was verified removed. E4 authenticated browser validation
  selected the persisted Feature and showed its four subtask cards (3 `Belum Dikerjakan`, 1
  `Sedang Dikerjakan`) without opening a detail drawer or invoking any task mutation. The selected
  Feature has four subtasks, below the page size of 24, so the runtime run cannot claim page-two
  navigation.
- **Change Impact Map:** `taskHubQueryState` → shareable Kanban scope; dashboard template → passes
  visible Feature scope; Kanban organism → one existing paginated read per selected Feature.
  Existing backend controller/service/policy enforce membership; no backend source changes.
- **Decision Snapshot:** a distinct `kanbanFeatureId` was selected over `taskId` (which opens the
  detail drawer) or auto-selecting a first Feature (hidden, unstable scope). The URL value is
  non-sensitive and can be cleared; rollback is a code revert with no data recovery.
- **Agent handoff and independent verification:** P5 independent review established the original
  mismatch. An independent P3.3 review rechecked URL scope, selected-parent fetch, six status
  columns, pagination, state coverage, clean PostgreSQL evidence, typecheck, docs, and diff. A
  follow-up independent review accepted the authenticated E4 parent/theme evidence but retained a
  narrow pagination E4 gap because the available Feature has only four subtasks. Feature-wide G5
  remains open for P1/P2.
- **Quality review:** reused `taskService.listSubtasks`, `Select`, `EmptyState`, `Skeleton`,
  `Alert`, `AccessRestricted`, `Button`, and `TaskStatusBadge`; no parallel API/state calculation.
  Search confirmed one Kanban subtask fetch for the selected parent per page. No obsolete code or
  unused imports were introduced in the changed scope.
- **Cross-layer quality gates:** board uses paired Light/Dark classes and passes theme gate. E4
  observed both themes at 390×844, 768×1024, and 1440×900; no database relation, index, or API
  behavior changed.

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
- Authenticated local browser E4 — `/work?tab=tasks&view=kanban` selected the persisted parent
  Feature, retained it as a distinct `kanbanFeatureId` URL value, and rendered only its four
  subtask cards across six canonical status columns. Light and Dark modes were each observed at
  390×844, 768×1024, and 1440×900. The browser viewport override was reset and the original Dark
  preference restored after inspection. This Feature has four subtask cards, below `limit=24`, so
  no pagination control or page-two navigation was present to observe.

## Risks or follow-up

- P3.3 has one bounded E4 pagination gap: authenticate with a Feature containing more than 24
  subtasks and navigate page 1 → page 2. Feature-wide G5 also remains open because AC-1.1 and
  AC-2.1/AC-2.2 still need their own runtime evidence; this P3.3 E4 does not claim those unrelated
  flows.

## Human decision summary

The original AC-3.1 mismatch is resolved without weakening the requirement. Authenticated runtime
verification confirms selected-parent Kanban behavior, while page navigation remains explicitly
unclaimed until realistic persisted data spans more than one page; no product or data policy changed.

## TODO update

- `UI-WORKSPACE-REFRESH` → `In progress`.
