# ADR-014: QA Evidence Execution and Release Assurance

**Status:** Accepted — implementation pending S1–S7
**Date:** 2026-09-15
**Decision owner:** Product
**Implementation stakeholders:** Product, Engineering, QA, and Workspace governance

## Context

The previous implementation grants Owner/Admin fallback access to Test Run/Result execution and
allows Planner management on QA Subtasks. Test Runs are reusable-Test-Case scoped rather than
Feature/QA-Subtask scoped. A Bug can transition from `resolved` to `verified` or `reopened` without
a persisted Retest Attempt that points to a new immutable Result. Result evidence is optional and
may be appended after completion, while Release Decision notifications do not deterministically
reach every QA/Developer handoff recipient.

These behaviours do not provide the required separation of duties or an evidence chain that can be
audited from an Acceptance Criterion through a release candidate. The Product direction approved on
2026-09-15 requires evidence-based QA: successful tests have directly viewable image/video evidence,
and each Bug retest remains visible in chronological history.

## Decision

1. **Normal QA execution is assignment-bound.** Only the active assignee of the relevant QA
   Subtask may author/submit Test Case drafts, execute Test Runs, finalize Results/evidence, create
   Bugs, complete the QA Subtask, perform Retest Attempts, and issue QA Sign-off for that scope.
   PO cannot execute or change QA Subtask status. Owner/Admin retain planning, oversight, and
   release governance but are not normal QA executors.
2. **Break-glass is a narrow exception.** An active Owner or Admin may approve a one-use,
   short-lived execution capability only for a named Workspace, Feature, QA Subtask/Test Cycle,
   executor, and action list. Reason, expiry, approval, use, cancellation, and recipients are
   append-only audit facts. The approver and executor are distinct for Critical-risk actions; a
   break-glass executor cannot sign-off or decide release for the same candidate.
3. **Test evidence is mandatory and sealed.** Every `passed`, `failed`, or `blocked` Result must
   contain at least one authenticated, directly previewable image/video attachment or permitted
   HTTPS evidence link. Finalization creates an immutable Evidence Manifest. Later evidence is a
   reasoned, append-only supplement and cannot silently rewrite the original proof. `skipped`
   requires a reason and never counts as passed.
4. **Test execution is Feature and candidate scoped.** New Test Runs must reference the Feature,
   QA Subtask, Test Cycle/Release Candidate, Test Case version, baseline, build/candidate
   fingerprint, and environment. A scope or candidate change supersedes the prior evidence rather
   than reusing it for a different Feature.
5. **Coverage has two levels.** Requirement coverage remains a compatibility/portfolio measure.
   Release gating uses active Acceptance Criteria in the frozen Feature baseline: each must map to
   an active Test Case version and have a latest `passed` Result in the same Test Cycle/candidate.
   An intentional exclusion is a versioned scope decision with a reason, not a hidden denominator
   change.
6. **Bug verification is a formal Retest Attempt.** Developer resolution is an append-only event.
   `verified` or `reopened` is created atomically from a new scoped immutable Result and its sealed
   evidence manifest. A Developer never closes a Bug; `skipped` cannot verify it.
7. **QA completion and release share evidence snapshots.** After migration and pilot, backend gates
   QA Subtask completion, QA Sign-off, and Release Decision against the same scoped Test Cycle,
   evidence availability, Bug retest state, AC coverage, and candidate fingerprint. Business
   overrides retain failed-gate facts but cannot bypass evidence integrity or separation of duties.
8. **Handoffs are persistently delivered.** QA/Bug/Release events write an outbox record in the
   same transaction. Recipient resolution includes the QA signer/assignee, Feature Developers,
   PO, and applicable Owner/Admin with actor exclusion and deduplication. Delivery retries do not
   duplicate an event or reverse the business mutation.
9. **Migration and rollout are additive.** Existing unscoped runs/results remain readable as legacy
   and are never fabricated into new evidence. Only deterministic relations may be backfilled.
   Rollout is per Workspace through observe, warn, then enforce after PostgreSQL validation and
   cross-role pilot evidence.

## Consequences

- ADR-001 is superseded only for Test Case/Test execution authority, Acceptance-Criterion release
  coverage, and the implemented permission matrix where it conflicts with this ADR.
- ADR-011 remains authoritative for the no-self-review QA Subtask lifecycle; this ADR further
  removes Planner normal execution and adds the prerequisite evidence gate after scoped Runs exist.
- The canonical SSoT and registry record the approved target policy. The current runtime is known
  to be transitional until S1–S7 deliver backend enforcement, contracts, migrations, UI, and tests.
- Existing Evidence Preview remains the interaction foundation, but must surface evidence state and
  a Bug timeline without copying source evidence blobs.
- Direct external media retains security controls. Attachment evidence through authenticated storage
  is preferred because an external URL can change or become unavailable.

## Alternatives considered

- **Keep Owner/Admin automatic execution fallback:** rejected; it weakens QA ownership and obscures
  emergency use.
- **Allow PO to operate QA Subtasks for expediency:** rejected; PO owns scope and release decision,
  not QA evidence creation.
- **Use latest Test Case Result globally:** rejected; a reusable Requirement/Test Case can be used
  by multiple Features and candidates.
- **Close Bug through a status patch with notes:** rejected; it cannot prove independent retest.
- **Require evidence only for failures:** rejected; a passed Result also needs auditable proof.
- **Treat Requirement mapping as sufficient release coverage:** rejected; one Test Case can mask
  uncovered Acceptance Criteria.
- **Overwrite evidence when a link changes:** rejected; it destroys auditability.
