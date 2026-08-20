# TODO — Delivery Traceability & Collaborative Workflow

Status values: `Todo`, `In progress`, `Blocked`, `Done`.

Completed work through 2026-08-20 is preserved in [`docs/archive/TODO_COMPLETED_2026-08-20.md`](docs/archive/TODO_COMPLETED_2026-08-20.md). This file contains only active and upcoming work.

## Product direction

Use the existing root Task as the **Feature / Story** container. Do not add a separate Feature table unless a later verified use case requires it.

```text
Workspace → Folder → Feature / Story (root Task)
                           ├── Requirement
                           ├── Dev / QA Subtask
                           ├── Test Case → Test Run → Result
                           ├── Bug → Retest
                           └── QA Sign-off → PO Release Decision
```

Menu responsibilities:

- **Task Hub** — the complete Feature / Story context, coverage, execution progress, bugs, and release readiness.
- **My Tasks** — a role-aware attention queue explaining what the signed-in Project member must do next and why.
- **Report** — historical analytics and audit; it is not the primary execution workspace.

## Instructions for AGY

1. Claim exactly one item by changing it to `In progress` and adding `AGY — YYYY-MM-DD`.
2. Follow `AGENTS.md`, including its no-silent-assumption, real-data validation, Atomic Design, and design-token rules.
3. Do not start a later phase until every earlier phase item is `Done`, or an explicit `Blocked` entry names the evidence and required decision.
4. Treat every acceptance criterion below as mandatory. A passing UI test alone does not prove database, authorization, or end-to-end behavior.
5. Finish each item with `AGENT_REPORT_TEMPLATE.md` and record only checks actually run.

## Phase 0 — Establish a trustworthy baseline

- [x] **Done** (AGY — 2026-08-21) — **AGY-0.1: Reconcile repository, migration, and database state.** Inspect migrations 47 and 48, the live development schema, model/contract enums, and the attachment-removal conflict with the delivery plan. Migration 48 drops data and must not be applied until the intended evidence-storage direction is explicitly confirmed. Resolve migration drift using additive/recoverable changes where possible. **Acceptance:** clean-database migration succeeds; development migration status matches the approved schema; Mobile/Fullstack persistence is proven against PostgreSQL; no user data is silently deleted.
- [x] **Done** (AGY — 2026-08-21) — **AGY-0.2: Restore a green policy and contract baseline.** Reconcile task policy implementation, role expectations, QA document types, and stale tests before feature work. **Acceptance:** applicable contract and backend policy suites pass; every changed permission has explicit Owner/PO/Dev/QA cases; failures are fixed rather than skipped or weakened.
- [x] **Done** (AGY — 2026-08-21) — **AGY-0.3: Record unresolved domain decisions.** Confirm who may create Dev/QA work, who may transition executor status, whether Requirement or Acceptance Criterion is the atomic coverage target, and whether evidence attachments remain part of the product. **Acceptance:** decisions are documented in the applicable plan or ADR; no implementation begins from an unstated assumption.

## Phase 1 — Make Requirement the trusted source

- [ ] **Todo** — **AGY-1.1: Complete structured Requirement management.** Provide persisted list, detail, create, and update behavior with optional external reference URL; keep Workspace scoping and PO ownership explicit. **Acceptance:** no required Requirement content is stored only in Product Brief Markdown/JSON or browser state; Dev/QA receive authorized read access; real PostgreSQL integration tests cover cross-Workspace rejection.
- [ ] **Todo** — **AGY-1.2: Define stable Requirement and Acceptance Criterion identity.** Preserve Product Brief version history while giving coverage targets stable identifiers that Test Cases and work items can reference. **Acceptance:** editing a later Product Brief version does not silently rewrite historical coverage; migration and contracts are additive and tested with realistic multi-criterion data.

## Phase 2 — Delivery Trace v1

- [ ] **Todo** — **AGY-2.1: Deepen the Delivery Trace module.** Produce one parent-Task-scoped read model for Requirement → implementing subtask → Test Case coverage. Calculate structural coverage separately from execution/pass rate. **Acceptance:** counts are derived from persisted records, Workspace scoped, and shared by Task Hub, My Tasks, and Report rather than recalculated differently in each screen.
- [ ] **Todo** — **AGY-2.2: Surface traceability in Task Hub.** Add compact coverage/readiness signals to shared task collection rows and a detailed trace view in the existing task drawer. **Acceptance:** reuse Atomic Design modules; show loading, empty, error, permission, and disabled states; support desktop/mobile, keyboard use, labels/icons beyond color, and the established theme tokens.
- [ ] **Todo** — **AGY-2.3: Surface Feature context in My Tasks.** An assigned subtask must show its parent Feature / Story, linked Requirement/criteria, and trace state without duplicating the trace calculation in the browser. **Acceptance:** navigation preserves parent context and works with backend-supplied persisted data after refresh.

## Phase 3 — Persist Verification correctly

- [ ] **Todo** — **AGY-3.1: Separate reusable Test Case from Test Run and Result.** Add canonical Sequelize migrations, contracts, models, integrity constraints, policies, and activity events. A Test Case may cover multiple Requirements; every run/result preserves build, environment, executor, time, status, and evidence references. **Acceptance:** a new run never overwrites a previous result; PostgreSQL integration tests demonstrate pass in one build and fail in a later build.
- [ ] **Todo** — **AGY-3.2: Migrate existing requirement test data safely.** Map `requirement_test_cases` into the approved Test Case model without inventing missing execution history. **Acceptance:** migration is reversible or has a documented recovery path; row counts and links are verified before and after; no fabricated run/result is created.
- [ ] **Todo** — **AGY-3.3: Replace the My Tasks local QA checklist.** Remove hardcoded/local-only scenarios from the QA desk and connect it to persisted Test Cases and Test Runs. **Acceptance:** closing/reopening the drawer or reloading the page preserves data; QA actions are authorized server-side; UI tests use contract-valid factories and are backed by database integration coverage.

## Phase 4 — Introduce Bug and Retest workflow

- [ ] **Todo** — **AGY-4.1: Add Bug as a first-class record.** Persist Feature / Story, Requirement, originating Test Result, assignee, severity, status, reproduction details, timestamps, and audit activity with Workspace integrity constraints. **Acceptance:** Bug is not serialized into Task `reviewNotes`; QA can open/reopen/verify within policy; Dev can work only assigned Bugs; cross-Workspace links fail in PostgreSQL tests.
- [ ] **Todo** — **AGY-4.2: Add Bug and Retest experiences.** Surface linked Bugs in Task Hub and role-specific Bug/retest queues in My Tasks using existing shared UI primitives. **Acceptance:** empty/loading/error/permission states and mobile/keyboard behavior are verified; status is conveyed by text/icon as well as color.

## Phase 5 — Make release readiness auditable

- [ ] **Todo** — **AGY-5.1: Add QA Sign-off and PO Release Decision records.** Keep QA certification, PO approval, override reason, actor, time, and an immutable readiness snapshot separate from Task status. **Acceptance:** no sign-off is stored only in `reviewNotes`; server policy prevents unauthorized approval and self-approval where applicable; all decisions create audit activity.
- [ ] **Todo** — **AGY-5.2: Implement readiness gates.** Evaluate Requirement coverage, latest Test Run results, open Critical/High Bugs, development completion, and QA Sign-off. **Acceptance:** readiness reasons are deterministic and integration-tested; PO override requires a non-empty reason and preserves the failed-gate snapshot.
- [ ] **Todo** — **AGY-5.3: Surface release readiness consistently.** Use the same persisted/read-model facts in Task Hub, My Tasks, and Report. **Acceptance:** no browser-only readiness calculation; identical Feature data produces identical readiness everywhere.

## Phase 6 — Turn My Tasks into an attention queue

- [ ] **Todo** — **AGY-6.1: Add a backend-derived role-aware queue.** Return actionable items with reason and next action: PO requirement/decision/timeline work; Dev assigned/blocked/fix work; QA test/retest/sign-off work. **Acceptance:** authorization is enforced before data is returned; each queue bucket is covered by PostgreSQL integration tests with realistic multi-role fixtures.
- [ ] **Todo** — **AGY-6.2: Replace generic My Tasks metrics and filters.** Present role defaults from the shared queue while retaining useful search/filter controls. **Acceptance:** the page answers “what must I do now?”; it reuses existing atoms/molecules/organisms and all established design tokens.

## Phase 7 — Navigation, release validation, and documentation

- [ ] **Todo** — **AGY-7.1: Add durable Feature / Story navigation.** Support direct task URLs, parent/subtask breadcrumbs, and Back to Feature behavior that survives refresh and works on mobile. **Acceptance:** route tests cover authorized deep links, forbidden access, and missing records.
- [ ] **Todo** — **AGY-7.2: Run clean release validation with real persistence.** Start from a clean PostgreSQL test database, apply all migrations, seed contract-valid realistic data, and execute the full Requirement → Dev → QA → Bug/retest → Sign-off → Release Decision flow through backend interfaces and critical UI paths. **Acceptance:** contract, backend, frontend, typecheck, and production builds pass; no skipped tests, production mock data, fabricated evidence, or console warnings are accepted.
- [ ] **Todo** — **AGY-7.3: Reconcile product documentation and archive the phase.** Update delivery/design plans, permission matrix, database diagram, verification evidence, and completed-work archive. **Acceptance:** documentation describes actual behavior and `TODO.md` retains only unfinished work.

## Explicitly deferred

- A universal polymorphic relationship table (`implements`, `tests`, `found_in`, and similar) is deferred. Prefer explicit Workspace-scoped foreign keys/join tables until at least two verified relationships cannot be represented safely.
- Requirement/Test/Bug/Release contextual discussion is deferred until those persisted records exist. Do not create a generic discussion seam from a task-only use case.
