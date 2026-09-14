# ADR-013: SDLC Readiness, Triage, Review Round, and Legacy Governance

**Status:** Accepted
**Date:** 2026-09-13
**Decision owner:** Product
**Implementation stakeholders:** Product, Engineering, and QA

## Context

Qlick Hub already persists Workspace Requirements, Development and QA Subtask lifecycle, immutable
Test Results, Bugs, QA Sign-offs, and PO Release Decisions. It does not yet persist a Feature-specific
Requirement baseline, pre-code Requirement findings, structured review rounds, agreed root-cause
classification, Feature-scoped Test Runs, or release/deployment candidates.

The read-only P0 audit found only one Production Feature and one Development Subtask, with no status
transition, QA execution, Bug, sign-off, or release-decision history. Three active Requirements are
linked, but only one has an active Acceptance Criterion. Historical Product/Dev/QA quality metrics
therefore have no valid denominator. Backfilling unobserved reviewer, cause, baseline, build, or
deployment facts would create false evidence and unfair team attribution.

Before P1/P2 can define contracts or persistence, ownership of readiness, finding classification,
review-round counting, and legacy treatment must be stable. The decision recommendations were
accepted by the user through the instruction to continue on 2026-09-13.

## Decision

1. The Planner responsible for a root Feature establishes its **Siap Dikerjakan** baseline after
   Development and QA input has been recorded. Requirement status `active` does not itself mean the
   Feature is ready to start.
2. An unresolved critical finding blocks new work against that baseline. An active Workspace Owner
   or Admin may approve an emergency exception only with a reason, expiry, affected scope, and
   append-only audit event. The exception does not erase the finding or claim completeness.
3. A finding reporter proposes root-cause classification. Product, Engineering, and QA perform
   cross-role triage; `shared` and `unknown` are valid outcomes. If agreement cannot be reached, an
   active Owner or Admin records the process classification while all dissenting views remain in
   history. Classification is not an employee score.
4. A review round belongs to one Development Subtask, one review type, and the applicable baseline.
   Technical review and QA review are distinct. A returned outcome counts once for that round; the
   parent Feature is not counted again.
5. A material baseline or scope change during review closes the old round as superseded with a
   reason. It is not automatically a Development failure. A subsequent handoff starts a new round
   against the new baseline.
6. Historical values are backfilled only when deterministic persisted evidence proves them. Missing
   baseline, reviewer, cause, build, candidate, or deployment identity remains `unverified` or
   `unavailable`; it is never inferred from current state or free text.
7. New capture starts in pilot/observation mode for new Features. Work already in progress receives
   an explicit remediation path. Enforcement is enabled only after Product, Engineering, and QA
   review data completeness; exact duration, sample threshold, individual access, and retention are
   separate K4/K9 decisions.
8. Every quality metric must expose its period/cohort, definition version, denominator or sample
   size, exclusions, and data-completeness state. A zero denominator produces `unavailable`, not zero.

## Consequences

- P1 can add Feature-specific baseline and Requirement-finding records without changing Workspace
  Requirement ownership or treating `active` as readiness.
- P2 can add append-only review-round events that distinguish technical feedback, QA returns, and
  superseded scope.
- Product, Developer, and QA quality reporting cannot rank people from current Production data.
- New granular actions require backend authorization; UI visibility alone cannot grant them.
- Legacy work remains usable but cannot satisfy a new evidence gate until remediated.
- Task/Requirement deletion guards must be extended before new baseline, finding, or round references
  are introduced.
- This ADR establishes policy only. It does not activate a workflow, API, schema, migration, UI, or
  Production change.

## Alternatives considered

- **Treat `Requirement.active` as ready:** rejected because status describes the reusable
  Requirement definition, not agreement on a Feature-specific baseline.
- **Let Product classify all causes:** rejected because it creates one-sided attribution and hides
  shared/systemic causes.
- **Count every `changes_requested` status on the parent and Subtask:** rejected because it double
  counts work and cannot separate technical from QA review.
- **Treat scope change as failed coding:** rejected because the tested agreement changed after the
  work started.
- **Infer old data from current fields or notes:** rejected because mutable current state and free
  text cannot prove historical facts.
- **Enable hard gates immediately:** rejected because Production has no valid historical sample and
  active work lacks the required records.
