# ADR-015: QA Direct Test Case Activation

**Status:** Accepted
**Date:** 2026-09-18
**Decision owner:** Product
**Implementation stakeholders:** Product, Engineering, and QA

## Context

QA must currently save a Test Case as `draft`, submit it to `in_review`, then wait for a PO, Admin,
or Owner to make it `active`. This adds a handoff that is neither a Test Run review nor a release
decision. It makes a QA assignee wait before starting an otherwise ready test cycle and obscures
the actual execution flow.

The product direction approved on 2026-09-18 is to reduce this delay while preserving release
governance, immutable Test Case versions, QA assignment scope, and a clear PO intervention path.

## Decision

1. The active assignee of a QA Subtask may activate a `draft` Test Case directly when every linked
   Requirement belongs to the same root Feature as that assigned QA Subtask. The backend, not the
   UI, must prove this scope before accepting `draft → active`.
2. `in_review` remains an optional consultation state. A QA assignee may request it when a Product
   review is useful; PO, Admin, or Owner may return it to `draft` or activate it. It is not a
   prerequisite for normal QA execution.
3. PO keeps governance rather than execution ownership: PO may request a revision from `active`
   back to `draft`, may archive a Test Case, and receives a persistent notification when QA
   activates a Test Case in the Feature. An active Test Case returned to draft cannot start a new
   Run; existing Runs retain their immutable Test Case version.
4. QA may modify definitions only while the Test Case is `draft`. A direct activation seals the
   latest immutable version exactly as an existing planner activation does. It does not change QA
   completion, QA Sign-off, Bug verification, or PO release-decision authority.
5. Legacy Test Cases without a deterministically provable Feature/QA-Subtask scope remain readable.
   QA cannot directly activate them until their scope is made explicit; no inferred or fabricated
   scope is permitted.

## Consequences

- The standard path becomes **buat Test Case → aktifkan → jalankan**, without a PO approval wait.
- The API needs a scope check and an auditable activation event. Notification delivery uses the
  persistent QA cross-role outbox rather than a browser-only message.
- The lifecycle gains `active → draft` for a PO/Admin/Owner revision request; no schema migration is
  required because the status enum already contains both values.
- The QA UI must present one clear activation action and a visible reason/remediation state when
  Feature/QA-subtask scope is unavailable.
- This supersedes the Test Case publication part of ADR-014 and QA-001 only; ADR-014 remains the
  authority for assignment-bound execution, evidence, retest, QA completion, and release gates.

## Alternatives considered

- **Keep mandatory PO activation:** rejected because it adds an avoidable wait before QA can execute
  a prepared Test Case.
- **Let any QA member activate any Workspace Test Case:** rejected because it bypasses the assigned
  Feature/QA-Subtask boundary.
- **Activate silently when a draft is saved:** rejected because the user must intentionally seal a
  version and understand that it becomes runnable.
- **Let PO edit an active Test Case directly:** rejected because Test Case definitions remain QA
  owned and revisions must preserve historic execution evidence.
