# ADR-023: Delivery-Capacity Timeline Semantics and Detail Disclosure

**Status:** Accepted
**Date:** 2026-09-30
**Decision owner:** Product and Engineering
**Policy boundary:** `AUTH-001`, `AUTH-002`, `AUTH-011`, `DATA-001`, `CONTRACT-001`, `UI-001`, `UI-002`, `TEST-001`, `DOC-001`, `DOC-003`, `DOC-004`

## Context

The original Timeline queried every Workspace membership and all Subtask statuses by default.
Consequently, Owner, Admin, and PO rows appeared as empty delivery capacity, completed work could
inflate workload counts, scheduled work outside the visible interval could look missing, and the
bar modal contained only the small projection that was required to paint the bar.

This obscures the operational question a capacity view must answer: which delivery practitioners
are available, allocated, unscheduled, or overloaded during a stated interval. It also invites a
large timeline response to become an accidental replacement for the authenticated Task detail
interface.

## Decision

1. The default Timeline is a **Delivery Capacity** view. Its rows are active Workspace members with
   delivery roles `dev` and `qa`; governance roles (`owner`, `admin`, `po`) do not appear as capacity
   rows. Delivery members without work remain visible as available capacity.
2. Capacity counts and bars default to active Subtasks only: `todo`, `in_progress`, `in_review`,
   and `changes_requested`. Terminal `done` and `canceled` work is excluded unless an explicit
   historical view is introduced and clearly labelled outside this decision.
3. A returned member summary separates scheduled work in the visible date interval, active work
   without a schedule, and active scheduled work outside that interval. No item is silently
   treated as missing.
4. The Timeline is a lightweight projection. Selecting a non-redacted bar reads the existing
   authenticated Task detail endpoint on demand, shows available Task context, and provides a
   Task Hub link. The Timeline payload does not expand into an unrestricted Task-detail feed.
5. Workspace scope remains the default. Cross-Workspace work keeps the existing `AUTH-011`
   redaction rule; a redacted bar never triggers a detail fetch that could disclose protected data.

## Consequences

- The backend is the canonical owner of delivery-role inclusion, active-status filtering, date
  categorisation, and privacy redaction. React presents the returned result and does not recreate
  workload calculations.
- A reusable date-range picker makes the visible interval explicit and testable.
- The API contract gains explicit outside-window counts; no database schema or migration changes.
- PostgreSQL integration evidence must prove role exclusion, active/terminal behaviour, interval
  categorisation, and redaction. UI evidence must prove the custom range, detail loading, and
  loading/error/empty states.

## Alternatives considered

- **Show every Workspace member by default:** rejected because governance memberships are not
  delivery capacity and empty rows hide the actual staffing signal.
- **Filter only in React:** rejected because different consumers could calculate different
  capacity, violating `DATA-001` and leaving the API misleading.
- **Return full Task descriptions for every bar:** rejected because it inflates the high-frequency
  timeline read and unnecessarily broadens data exposure. On-demand authenticated detail is safer
  and fresher.
- **Treat terminal work as active workload:** rejected because it falsely reports completed or
  canceled delivery as current capacity demand.

## Recovery

The change is additive at the response-contract level and has no migration. Rollback restores the
previous service and UI behavior in one revert; no persisted record needs repair.
