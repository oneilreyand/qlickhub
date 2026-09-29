# ADR-020: Verifiable Agent Change-Approval Enforcement

**Status:** Proposed
**Date:** 2026-09-29
**Decision owner:** Product
**Implementation stakeholders:** Product, Engineering, QA, repository administrators, and AI agents
**Refines:** [ADR-017](ADR-017-AI-PLAN-APPROVAL-AND-EVIDENCE-OUTCOMES.md) and [ADR-018](ADR-018-AI-STEP-APPROVAL-AND-QUALITY-REVIEW.md)

## Context

`AI-007` and `AI-009` require plan approval and explicit checkpoints before an agent changes the
repository. Those controls are currently written instructions. A repository-local instruction or
manifest cannot independently prove approval because an agent with write access can change it.

The current Quality Gate Stage 1 can discover evidence gaps, but it deliberately runs in report
mode and therefore returns success when it finds a gap. It has no external approval authority,
file-scope enforcement, role-scope assertion, or protected-branch control. This leaves a path for
an agent to make an unapproved local change and, if other controls are absent, submit or merge it.

## Proposed decision

1. V1 uses an approval record outside the agent-writable repository as its authority. The preferred
   authority is a GitHub approval tied to a task, plan digest, baseline commit, approved file scope,
   role expectations, and approved state-changing steps.
2. A checked-in manifest becomes a machine-readable claim and CI input, not proof of approval. CI
   resolves the corresponding external record and fails closed when the record is missing, stale,
   mismatched, or outside its approved scope.
3. The CI approval check becomes a required protected-branch status check. Direct push and merge by
   agent identities are disallowed; new commits invalidate prior approval unless explicitly renewed
   for the changed plan digest.
4. A role-aware change declares both target roles and non-target roles. Its validation evidence must
   prove each declared outcome; no broad UI change may be accepted as a substitute for a scoped role
   change.
5. V2, evaluated separately after V1, removes direct write access from managed agents. A broker
   grants short-lived, task-bound write capability only after the external approval checks succeed.

## Consequences

- The system can block unapproved changes from landing in `main`; a text instruction alone no longer
  constitutes acceptable evidence.
- A local agent with unrestricted filesystem access may still alter its private working tree until
  V2 exists, but it cannot produce an accepted merge through V1's protected CI path.
- Product must nominate the authorised GitHub reviewer(s) and administrators must configure branch
  protection. Those external settings cannot be proven or changed by repository source alone.
- Existing Stage 1 evidence reporting remains useful, but it is not represented as an approval
  control.

## Alternatives considered

- **Instructions and reports only:** rejected; they are advisory and cannot reliably constrain an
  external agent.
- **Repository manifest as approval proof:** rejected; the executor could write or alter it.
- **Immediate Task Hub persistence:** deferred to V2; it would add an application authorization and
  database boundary before the GitHub-enforced merge control is proven.
- **Fail CI immediately with the current Stage 1 schema:** rejected; it does not contain an external
  authority, plan digest, or approval scope and would produce a misleading enforcement claim.

## Rollout and recovery

Implementation starts with a dedicated schema and validator test suite in report-only comparison
mode, then enables fail-closed CI only after a clean baseline and administrator confirmation of
branch protection. If a false rejection occurs, the task is corrected or re-approved; the gate is
not bypassed by weakening its rules. Rollback returns the approval check to report-only mode while
preserving the audit record and keeping ordinary quality checks active.
