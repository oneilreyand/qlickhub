# ADR-026: Concise Agent Delivery Flow

**Status:** Accepted — published via PR #11 (merge `28d4990`)
**Date:** 2026-10-01
**Decision owner:** Product
**Refines:** [ADR-017](ADR-017-AI-PLAN-APPROVAL-AND-EVIDENCE-OUTCOMES.md) and [ADR-025](ADR-025-APPROVAL-WINDOWS-FOR-AGENT-WORK.md)

## Context

The Product requested fewer questions, approvals, repeated explanations, and token-heavy delivery
steps. Approval Window already permits bounded routine work, but active diagrams and the report
template still suggest per-step approval. Separate plan and window approvals add unnecessary delay.

## Decision

Use one six-stage operational flow, defined in [Agent Guidelines §2](../4_AGENT_DEV_GUIDELINES.md#flow-ringkas-enam-tahap).
Present a concise plan, draft task, and Approval Window together for one consent. Continue through
implementation, relevant checks, same-scope fixes, documentation, and reporting within that consent.
Ask only for unresolved material choices or existing stop conditions; routine implementation choices
follow confirmed SSoT. Keep one task identity and primary evidence across agent handoffs.

Documentation evolves with the implementation in the same change. Checks follow the affected scope;
structural documentation checks and semantic review remain distinct. The concise human result links
to detailed evidence rather than repeating it. Merge/release and applicable post-integration checks
remain tracked until the task's acceptance criteria are met.

## Alternatives and consequences

- Selected: one bounded approval with concise communication and reusable evidence. Reduces delay;
  requires a clear scope, task record, and honest gaps.
- Rejected: separate approvals for plan, task claim, each edit, test, and report. Adds interaction
  without improving the existing scope boundary.
- Rejected: remove review or evidence. Saves tokens at the expense of verifiability and continuity.

Existing high-risk stop conditions, V1 external approval checks, V2 broker requirements, and the
application's cited-draft/Apply and release rules are retained. This decision does not activate a
broker or change GitHub permissions. Historical ADRs and reports remain historical records.

## Recovery

Revise the canonical flow through a new decision if needed. No application or database rollback
is needed for this documentation change.
