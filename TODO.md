# TODO — Active Product Decisions and Work

Status values: `Todo`, `In progress`, `Blocked`, `Done`.

Completed work is preserved in:

- [`docs/archive/TODO_COMPLETED_2026-08-20.md`](docs/archive/TODO_COMPLETED_2026-08-20.md) — foundation work completed through 2026-08-20.
- [`docs/archive/TODO_COMPLETED_2026-08-23.md`](docs/archive/TODO_COMPLETED_2026-08-23.md) — AGY delivery roadmap completed through AGY-7.3.
- [`docs/archive/TODO_COMPLETED_2026-08-24.md`](docs/archive/TODO_COMPLETED_2026-08-24.md) — deletion-safety work completed from the 2026-08-24 audit.

This file intentionally contains only unfinished work. New implementation tasks must be added here and claimed one at a time under `AGENTS.md`.

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

- **Task Hub** — complete Feature / Story context, coverage, execution progress, Bugs, and release readiness.
- **My Tasks** — backend-derived role-aware attention queue explaining what the signed-in Workspace member must do next and why.
- **Report** — historical analytics and audit; not the primary execution workspace.

- [x] **Done** (Antigravity — 2026-08-24) — **QA-INTAKE-EVIDENCE: Implement native Test Case authoring, spreadsheet intake wizard, formal evidence links with in-app preview, and QA–Dev–PO communication handoffs.** Implemented Slices 1–5 according to decisions D1–D6 and `TEST_CASE_INTAKE_EVIDENCE_COMMUNICATION_PLAN.md`. Delivered additive migrations 59 and 60, native authoring modal with requirement links and step builders, 3-step CSV/XLSX intake wizard with dry-run/preview and downloadable error reporting, evidence links on TestResult & Bug with zoom/pan preview and sandboxed video players (YouTube, Loom, Vimeo, Google Drive), and role-directed notification handoffs with deep links. Evidence: `apps/api/src/modules/testManagement/__tests__/testCaseIntakeAndEvidenceApiIntegration.test.ts` (17/17 pass), `packages/contracts/src/contracts.test.ts` (54/54 pass), `apps/web` (59 files, 269/269 pass, build exit 0), and clean migration verification against disposable PostgreSQL test database.

- [x] **Done** (Codex — 2026-08-24) — **QA-IMPORT-EVIDENCE-PLAN: Define the production plan for native/manual spreadsheet Test Case intake, Test Result evidence links with in-app preview, and QA–Dev–PO communication.** Published the two-path canonical intake, formal evidence-link, cross-role notification, authorization, migration, and validation plan. Product-policy decisions D1–D6 remain required before implementation. Evidence: `docs/plans/TEST_CASE_INTAKE_EVIDENCE_COMMUNICATION_PLAN.md`.

- [x] **Done** (Codex — 2026-08-24) — **DOC-E2E-ROLES: Document the approved end-to-end workflow for every Workspace role.** Published the Owner, Admin, PO, Developer, and QA handoffs from Workspace setup through release decision, including backend authority, persisted evidence, queues, and exception paths. Evidence: `docs/reports/DOC_E2E_ROLE_WORKFLOW_2026-08-24.md`.

- [x] **Done** (Codex — 2026-08-24) — **DEV-SETUP: Standardize the local development baseline.** Added reproducible Node/tooling configuration, repository-wide formatting and linting, a staged-file commit hook, and documented root verification commands. The hook does not require local database access, and CI now runs the same static validation. Evidence: `docs/reports/DEV_SETUP_STANDARDIZATION_2026-08-24.md`.

- [x] **Done** (Codex — 2026-08-24) — **DB-8.5: Reconcile Workspace membership soft-delete schema.** Applied and verified the canonical additive migrations that add `workspace_members.deleted_at`, history-preserving offboarding, release-critical task guards, and Workspace Developer specialties. The local API database now matches the active Sequelize model; validation evidence is recorded in `docs/reports/DB_8_5_WORKSPACE_MEMBER_SOFT_DELETE_SCHEMA_2026-08-24.md`.

## Explicitly deferred

- A universal polymorphic relationship table (`implements`, `tests`, `found_in`, and similar) remains deferred. Prefer explicit Workspace-scoped foreign keys/join tables until at least two verified relationships cannot be represented safely.
- Requirement/Test/Bug/Release contextual discussion remains deferred. Do not create a generic discussion seam without an explicit product task and domain-specific authorization/audit design.
