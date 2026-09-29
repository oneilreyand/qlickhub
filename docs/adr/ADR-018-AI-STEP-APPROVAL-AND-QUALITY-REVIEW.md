# ADR-018: AI Step Approval and Evidence-Backed Quality Review

**Status:** Accepted
**Date:** 2026-09-29
**Decision owner:** Product
**Implementation stakeholders:** Product, Engineering, QA, and AI agents
**Refines:** [ADR-016](ADR-016-VENDOR-NEUTRAL-AI-WORK-ASSURANCE.md) and [ADR-017](ADR-017-AI-PLAN-APPROVAL-AND-EVIDENCE-OUTCOMES.md)

## Context

ADR-017 requires explicit approval of a repository-changing plan before execution. The Product
requested a stricter operating control: work must not advance from one state-changing action to the
next merely because a high-level plan was approved. The Product also requires a review that can
prove, rather than assume, that changed code and documentation do not duplicate existing behavior,
leave obsolete work behind, or bypass established practices.

## Decision

1. The canonical protocol in Agent & Developer Guidelines §2A requires a bounded, explicit user
   checkpoint before each state-changing execution step. The proposal states the target, mutation,
   expected evidence, risk/recovery, and unresolved facts. Only the approved step may execute.
2. Read-only inspection is permitted to establish facts and prepare the next checkpoint. It never
   constitutes implied approval, and facts that remain unknown are labelled `unknown` or
   `unverified`; they cannot be silently assumed.
3. A plan approval may approve a finite sequence only when each state-changing mutation is named.
   A changed scope, unlisted mutation, material alternative, missing primary evidence, or failed
   check returns work to a new checkpoint or to `Blocked`.
4. Before repository-changing work is called complete, an evidence-backed quality review records
   findings or a scoped, method-backed `none found` result for reuse/DRY, duplicate or overlapping
   behavior, obsolete or unused code, best-practice/boundary compliance, and regression evidence.
5. The report template preserves the step-approval log and quality-review result. The review
   complements—rather than replaces—tests, PostgreSQL evidence, QA lifecycle evidence, and
   independent verification.

## Consequences

- Human control is explicit at every mutation boundary, while read-only analysis can still produce
  fact-based questions without unnecessary delay.
- A reviewer can audit both what was approved and what was searched or tested before a completion
  claim.
- Delivery takes more interactions. This is intentional for state-changing work; a user may approve
  a clearly enumerated limited sequence to reduce checkpoints without granting open-ended authority.
- This decision changes agent governance and reporting only. It adds no product API, database
  schema, role, runtime automation, or Production mutation.

## Alternatives considered

- **One approval for the whole task:** rejected because it can conceal later scope expansion or
  unexamined assumptions.
- **Require approval for read-only inspection:** rejected because it prevents agents from gathering
  the facts needed to ask a meaningful question and does not itself mutate user state.
- **Rely on test success as the quality review:** rejected because tests alone may not expose
  duplicate paths, unused exports, obsolete documentation, or a broken ownership boundary.
