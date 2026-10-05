# Agent Approval Enforcement V1 Stale Manifest Matching Fix Plan

**Status:** Implemented — present on `main` (`513df3a`); fix merged via PR #3 (`866755f`) (see [report](../reports/AGENT_APPROVAL_ENFORCEMENT_V1_STALE_MANIFEST_FIX_2026-09-29.md))
**Task:** `AGENT-APPROVAL-ENFORCEMENT-V1-STALE-MANIFEST-FIX`
**Policy boundaries:** `AI-007`, `AI-009`, `AI-010`, `DOC-001`, `DOC-003`, `DOC-004`
**Related decision:** [ADR-020](../adr/ADR-020-VERIFIABLE-AGENT-CHANGE-APPROVAL-ENFORCEMENT.md)

## Confirmed facts

- V1 rejects a pull request when its externally approved baseline, plan digest, owner record, file scope, role scope, or expiry is invalid.
- The closure branch is based on `ff9b6603c6afcd49a7d8497619264b397335f0c8` and changes six documentation-only files under a valid closure approval record.
- The CI-equivalent approval command deterministically rejects that branch because `resolveGitHubApprovals` selects every version 2 manifest sharing any changed file.
- The original V1 manifest and the closure manifest both contain `TODO.md`. The historical V1 manifest is therefore selected and compared to the closure base commit, which produces a false baseline mismatch.
- CI supplies a commit SHA as `--base`; an earlier local run using the ref name `origin/main` was not an equivalent CI input and is not the root cause.

## Work Readiness Assessment

| Dimension | Score | Basis |
| --- | ---: | --- |
| Requirement clarity | 1 | A deterministic failing approval-gate reproduction identifies the incorrect selection rule. |
| Affected layers | 1 | Repository approval checker and its unit tests, plus evidence artifacts. |
| Data/migration | 0 | No application data, schema, or migration change. |
| Authorization | 2 | Corrects the repository acceptance control that protects `main`. |
| Shared contract | 1 | Preserves version 2 approval-manifest semantics while correcting manifest selection. |
| Coupling | 2 | Applies to all future version 2 approval manifests. |
| Validation | 1 | Focused regression test and CI-equivalent command provide objective evidence. |
| External dependency | 1 | GitHub approval-record lookup is required for the final verification. |
| **Total** | **9 / 16** | **Large — Ready after split.** |

This task is the bounded repair slice: it adds one regression test, changes only the manifest-selection predicate, and proves the closure branch against the same gate. Independent PR review and CI remain required.

## Acceptance criteria and evidence

| Acceptance criterion | Objective evidence | Minimum level | Independent verifier |
| --- | --- | --- | --- |
| A historical manifest sharing only `TODO.md` is not selected for a later task. | New focused unit test with two manifests and one shared file. | E2 | CI and PR reviewer |
| A current manifest whose complete file set is within the current diff remains selected and validated. | Same focused test and CI-equivalent command using GitHub approval records. | E2/E4 | CI |
| A changed file without a selected version 2 manifest remains rejected. | Existing missing-manifest regression test remains green. | E2 | CI |
| The approved closure diff passes the gate after the repair. | CI-equivalent command using commit base SHA, owner record, and token only in memory. | E2/E4 | CI |
| No runtime application, database, role, deployment, or permission behavior changes. | Exact file scope and PR diff review. | E1/E4 | Independent reviewer |

## Change Impact Map

| Area | Classification | Intended impact |
| --- | --- | --- |
| `resolveGitHubApprovals` | Cross-boundary | Select only manifests whose complete declared scope belongs to the current change set. |
| Checker tests | Module change | Lock the stale-overlap regression and preserve missing-approval rejection. |
| Plan, report, manifest | Module change | Bind the repair to external approval and record observed evidence. |
| Application runtime, API, database, migrations, user roles, deployment, GitHub permissions | None | No change. |

## Decision snapshot

| Option | Decision | Reason |
| --- | --- | --- |
| Select manifests on any changed-file overlap | Rejected | A common file such as `TODO.md` selects unrelated historical approvals and blocks valid later work. |
| Select a manifest only when all of its declared files are in the current diff | Selected | Keeps multi-manifest PR coverage possible, excludes stale broader manifests, and retains explicit unapproved-file detection. |
| Require exact equality between one manifest and the whole diff | Rejected | Would prevent valid related changes covered by more than one task-bound manifest. |
| Bypass the stale approval gap | Rejected | Would weaken the fail-closed safety boundary rather than correct its matcher. |

## Implementation slices after separate checkpoints

1. Add a failing regression test proving that a stale manifest sharing `TODO.md` is excluded while the current manifest remains selected.
2. Replace the any-overlap selection predicate with complete-scope containment and run the focused checker tests.
3. Run documentation, quality, approval, whitespace, and CI-equivalent closure checks; record actual outcomes.
4. Submit a PR, obtain independent review and required CI success, then merge only after explicit user approval.

## Risks and recovery

- A predicate that excludes a current manifest would leave changed files uncovered and must fail closed through the existing coverage check.
- A PR that combines multiple approved tasks must still select each manifest whose complete scope is present; the regression test covers this compatibility requirement.
- If CI or primary GitHub evidence disagrees with the local reproduction, leave the work blocked and do not weaken the gate. Recovery is a new approved correction, not a bypass.

## Validation plan

Run `npm run quality:test`, `npm run docs:check`, `npm run quality:check -- --base <base-sha>`, `npm run quality:approval:check -- --base <base-sha>` with CI-equivalent repository context, and `git diff --check`. Review the exact changed-file scope, CI conclusion, and independent review before closing V1.
