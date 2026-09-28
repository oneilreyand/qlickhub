# ADR-017: AI Plan Approval and Evidence Outcomes

**Status:** Accepted
**Date:** 2026-09-25
**Decision owner:** Product
**Implementation stakeholders:** Product, Engineering, QA, and AI agents
**Refines:** [ADR-016](ADR-016-VENDOR-NEUTRAL-AI-WORK-ASSURANCE.md)

## Context

ADR-016 establishes WRA, AC-to-evidence mapping, reproducible handoff, and independent
verification for AI work. It does not explicitly place human approval between the proposed plan
and a repository-changing claim/execution. The same protocol records evidence levels, but it does
not provide one explicit outcome loop that preserves successful, failed, and blocked checks with
their next action.

Without these gates, an agent can start a plausible implementation before the user has chosen its
scope or approach, and a failure can be described only as an informal narrative rather than an
auditable input to remediation, re-planning, Bug handling, or a truthful blocked state.

The user approved this refinement on 2026-09-25.

## Decision

1. Before changing repository, configuration, data, or deployment state, an AI agent analyses the
   applicable SSoT, implementation, contracts, capabilities, risks, conflicts, and evidence gaps.
2. The agent then proposes a WRA-backed plan and approach. It includes scope, AC-to-evidence
   mapping, Change Impact Map, and material Decision Snapshot where applicable.
3. The user explicitly approves the plan before the agent creates or claims a parent Task or
   changes the repository. A revision or absence of approval returns the work to planning. This
   approval is scoped and does not replace Production Apply action, authorization enforcement,
   destructive-migration approval, or release decision.
4. The approved parent Task is decomposed into independently testable vertical slices. Backend,
   Frontend, and QA subtasks are created only when a slice needs them; layer-by-layer delivery must
   not defer integration and proof until all implementation is complete.
5. Every executed check produces an evidence outcome. A successful outcome records the affected
   AC, primary command/observation, environment, result counts, achieved E0–E4 level, and scope.
   A failed or blocked outcome records the affected AC, primary failure/blocker, environment,
   reproduction where available, achieved level, and follow-up.
6. Failure is preserved. It leads to a corrective rerun, revised plan, first-class Bug where it is
   product behavior, or `Blocked` where authority/dependency/evidence is unavailable. Tests are not
   weakened, skipped, or deleted merely to produce a success outcome.

## Consequences

- Users choose the approach before repository work begins while still receiving a concise,
  proportional plan for small changes.
- Evidence packages and reports distinguish verified success from observed failure, blocked work,
  and remaining gaps.
- The protocol adds no application API, database schema, role, production-data mutation, or
  automated deployment behavior.

## Alternatives considered

- **Approve only material plans:** rejected because the user chose a consistent approval gate for
  every repository-changing task; WRA keeps small plans proportionate.
- **Create Backend then Frontend work as mandatory phases:** rejected because vertical slices make
  AC, integration, and failure evidence visible earlier.
- **Record only successful checks in reports:** rejected because a missing or suppressed failure is
  not trustworthy evidence and prevents reproducible remediation.
