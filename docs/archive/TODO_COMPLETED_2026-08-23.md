# Completed Work Archive — Delivery Traceability & Collaborative Workflow

Archived from `TODO.md` on 2026-08-23 by AGY-7.3. This file preserves the completed AGY roadmap introduced after the 2026-08-20 archive. The active `TODO.md` now contains only unfinished work.

## Phase 0 — Trustworthy baseline

- [x] **Done** (Codex — 2026-08-21) — **AGY-0.1: Reconcile repository, migration, and database state.** Reconciled migrations 47/48, model/contract enums, development schema, and destructive attachment history through additive recovery migration 49; clean migration and PostgreSQL Mobile/Fullstack persistence were verified without silent data deletion.
- [x] **Done** (Codex — 2026-08-21) — **AGY-0.2: Restore a green policy and contract baseline.** Aligned Task policy, role expectations, QA document types, and stale tests with explicit Owner/PO/Dev/QA coverage.
- [x] **Done** (AGY — owner approved 2026-08-23) — **AGY-0.3: Confirm unresolved domain policy.** Accepted the implemented baseline: Owner/Admin may grant parent-Task creation to QA or Dev without granting subtask planning; Owner/Admin/PO manage Test Case definitions and Requirement mappings while QA executes; Requirement is the canonical coverage target; and persisted authorised `task_attachments` remain the evidence direction. ADR: [`ADR-001`](../adr/ADR-001-CORE-DOMAIN-AND-COLLABORATION-DECISIONS.md). Report: [`AGY_0_3_DOMAIN_POLICY_APPROVAL_2026-08-23.md`](../reports/AGY_0_3_DOMAIN_POLICY_APPROVAL_2026-08-23.md).
- [x] **Done** (Codex — 2026-08-21) — **AGY-0.4: Keep shared drawer controls reachable.** Moved restore/collapse and close controls into shared Drawer content and verified keyboard, fullscreen/restored, header, desktop, and mobile behavior.

## Phase 1 — Requirement as trusted source

- [x] **Done** (AGY — 2026-08-21) — **AGY-1.1: Complete structured Requirement management.** Added persisted Workspace-scoped list/detail/create/update, optional external URL, planner mutation policy, Dev/QA reads, and cross-Workspace PostgreSQL rejection.
- [x] **Done** (Codex — 2026-08-21) — **AGY-1.2: Define stable Requirement and Acceptance Criterion identity.** Added additive stable Acceptance Criterion records whose identity is not rewritten by Product Brief versioning.

## Phase 2 — Delivery Trace v1

- [x] **Done** (Codex — 2026-08-21) — **AGY-2.1: Deepen the Delivery Trace module.** Added one parent-Feature read model separating persisted structural coverage from execution/pass results for reuse across Task Hub, My Tasks, and Report.
- [x] **Done** (Codex — 2026-08-21) — **AGY-2.2: Surface traceability in Task Hub.** Added shared coverage/readiness signals and detailed Delivery Trace with API states, responsive/keyboard behavior, and Atomic Design reuse.
- [x] **Done** (Codex — 2026-08-21) — **AGY-2.3: Surface Feature context in My Tasks.** Added persisted parent Feature, Requirement/criteria, and trace context without browser-side calculation.
- [x] **Done** (Codex — 2026-08-21) — **AGY-2.4: Allow planners to delete Task Hub tasks.** Added Owner/Admin/PO-only transactional soft deletion for parent/direct subtasks with Activity, confirmation, refresh, and role/Workspace rejection. Report: [`AGY_2_4_TASK_DELETION_2026-08-21.md`](../reports/AGY_2_4_TASK_DELETION_2026-08-21.md).
- [x] **Done** (Codex — 2026-08-21) — **AGY-2.5: Keep task Requirement counts task-scoped.** Separated linked Task Requirements from planner-only available Workspace Requirements and prevented unrelated records from leaking into Dev/QA views.

## Phase 3 — Persist verification correctly

- [x] **Done** (Codex — 2026-08-21) — **AGY-3.1: Separate reusable Test Case from Test Run and Result.** Added canonical Test definitions, Requirement mappings, append-only Runs, immutable Results/evidence, policies, constraints, and activity.
- [x] **Done** (Codex — 2026-08-22) — **AGY-3.2: Migrate existing requirement test data safely.** Migrated legacy definitions/links with provenance, rollback guards, row-count verification, and zero fabricated Run/Result history. Report: [`AGY_3_2_LEGACY_TEST_CASE_MIGRATION_2026-08-21.md`](../reports/AGY_3_2_LEGACY_TEST_CASE_MIGRATION_2026-08-21.md).
- [x] **Done** (Codex — 2026-08-22) — **AGY-3.3: Replace the My Tasks local QA checklist.** Replaced local scenarios with persisted Feature-scoped Test execution and server-authorized Run/Result actions. Report: [`AGY_3_3_PERSISTED_QA_EXECUTION_2026-08-22.md`](../reports/AGY_3_3_PERSISTED_QA_EXECUTION_2026-08-22.md).

## Phase 4 — First-class Bug and Retest

- [x] **Done** (Codex — 2026-08-22) — **AGY-4.1: Add Bug as a first-class record.** Added Workspace-integral Feature/Requirement/failed-Result/assignee trace, lifecycle, independent QA verification, and append-only Bug activity without using Task `reviewNotes`. Report: [`AGY_4_1_FIRST_CLASS_BUG_2026-08-22.md`](../reports/AGY_4_1_FIRST_CLASS_BUG_2026-08-22.md).
- [x] **Done** (Codex — 2026-08-22) — **AGY-4.2: Add Bug and Retest experiences.** Added shared Task Hub Bug context, Developer assigned-work, QA retest actions, labelled states, and complete responsive/keyboard/API states. Report: [`AGY_4_2_BUG_RETEST_EXPERIENCES_2026-08-22.md`](../reports/AGY_4_2_BUG_RETEST_EXPERIENCES_2026-08-22.md).

## Phase 5 — Auditable release readiness

- [x] **Done** (Codex — 2026-08-22) — **AGY-5.1: Add QA Sign-off and PO Release Decision records.** Added append-only, independently authorized certification/decision records with immutable snapshots and Activity, separate from Task status/notes. Report: [`AGY_5_1_QA_SIGNOFF_RELEASE_DECISION_2026-08-22.md`](../reports/AGY_5_1_QA_SIGNOFF_RELEASE_DECISION_2026-08-22.md).
- [x] **Done** (Codex — 2026-08-22) — **AGY-5.2: Implement readiness gates.** Added deterministic persisted gates for Requirement coverage, newest Results, High/Critical Bugs, development completion, and QA Sign-off; reasoned PO overrides preserve failed snapshots. Report: [`AGY_5_2_READINESS_GATES_2026-08-22.md`](../reports/AGY_5_2_READINESS_GATES_2026-08-22.md).
- [x] **Done** (Codex — 2026-08-22) — **AGY-5.3: Surface release readiness consistently.** Task Hub, My Tasks, and Report consume the same backend `ReadinessSnapshotV2`; no release gate is calculated in the browser. Report: [`AGY_5_3_RELEASE_READINESS_SURFACES_2026-08-22.md`](../reports/AGY_5_3_RELEASE_READINESS_SURFACES_2026-08-22.md).

## Phase 6 — Role-aware attention queue

- [x] **Done** (Codex — 2026-08-22) — **AGY-6.1: Add a backend-derived role-aware queue.** Added nine persisted planner, Developer, and QA work buckets with reason, next action, authorization, and Workspace isolation. Report: [`AGY_6_1_ROLE_AWARE_WORK_QUEUE_2026-08-22.md`](../reports/AGY_6_1_ROLE_AWARE_WORK_QUEUE_2026-08-22.md).
- [x] **Done** (Codex — 2026-08-22) — **AGY-6.2: Replace generic My Tasks metrics and filters.** Rendered the shared queue with useful search/priority filters, persisted detail/Bug actions, refresh, all API states, and Atomic Design reuse. Report: [`AGY_6_2_ROLE_AWARE_MY_TASKS_2026-08-22.md`](../reports/AGY_6_2_ROLE_AWARE_MY_TASKS_2026-08-22.md).

## Phase 7 — Navigation, release validation, and documentation

- [x] **Done** (AGY — 2026-08-23) — **AGY-7.1: Add durable Feature / Story navigation.** Added protected refresh-safe Task URLs, Workspace restoration, parent/subtask breadcrumbs, Back to Feature, 403/404 states, and responsive/keyboard behavior. Report: [`AGY_7_1_DURABLE_FEATURE_NAVIGATION_2026-08-23.md`](../reports/AGY_7_1_DURABLE_FEATURE_NAVIGATION_2026-08-23.md).
- [x] **Done** (AGY — 2026-08-23) — **AGY-7.2: Run clean release validation with real persistence.** Applied all 38 migrations to a disposable PostgreSQL database and passed the authenticated Requirement → Dev → QA → Bug/retest → Sign-off → Release Decision tracer flow; final baselines were contracts 49/49, API 207/207, and frontend 249/249 with 0 skipped plus all typechecks/builds. Report: [`AGY_7_2_CLEAN_RELEASE_VALIDATION_2026-08-23.md`](../reports/AGY_7_2_CLEAN_RELEASE_VALIDATION_2026-08-23.md).
- [x] **Done** (AGY — 2026-08-23) — **AGY-7.3: Reconcile product documentation and archive the phase.** Reconciled current routes/modules, canonical Workspace schema diagram, implemented permission matrix, proposed ADR decisions, consolidated verification evidence, and active/archive TODO separation. Report: [`AGY_7_3_DOCUMENTATION_RECONCILIATION_2026-08-23.md`](../reports/AGY_7_3_DOCUMENTATION_RECONCILIATION_2026-08-23.md).

## Final verification baseline

- Contracts: 49/49 passed, 0 skipped.
- API: 207/207 passed in 60 suites against PostgreSQL, 0 skipped.
- Frontend: 249/249 passed across 56 files, 0 skipped.
- Contracts/API/web typechecks and production builds passed.
- Disposable release validation applied migrations 17–54, verified release-critical tables and persisted read-back, then dropped its database.
- Vite retains the existing non-runtime main-chunk size advisory; it is not a browser console warning.
