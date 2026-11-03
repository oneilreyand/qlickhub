# ADR-038 — Fullstack assignment and open claim

- **Status:** Accepted
- **Date:** 2026-11-03
- **Decision owner:** Owner, chat: “Fullstack boleh klaim FE/BE/Mobile juga; sesuaikan aturan dan service”
- **Scope:** P5g; clarifies ADR-002 Decision4 and ADR-036 assignment matching.

## Decision

A persisted Fullstack specialty supports frontend, backend, mobile and fullstack development.
Other specialties support their exact area. QA remains a separate Workspace role. This rule is
shared by normal assignment, AI candidate filtering, specialty edits and open claims, so an actor
cannot claim work that the assignment integrity check would reject. It resolves the prior conflict
between the Workflow diagram (Fullstack broad) and the exact-match implementation/ADR-002.

Only Developer/QA may self-claim matching open subtasks. A Developer must have a persisted
specialty to claim; existing unclassified manual-assignment compatibility remains transitional.
Owner/Admin/PO assign, release or reassign, with no implicit executor or QA status bypass.
Existing Owner mismatch override with recorded reason remains unchanged for manual assignment.
Claim/release/reassign carry expectedUpdatedAt, use a row lock, preserve execution status and write
actor/channel/from/to audit atomically. Concurrent/stale operations return409 without a second write.
Queue cards expose only matching open work; they do not grant access to other Task interfaces.

## Alternatives and impact

Exact matching would preserve current code but contradict the desired Fullstack capability.
Broad matching is approved and requires synchronized assignment/specialty regression tests.
No role, specialty rows or historical assignments are backfilled. Migration94 remains additive;
no additional schema is needed for this decision. Removing Fullstack later is rejected while
active work would become unsupported. Tests must prove matching/mismatching claims, concurrent
200/409, audit/rollback, queues, Fullstack assignment and membership-edit integrity on PostgreSQL.
Production migration/deploy and merge are outside this approval window.
