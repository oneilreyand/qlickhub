# ADR-032: Automatic Readiness Baseline and Simplified QA Test Case Lifecycle

**Status:** Accepted
**Date:** 2026-10-13
**Decision owner:** Product (Owner)
**Implementation stakeholders:** Product, Engineering, and QA

## Context

QA could not start testing a Feature that a Planner had not fully prepared. Activating a Test Case
returned 403 when Feature/QA-Subtask scope could not be proven, starting a QA test cycle returned 409
when no readiness baseline existed, and only owner/admin/po could create that baseline after both
Development and QA readiness reviews were ready. Test Cases could not be deleted, and QA could change
a definition only while it was `draft`.

On 2026-10-12 the Owner decided K1 (readiness baseline becomes automatic) and D1–D5 (QA Test Case
lifecycle). The code was implemented on branch `feat/qa-desk-backend-b1` without ADR or SSoT updates.
This ADR records those decisions, accepted by the Owner on 2026-10-13 together with D6 (backfill
attribution) and D7 (automatic baseline attribution). Evidence and options: `docs/features/QA-DESK-SIMPLIFY/`.

## Decision

1. **Automatic baseline (K1, refines ADR-013 #1).** A root Feature receives a readiness baseline
   automatically when its Product Brief is approved, at least one active Requirement is linked to the
   Feature or its Subtasks, no linked Requirement is inactive, and every active Requirement has at
   least one active Acceptance Criterion. Development and QA readiness reviews remain recordable and
   are linked to the baseline when present, but they no longer block baseline creation. A Planner may
   still establish a baseline manually under the same content conditions. The baseline is a system
   consequence; `established_by` records the actor whose action triggered it and the activity event
   carries `autoEstablished: true`.
2. **Backfill (ADR-013 #6 still applies).** Existing Features that meet the conditions in #1 may be
   backfilled once, in `observation` mode, marked `backfilled: true`. `established_by` must be the
   user recorded by a persisted `product_brief_approved` event (or `product_brief_created` with status
   `approved`) for that Brief who is still a workspace member row. A Feature without that event is not
   backfilled; no fallback identity is inferred.
3. **Auto-active Test Case (D1, D4; supersedes the "activate silently" rejection in ADR-015).** A
   Test Case created by the QA assignee from their own QA Subtask (proven scope per ADR-015 #1) is
   created `active`. If scope cannot be proven, creation is rejected with a message naming the missing
   condition. `in_review` remains an optional, non-blocking consultation; PO, Admin, or Owner keep
   `active → draft` (revision request) and archive.
4. **Deletion (D2).** The QA creator, or PO/Admin/Owner, may hard-delete a Test Case that has never
   had a Test Run. Deletion removes its versions and links in one transaction and is recorded in the
   activity log. A Test Case with any Run cannot be deleted (409) and must be archived.
5. **Editing an active Test Case (D5; refines ADR-015 #4).** QA in proven scope may edit an `active`
   Test Case. If its latest version has no Test Run, the definition is updated in place and the
   original author/publisher stay unchanged; otherwise a new revision is created. The database
   trigger `validate_test_case_version_update` enforces that only definitions of never-executed active
   versions can change.
6. **Gate invalidation.** QA completion requires the latest Run of each scoped Test Case to be
   executed against its latest active version; a newer revision makes the older result insufficient
   (`scoped_result_missing`).

## Consequences

- FLOW-005, QA-001, docs/1 "Baseline Kesiapan Feature", and docs/2 §2/§5 must state the new rules.
- Migration `20261012000087` (backfill) and `20261013000088` (trigger) must run on Production before
  the code is merged, because merge to `main` deploys Production automatically (Owner decision,
  2026-10-13). Both are stop conditions under AI-013.
- The backfill `down()` keeps baselines already referenced by `qa_test_cycles`; rollback is partial
  by design.
- Release governance (QA sign-off, PO release decision, RELEASE-002/003/004) is unchanged.

## Alternatives considered

- **Keep manual PO baseline (D3 original recommendation):** rejected by K1 because QA would still
  wait on an administrative step.
- **Backfill with fallback identity (document owner or reporter):** rejected; it infers a person who
  did not act (ADR-013 #6) and can violate the workspace-member foreign key.
- **Allow deletion of executed Test Cases:** rejected; execution evidence must remain auditable.
- **Always create a new revision on edit:** rejected for never-executed versions; it adds revisions
  with no evidence value.
