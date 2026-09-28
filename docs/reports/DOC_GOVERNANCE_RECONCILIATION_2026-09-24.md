## Task

DOC-GOVERNANCE-RECONCILIATION: reconcile audited documentation conflicts, clarify historical
documents, and remove confirmed obsolete documentation.

## Outcome

The active documentation now has one readable route from human orientation to SSoT, plans, ADRs,
and reports. The task lifecycle consistently begins with work preflight; automated-check scope is
stated accurately; AI policy links to its ADR; and historical documents no longer present themselves
as active policy. Three confirmed obsolete, unreferenced documents were removed.

## Work assurance

- **Work Readiness Assessment:** 5/16, `Ready`; scope and files were known from the documentation
  audit, with no data, authorization, API, migration, deployment, or external dependency impact.
- **Agent capability and access:** The executor could inspect documentation, repository references,
  current package facts, and run local documentation validation. It could not obtain a fresh,
  independent semantic review of the final patch in this task.
- **AC-to-evidence matrix:**

| Acceptance Criterion                                                | Required / achieved evidence level (E0–E4) | Primary evidence and environment                                                                                         | Verification status |
| ------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ | ------------------- |
| Remove only docs proven obsolete and unreferenced.                  | E1 / E2                                    | Repository reference search plus removal of the F0 prompt, obsolete frontend-test proposal, and stale cleanup inventory. | Accepted with gaps  |
| Reconcile active lifecycle, policy references, and status metadata. | E1 / E2                                    | `AGENTS.md`, Agent Guidelines, Policy Registry, ADR-016, and route indexes.                                              | Accepted with gaps  |
| Make human and historical documentation paths understandable.       | E1 / E2                                    | Knowledge Map quick start and ADR/plans/reports indexes; superseded UI redirect and recovery-runbook status.             | Accepted with gaps  |

- **Change Impact Map:** `Cross-boundary` documentation-governance change affecting human readers,
  AI agents, plans, reports, and policy navigation. No application function/module, API, data,
  authorization, UI runtime, release, operations, or deployment behavior changed.
- **Decision Snapshot:** Delete only evidence-confirmed stale/orphan documents; preserve historical
  decisions and recovery knowledge with explicit status/indexing. This avoids false active guidance
  while retaining traceability. The cost is a small set of index/redirect documents. No compatibility
  migration or rollback is needed; the deleted files are recoverable from Git history.
- **Agent handoff and independent verification:** Base commit `1bba0d9`; executor Codex. The
  original audit was independently surveyed on standards/spec axes, while this final reconciliation
  has only structural verification in this task. Result: `Accepted with gaps` pending a fresh
  independent semantic review if a fully accepted assurance packet is required.

## Source of truth and impact

- **Applicable SSoT:** `AGENTS.md`, `docs/0_PRODUCT_KNOWLEDGE_MAP.md`,
  `docs/4_AGENT_DEV_GUIDELINES.md`, and `docs/POLICY_REGISTRY.md`.
- **Policy IDs:** `AI-002`, `AI-004`, `DOC-001`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** None.
- **Authorization impact:** None.
- **Migration risk:** None.

## Changed files

- Active governance/navigation documents — reconciled lifecycle, check scope, policy/ADR route, and
  human/historical reading paths.
- `docs/adr/README.md`, `docs/plans/README.md`, `docs/reports/README.md` — added route indexes.
- `AGENT_TASK_PROMPT.md`, `docs/plans/FRONTEND_CRITICAL_PATH_TESTING_PROPOSAL.md`, and
  `docs/inventory/CLEANUP_INVENTORY.md` — removed as confirmed stale/unreferenced documents.

## Validation

- `npm run docs:check` — passed: 5/5 tests passed, 0 failed, 0 skipped; Documentation governance
  passed in the local working tree.
- `git diff --check` — passed with no whitespace errors.
- Target and reference check — passed: the three deleted documents are absent and no active Markdown
  reference remains outside historical reports.
- Known gap: a fresh independent semantic review of the final patch was unavailable.

## Risks or follow-up

- The structural checker intentionally does not validate historical reports, TODO entries, ADRs, or
  fragment anchors; its actual scope is now documented accurately.
- A verifier should freeze the uncommitted bundle before returning a fully `Accepted` result.

## Human decision summary

Current guidance is clearer without deleting decision history. The only assurance limitation is the
absence of a fresh independent semantic review of this final reconciliation; no product, code, or
data decision needs human approval.

## TODO update

- `DOC-GOVERNANCE-RECONCILIATION` → `Done`; structural validation is complete and the independent
  semantic-review limitation is explicitly retained as a known gap.
