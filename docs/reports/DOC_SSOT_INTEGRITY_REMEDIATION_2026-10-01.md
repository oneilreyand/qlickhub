## Task

`DOC-SSOT-INTEGRITY-REMEDIATION` — repair documentation source-of-truth integrity findings from
the 2026-10-01 read-only governance audit.

## Outcome

The Workload Conflict and Cross-Workspace Privacy decision is now uniquely identified as ADR-024,
with active and historical references updated. The UI SSoT now matches the `/reports` capacity
timeline and `TaskStatusBadge` statuses used at runtime. Accessibility language now sets WCAG 2.2
AA as the baseline and reserves AAA claims for verified colour pairs. `docs:check` now rejects
duplicate ADR numbers and ADR index omissions or repeats.

## Work assurance

- **Work Readiness Assessment:** 4/16, `Ready`. Requirement clarity 1 (the duplicate ADR needed a
  numbering decision); affected layers 1 (documentation and its validator); data/migration 0;
  authorization 0; shared contract 0; coupling 1 (SSoT, ADR index, and references); validation 1
  (documentation tests and lint); external dependency 0. Every AC has a local evidence path.
- **User plan approval:** approved in this task on 2026-10-01 for ADR renumbering, UI SSoT
  reconciliation, WCAG claim correction, and ADR validation.
- **Step approval log:** the user approved the bounded documentation/validator mutation, then
  separately approved creation of this report and the TODO record. `git mv` could not acquire the
  sandboxed `.git/index.lock`; filesystem `mv` completed the same rename without changing history.
- **Agent capability and access:** the executor inspected repository documentation and runtime
  source, modified workspace files, and ran local documentation/lint checks. It could not modify
  Git index metadata, run CI, inspect branch protection, or perform an independent verification.
- **AC-to-evidence matrix:**

| Acceptance Criterion                                                            | Required / achieved evidence level (E0–E4) | Primary evidence and environment                                                                                                     | Verification status                                          |
| ------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| ADR numbers are unique and every ADR appears once in the index.                 | E2 / E2                                    | `npm run docs:check`: 9/9 tests passed; governance passed, local workspace.                                                          | Local evidence complete; independent verification pending.   |
| Active and historical capacity/privacy references resolve to ADR-024.           | E1 / E1                                    | Repository search found ADR-024 references and no old workload ADR-016 path.                                                         | Local inspection complete; independent verification pending. |
| UI SSoT matches the current `/reports` page and TaskStatusBadge runtime states. | E1 / E1                                    | Inspected `ReportPage.tsx` and `TaskStatusBadge.tsx`; reconciled `docs/3_UI_ATOMIC_DESIGN_SYSTEM.md`.                                | Local inspection complete; independent verification pending. |
| Accessibility documentation does not make an unsupported universal AAA claim.   | E1 / E1                                    | Contrast ratios were calculated for the documented token pairs; SSoT now specifies WCAG 2.2 AA baseline and verified AAA pairs only. | Local inspection complete; independent verification pending. |

- **Evidence outcomes:** `npm run docs:check` succeeded with 9 passing, 0 failing, 0 skipped tests
  and governance passed. `npm run lint` exited 0 with 37 pre-existing warnings and 0 errors; the
  warnings are in unmodified API/web files. `git diff --check` found no whitespace errors.
- **Change Impact Map:** Module change limited to documentation governance: ADR identifier/index,
  documentation references, UI design SSoT, active TODO, report, and `docs:check`. No runtime
  consumer, shared contract, database, authorization, UI implementation, release gate, or
  deployment changes.
- **Decision Snapshot:** Renumber the newer capacity/privacy ADR to ADR-024 (selected) rather than
  renumbering the older AI assurance ADR-016 or adding a nonstandard suffix. This preserves existing
  ADR-016 refinement references and restores chronological, unique numbering. The compatibility
  cost is updated repository links; rollback is a revert of this documentation-only change.
- **Agent handoff and independent verification:** baseline was the worktree at task start. Local
  checks above were executed by the implementer. No independent verifier or CI run is available in
  this task, so the result is **Pending independent verification**, not self-accepted.
- **Quality review:** searched all repository references for the old workload ADR path; none remain.
  Reused the existing documentation-checker/test style rather than adding another tool. The new
  helper is imported and executed by `runDocumentationChecks`; no unused additions were found.
  No runtime duplication, obsolete production code, contract, or authorization changes were made.
- **Cross-layer quality gates:** N/A with reason. This is a documentation/validator slice; no
  frontend layout, data access, performance-critical code, or AI technology/model changed.

## Source of truth and impact

- **Applicable SSoT:** `docs/0_PRODUCT_KNOWLEDGE_MAP.md`, `docs/3_UI_ATOMIC_DESIGN_SYSTEM.md`,
  `docs/4_AGENT_DEV_GUIDELINES.md`, and `docs/POLICY_REGISTRY.md`.
- **Policy IDs:** `DOC-001`, `DOC-003`, `DOC-004`, `UI-001`, `AI-010`.
- **Data/interface impact:** None.
- **Authorization impact:** None.
- **Migration risk:** None.

## Changed files

- `AGENTS.md` — corrects the accessibility claim and points to the UI SSoT baseline.
- `TODO.md` — records this task as awaiting independent verification.
- `docs/1_ARCHITECTURE.md`, `docs/2_WORKFLOW_AND_ROLES.md`, and `docs/POLICY_REGISTRY.md` — point
  capacity/privacy policy references to ADR-024.
- `docs/3_UI_ATOMIC_DESIGN_SYSTEM.md` and `docs/4_AGENT_DEV_GUIDELINES.md` — reconcile runtime UI
  facts and set the WCAG 2.2 AA baseline.
- `docs/adr/ADR-024-WORKLOAD-CONFLICT-AND-CROSS-WORKSPACE-PRIVACY-BOUNDARY.md` and
  `docs/adr/README.md` — provide the unique ADR record and index entry.
- `docs/features/WORKLOAD_CONFLICT_AND_TEAM_TIMELINE.md` and
  `docs/reports/WORKLOAD_CONFLICT_AND_TEAM_TIMELINE_2026-09-25.md` — retain accurate current and
  historical references.
- `scripts/checkDocs.mjs` and `scripts/checkDocs.test.mjs` — enforce and test ADR uniqueness/index
  coverage.

## Validation

- `npm run docs:check` — passed: 9/9 tests, 0 failed, 0 skipped; documentation governance passed.
- `npm run lint` — exited 0: 0 errors, 37 existing warnings in unmodified API/web files.
- `git diff --check` — passed with no whitespace error.

## Risks or follow-up

- CI/independent verification has not yet reviewed this exact diff; the TODO stays `In progress`.
- This slice deliberately does not implement the audit's separate CI test, DevSecOps, supply-chain,
  SLO/incident, backup-restore, or retention-policy recommendations.

## Human decision summary

The documentation defects identified by the audit are repaired locally and guarded against the same
ADR-number/index regression. No product behavior changed. A reviewer should inspect the diff and
rerun `npm run docs:check` before accepting the task and changing the TODO status to `Done`.

## TODO update

- `DOC-SSOT-INTEGRITY-REMEDIATION` → `In progress`, awaiting independent verification.
