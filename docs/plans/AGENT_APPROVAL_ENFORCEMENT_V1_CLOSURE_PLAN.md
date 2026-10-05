# Agent Approval Enforcement V1 Closure Plan

**Status:** Implemented — present on `main` (`957c064`); V1 closed 2026-09-29 (see [closure report](../reports/AGENT_APPROVAL_ENFORCEMENT_V1_CLOSURE_2026-09-29.md))
**Task:** `AGENT-APPROVAL-ENFORCEMENT-V1-CLOSURE`
**Policy boundaries:** `AI-007`, `AI-009`, `AI-010`, `DOC-001`, `DOC-002`, `DOC-003`, `DOC-004`
**Decision record:** [ADR-020](../adr/ADR-020-VERIFIABLE-AGENT-CHANGE-APPROVAL-ENFORCEMENT.md)

## Confirmed facts

- Pull request #2 merged V1 to `main` at `ff9b6603c6afcd49a7d8497619264b397335f0c8`.
- The GitHub `verify` workflow passed for the final PR head and an independent reviewer approved the pull request before merge.
- V1 checks an external GitHub approval record, its plan digest, exact file scope, role scope, expiry, and approved state-changing scope before accepting a pull request.
- V1 does not prevent private local working-tree edits; its enforced boundary is acceptance into protected `main`.
- ADR-020, the original implementation plan, and TODO still describe implementation as proposed or in progress; this closure task reconciles those records with observed merge evidence.

## Work Readiness Assessment

| Dimension | Score | Basis |
| --- | ---: | --- |
| Requirement clarity | 1 | Closure outcome and evidence sources are specific. |
| Affected layers | 1 | Governance documentation, task status, report, and approval manifest only. |
| Data/migration | 0 | No runtime data, schema, or migration changes. |
| Authorization | 1 | Documents an already-active repository acceptance boundary; no permission setting changes. |
| Shared contract | 0 | No API or manifest-schema contract change. |
| Coupling | 1 | Records status for the repository-wide gate. |
| Validation | 1 | Documentation and approval-validator checks have objective paths. |
| External dependency | 1 | Requires GitHub approval record, PR review, and CI evidence inspection. |
| **Total** | **6 / 16** | **Medium — Ready.** |

Agent capability: the executor can create a clean worktree from the merged baseline, inspect repository and GitHub primary evidence, and run documentation and approval checks. A GitHub owner approval record and independent PR review remain required before completion.

## Acceptance criteria and evidence

| Acceptance criterion | Objective evidence | Minimum level | Independent verifier |
| --- | --- | --- | --- |
| ADR-020 records the decision as accepted without changing its policy content. | Diff plus merged PR, CI, and review records. | E1/E4 | Independent reviewer and CI |
| TODO marks V1 Done only with a linked evidence report. | Diff and documentation check. | E2 | CI |
| The report names actual merge, CI, review, validation, and any remaining V2 gap. | Primary GitHub records and executed local checks. | E2/E4 | Independent reviewer |
| The closure manifest has a valid external approval bound to this plan and its exact file scope. | Approval-validator output and GitHub approval record. | E2/E4 | CI |
| Unrelated local banner and Stage 1 changes are excluded. | Clean worktree baseline and PR file list. | E2/E4 | Independent reviewer |

## Change Impact Map

| Area | Classification | Intended impact |
| --- | --- | --- |
| ADR-020 and ADR index | Module change | Align decision status and index label with completed V1 rollout. |
| TODO and closure plan/report | Module change | Close the tracked task with reproducible evidence. |
| Closure manifest | Cross-boundary | Bind this documentation-only PR to an external approval record. |
| Application runtime, API, database, migrations, user roles, deployment | None | No change. |

## Decision snapshot

| Option | Decision | Reason |
| --- | --- | --- |
| Keep ADR-020 and TODO as proposed/in progress | Rejected | Conflicts with observed merge, CI, and independent review evidence. |
| Mark ADR-020 accepted and close V1 with an evidence report | Selected | Accurately records the completed V1 boundary and its limits. |
| Claim V2 prevents local writes | Rejected | V2 has not been designed or implemented; the report must preserve this gap. |

## Implementation slices after separate checkpoints

1. Create the documentation-only closure artifacts in a clean worktree after this task-bound external approval exists.
2. Run documentation, manifest quality, approval, and diff checks; write the actual outcomes into the report.
3. Submit a PR, obtain independent review and required CI success, then merge only after explicit user approval.

## Risks and recovery

- The approval record must exactly match this plan digest and all six changed files; any mismatch fails closed and requires a renewed approval.
- Documentation must not overclaim V2 or local-write prevention. If primary merge/CI/review evidence is unavailable, leave the task In progress or Blocked instead of marking it Done.
- Recovery is a corrective documentation PR with a new approval; no repository policy or GitHub permission setting is changed by this closure task.

## Validation plan

Run `npm run docs:check`, `npm run quality:check -- --base origin/main`, `npm run quality:approval:check -- --base origin/main`, and `git diff --check`. Verify PR changed files against the approved scope, GitHub CI conclusion, and independent review before marking the task Done.
