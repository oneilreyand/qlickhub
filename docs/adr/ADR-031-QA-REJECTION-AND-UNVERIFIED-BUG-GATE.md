# ADR-031: QA Rejection While Gates Fail and an All-Severity Bug Gate

**Status:** Accepted — effective when merged with the Owner's `owner-approved` label (Tier 2)
**Date:** 2026-10-13
**Decision owner:** Product (repository Owner)
**Refines:** [ADR-014](ADR-014-QA-EVIDENCE-EXECUTION-AND-RELEASE-ASSURANCE.md)
**Policy boundary:** `RELEASE-001`, `RELEASE-002`, `RELEASE-003`, `QA-004`
**Feature:** [RELEASE-DEADLOCK-A1-A2](../features/RELEASE-DEADLOCK-A1-A2/README.md)

## Context

Workflow §7 lets QA reject when quality is not acceptable, but the implementation evaluated the full
evidence gate and required a completed QA Subtask before reading the decision. A rejection was
therefore only possible when every gate already passed, and a Feature with failing tests or open
Bugs had no recorded way back to Delivery. The Owner also decided (K2, 2026-10-12, product audit)
that Bugs of every severity block QA completion and sign-off, while the PO readiness gate counted
only Critical/High Bugs.

## Decision

1. **D1.** The QA assignee who owns an active Test Cycle may record a `rejected` QA Sign-off while
   the QA Subtask is `in_progress` or `done`. Notes explaining the blocker are mandatory. The QA
   Subtask status is not changed. The readiness snapshot keeps every failed gate code.
2. An `approved` QA Sign-off still requires a completed QA Subtask and a passing evidence gate.
3. **D2.** A `rejected` Release Decision does not run the evidence gate. An `approved` Release
   Decision, including an override of a rejected sign-off, must pass the evidence gate; business
   override never bypasses evidence integrity (`RELEASE-003`).
4. **D3.** New readiness snapshots evaluate the gate `unverified_bugs`: every linked Bug that is
   not `verified`, of any severity. The code `critical_high_bugs` stays in the contract so that
   existing snapshots remain readable; it is no longer produced for new snapshots. Implemented in
   phase 2 of the Feature.

## Consequences

- QA can always return a failing Feature to Delivery with an auditable record.
- The PO readiness view and the QA completion gate apply the same Bug rule.
- Separation of duties and authorization are unchanged.

## Alternatives considered

- **Separate "block release" endpoint:** rejected; it adds a contract, table, and UI for a path the
  existing sign-off record already represents.
- **Reinterpret `critical_high_bugs`:** rejected; it would silently change the meaning of stored
  snapshots.

## Rollback

Revert the implementing pull requests; stored sign-offs and decisions stay valid because no schema
changed.
