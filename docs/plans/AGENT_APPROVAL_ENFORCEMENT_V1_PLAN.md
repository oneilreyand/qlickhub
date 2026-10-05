# Agent Approval Enforcement V1 Plan

**Status:** Implemented — present on `main` (`9575378`); V1 enforcement merged via PR #2 (`ff9b660`) and closed 2026-09-29 (see [closure report](../reports/AGENT_APPROVAL_ENFORCEMENT_V1_CLOSURE_2026-09-29.md))
**Task:** `AGENT-APPROVAL-ENFORCEMENT-V1`
**Policy boundaries:** `AI-007`, `AI-009`, `AI-010`, `DOC-001`, `DOC-002`, `DOC-003`, `DOC-004`
**Decision record:** [ADR-020](../adr/ADR-020-VERIFIABLE-AGENT-CHANGE-APPROVAL-ENFORCEMENT.md)

## Confirmed facts

- The canonical agent protocol requires approval before repository changes and an explicit checkpoint
  for every state-changing step.
- The repository currently has an uncommitted Quality Gate Stage 1. Independent read-only checks
  passed: validator tests 7/7, documentation checks 5/5, and `git diff --check`.
- Stage 1 reported missing UI/performance evidence for the unrelated banner change but exited with
  code 0, as designed for report-only mode.
- The local Husky pre-commit hook runs `lint-staged`; the committed CI configuration has no approval
  enforcement. GitHub branch-protection configuration is unknown from this checkout.

## Work Readiness Assessment

| Dimension           |       Score | Basis                                                                                   |
| ------------------- | ----------: | --------------------------------------------------------------------------------------- |
| Requirement clarity |           1 | Outcome is clear; authorised GitHub identity and exact record format remain unresolved. |
| Affected layers     |           2 | Governance, manifest tooling, CI, and GitHub administration.                            |
| Data/migration      |           0 | V1 changes no product database or migration.                                            |
| Authorization       |           2 | Establishes a new repository-change approval boundary.                                  |
| Shared contract     |           1 | Adds a compatible manifest/approval contract.                                           |
| Coupling            |           2 | Affects all repository-changing tasks and CI consumers.                                 |
| Validation          |           2 | Requires checker tests, CI failure proof, and external settings verification.           |
| External dependency |           2 | Depends on GitHub approval and branch-protection APIs/settings.                         |
| **Total**           | **12 / 16** | **Large — Ready after split; human decision and independent verification required.**    |

Agent capability: repository inspection and local checker work are available. GitHub administrator
access, approved reviewer identity, branch-protection state, and a managed-agent write broker are
`unknown`; V1 implementation cannot claim those conditions without primary external evidence.

## Acceptance criteria and evidence

| AC                                                                                              | Objective evidence                                                          | Minimum level | Independent verifier            |
| ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------- | ------------------------------- |
| A changed source file without an externally valid approval is rejected.                         | Checker test plus intentionally invalid PR CI run with non-zero result.     | E2/E4         | CI and repository administrator |
| Approval is bound to task, plan digest, baseline, file scope, role scope, and expiry.           | Schema/validator tests for each mismatch and external record inspection.    | E2/E4         | Independent reviewer            |
| Role-specific UI work proves target and non-target role outcomes.                               | Focused role-matrix tests invoked by the approval gate.                     | E2            | Independent reviewer/CI         |
| An agent cannot merge an unapproved change to `main`.                                           | Protected-branch required-check configuration and a rejected merge attempt. | E4            | Repository administrator        |
| Existing Quality Gate Stage 1 keeps reporting quality evidence independently of approval state. | Regression tests and CI output.                                             | E2            | CI                              |
| Managed agents cannot write before approval in V2.                                              | Broker authorization/denial UAT.                                            | E4            | Deferred; separate task         |

## Change Impact Map

`external approval record` → `approval resolver` → `task-bound manifest` → `CI fail-closed check`
→ `protected branch` → `accepted merge`.

| Area                                   | Classification | Intended impact                                                                |
| -------------------------------------- | -------------- | ------------------------------------------------------------------------------ |
| Agent instructions and SSoT            | Cross-boundary | Distinguish advisory protocol from enforceable control.                        |
| Quality manifest/checker               | Module change  | Add approval scope validation without treating repository claims as authority. |
| CI workflow                            | Cross-boundary | Fail closed for invalid approval and emit auditable failure reason.            |
| GitHub configuration                   | Cross-boundary | Require approval check and prevent direct agent merge.                         |
| Application runtime/contracts/database | None in V1     | No Qlick Hub API, database, migration, or user role change.                    |
| Managed-agent write access             | Deferred V2    | Requires a separate capability-broker decision.                                |

## Decision snapshot

| Option                                               | Decision        | Reason                                                                                                   |
| ---------------------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------- |
| Instructions, reports, and local hooks only          | Rejected        | They can be ignored or bypassed and cannot protect `main`.                                               |
| GitHub approval + CI fail-closed + branch protection | Selected for V1 | Uses the existing CI host, has external auditability, and blocks acceptance without a product migration. |
| Persist approval in Qlick Hub first                  | Deferred to V2  | Would introduce application authorization/data scope before V1 proves repository enforcement.            |
| Managed write broker first                           | Deferred to V2  | Stronger prevention, but requires capability and host-administration design.                             |

## Implementation slices after separate checkpoints

1. **Contract slice:** introduce approval-manifest V2 schema and deterministic validator tests. No CI
   enforcement yet; approve the exact schema and compatibility rules first.
2. **CI slice:** resolve the external GitHub approval record, fail closed on every missing/mismatched
   condition, and produce a non-sensitive diagnostic. Requires GitHub token/permissions review.
3. **Repository-control slice:** configure required status checks, reviewer policy, dismissal on new
   commits, and no-direct-push settings. This is an external administrative mutation.
4. **Role-evidence slice:** add role-matrix enforcement for scoped UI changes and prove it against a
   representative change.
5. **V2 decision:** create a separate ADR/WRA before any managed write broker or Task Hub approval
   persistence.

## Risks and recovery

- An overly broad file matcher could accept scope expansion; tests must cover additions, renames, and
  deletions exactly.
- An unavailable GitHub API must fail closed for protected branches, while preserving a diagnostic
  and an approved recovery path for administrators.
- Incorrect branch settings can leave direct push available; runtime configuration verification is a
  release gate, not an assumption.
- Rollback changes the approval check to report-only only through an audited administrator decision;
  no history or external approval record is deleted.

## Validation plan

After each approved implementation slice: run focused checker tests, relevant documentation checks,
and `git diff --check`; record exact pass/fail/skip results. Before enabling enforcement: run an
intentional invalid-approval CI case and an authorised role-scoped UI case. Complete independent
verification from primary CI output and GitHub settings before calling V1 done.
