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

## Active work

- [x] **Done** (Codex — 2026-08-24) — **QA-REVIEW-REMEDIATION-4: Preserve formal evidence during unique-index migration, fail closed when attachment Feature provenance cannot be proven, repair import session status handling, and close the reviewed UI accessibility/contract gaps.** D1–D6 are approved with documented defaults, and migration 61 is confirmed not to have run in staging/production. QA can author/import drafts and submit review; planners publish/archive and exclusively use import update mode. Evidence preview now requires HTTPS plus the configured direct-media host allowlist. Evidence: clean migration verification, PostgreSQL policy/integration 35/35, web build, and static validation.

- [x] **Done** (Antigravity — 2026-08-24) — **QA-REVIEW-REMEDIATION-3: Remediate review findings on commit `8b70db561b6192b8a4ce5a8686da2d618fc6320c`.** Implemented deterministic data preservation in migration 61 for pre-existing duplicate URLs using window partitioned ranking (`ROW_NUMBER() OVER (PARTITION BY ... ORDER BY added_at ASC, id ASC)`); unified import row validation from preview to commit with active-only requirement mapping (draft/deprecated/archived rejected with row errors); enforced evidence payload limits (`MAX_EVIDENCE_ATTACHMENTS = 20`, `MAX_EVIDENCE_LINKS = 20`) returning 400 Bad Request; enforced task-scoping hierarchy validation ensuring `qa_evidence` attachments belong strictly to the test case's feature delivery tree; aligned download URL base with `VITE_API_URL` in `taskService.ts`; filtered QA attachment picker to `qa_evidence` on subtask & feature task with explicit empty state; and refined wizard accessibility with explicit `aria-label`s and 44px touch targets. Evidence: migration 61 deduplication test (`migration61EvidenceDeduplication.test.ts` pass), clean migration verification (all 61 migrations clean), `testCaseIntakeAndEvidenceApiIntegration.test.ts` (24/24 pass), full API test suite (254/254 pass across 70 suites), web unit test suite (270/270 pass across 59 files), web production build exit 0, and ESLint (0 errors).

- [x] **Done** (Antigravity — 2026-08-24) — **QA-REVIEW-REMEDIATION-2: Remediate review findings on commit `073ada1d1eb9d3c1033d92c031c3b251121f195d`.** Reverted Test Case definition, update, and import policy strictly to Planners (`owner`, `admin`, `po`) per ADR-001 with QA & Dev restricted (403); implemented atomic idempotent import sessions with `transaction.LOCK.UPDATE`, safe replay returning identical saved counts, and concurrent race handling; integrated formal task attachment multi-picker and provenance badges in QA Desk; fixed Bug inherited attachment download URLs to use `taskService.getAttachmentDownloadUrl` targeting origin `taskId`; implemented interactive spreadsheet header mapping step in the intake wizard; added database unique constraint migration 61 with 409 Conflict handling on duplicate URLs; ensured 44px min touch targets and keyboard zoom controls in Evidence Preview Modal. Evidence: migration 61 clean DB verification (0 errors), `testCaseIntakeAndEvidenceApiIntegration.test.ts` (20/20 pass), full API test suite (249/249 pass across 69 suites), web test suite (270/270 pass across 59 files), web build exit 0, and ESLint (0 errors).

- [x] **Done** (Antigravity — 2026-08-24) — **QA-INTAKE-EVIDENCE: Implement native Test Case authoring, spreadsheet intake wizard, formal evidence links with in-app preview, and QA–Dev–PO communication handoffs.** Implemented Slices 1–5 according to decisions D1–D6 and `TEST_CASE_INTAKE_EVIDENCE_COMMUNICATION_PLAN.md`. Delivered additive migrations 59 and 60, native authoring modal with requirement links and step builders, 3-step CSV/XLSX intake wizard with dry-run/preview and downloadable error reporting, evidence links on TestResult & Bug with zoom/pan preview and sandboxed video players (YouTube, Loom, Vimeo, Google Drive), and role-directed notification handoffs with deep links. Evidence: `apps/api/src/modules/testManagement/__tests__/testCaseIntakeAndEvidenceApiIntegration.test.ts` (17/17 pass), `packages/contracts/src/contracts.test.ts` (54/54 pass), `apps/web` (59 files, 269/269 pass, build exit 0), and clean migration verification against disposable PostgreSQL test database.

- [x] **Done** (Codex — 2026-08-24) — **QA-IMPORT-EVIDENCE-PLAN: Define the production plan for native/manual spreadsheet Test Case intake, Test Result evidence links with in-app preview, and QA–Dev–PO communication.** Published the two-path canonical intake, formal evidence-link, cross-role notification, authorization, migration, and validation plan. Product-policy decisions D1–D6 remain required before implementation. Evidence: `docs/plans/TEST_CASE_INTAKE_EVIDENCE_COMMUNICATION_PLAN.md`.

- [x] **Done** (Codex — 2026-08-24) — **DOC-E2E-ROLES: Document the approved end-to-end workflow for every Workspace role.** Published the Owner, Admin, PO, Developer, and QA handoffs from Workspace setup through release decision, including backend authority, persisted evidence, queues, and exception paths. Evidence: `docs/reports/DOC_E2E_ROLE_WORKFLOW_2026-08-24.md`.

- [x] **Done** (Codex — 2026-08-24) — **DEV-SETUP: Standardize the local development baseline.** Added reproducible Node/tooling configuration, repository-wide formatting and linting, a staged-file commit hook, and documented root verification commands. The hook does not require local database access, and CI now runs the same static validation. Evidence: `docs/reports/DEV_SETUP_STANDARDIZATION_2026-08-24.md`.

- [x] **Done** (Codex — 2026-08-24) — **DB-8.5: Reconcile Workspace membership soft-delete schema.** Applied and verified the canonical additive migrations that add `workspace_members.deleted_at`, history-preserving offboarding, release-critical task guards, and Workspace Developer specialties. The local API database now matches the active Sequelize model; validation evidence is recorded in `docs/reports/DB_8_5_WORKSPACE_MEMBER_SOFT_DELETE_SCHEMA_2026-08-24.md`.

## Explicitly deferred

- A universal polymorphic relationship table (`implements`, `tests`, `found_in`, and similar) remains deferred. Prefer explicit Workspace-scoped foreign keys/join tables until at least two verified relationships cannot be represented safely.
- Requirement/Test/Bug/Release contextual discussion remains deferred. Do not create a generic discussion seam without an explicit product task and domain-specific authorization/audit design.
