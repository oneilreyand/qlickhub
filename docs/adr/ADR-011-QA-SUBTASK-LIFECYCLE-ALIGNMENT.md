# ADR-011: QA Subtask Uses an Execution Lifecycle Without Self-review

**Status:** Accepted
**Date:** 2026-09-10
**Decision owners:** Product and Engineering

## Context

Qlick Hub assigns QA work through a QA Subtask under a root Feature. The backend already allowed an
assigned QA member to move that Subtask directly from `in_progress` to `done`, while the QA UI sent
it to `in_review` and then asked QA to approve its own work. That UI path was rejected by backend
policy and also confused QA execution completion with QA Sign-off and the PO release decision.

The Test Case SSoT also permits a planner to return an `in_review` Test Case to `draft`, but the
backend transition map did not permit that revision path.

## Decision

1. The root Feature / Story remains the cross-role delivery container. QA execution ownership is
   assigned through one or more direct QA Subtasks with `deliveryArea: qa`.
2. The assigned QA member executes a QA Subtask through `todo → in_progress → done`. A new QA
   Subtask does not use `in_review`, because that would introduce self-review without adding an
   independent quality decision.
3. The assigned QA member may reopen `done → in_progress` only with a non-empty reason recorded in
   the existing Task activity path.
4. Existing QA Subtasks already in `in_review` may transition to `in_progress` or `done` as a legacy
   recovery path. An unassigned QA member cannot use the generic Development review flow to take
   over a QA Subtask assigned to someone else.
5. `done` on a QA Subtask means the assigned execution work is complete. It is not QA Sign-off and
   does not approve release. QA Sign-off and PO release decision remain separate persisted records.
6. Planner roles may return a Test Case from `in_review` to `draft` for revision, matching the
   canonical Test Case lifecycle.
7. This decision does not yet add an evidence gate to QA Subtask completion. The current Test Run
   contract lacks an explicit Feature scope, so such a gate could select a reusable Test Case run
   from a different Feature. Feature-scoped Test Runs must be delivered first.

## Consequences

- The QA workspace no longer presents a backend-invalid “Submit for Review” action.
- QA execution, QA Sign-off, and release decision have distinct meanings and owners.
- Reopening completed QA work requires an auditable explanation.
- Legacy QA Subtasks can leave `in_review` without manual database changes.
- A later schema and contract slice must scope Test Runs to the Feature and QA Subtask before QA
  completion can be evidence-gated safely.

## Alternatives considered

- **Assign QA directly to the root Feature:** rejected because the Feature coordinates multiple
  delivery areas and should not imply ownership by one executor.
- **Require a second QA reviewer for every QA Subtask:** rejected for the current workflow because
  independent release governance already exists through QA Sign-off and the PO release decision.
  A later explicit segregation-of-duties requirement may introduce a separate reviewer role.
- **Gate QA completion using the latest reusable Test Case run now:** rejected because a run can be
  selected from another Feature until Test Run scope is made explicit.
