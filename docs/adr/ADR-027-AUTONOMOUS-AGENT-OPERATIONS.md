# ADR-027: Policy-Bound Autonomous Agent Operations

**Status:** Proposed  
**Date:** 2026-10-02  
**Decision owner:** Product and Engineering  
**Implementation stakeholders:** Product, Engineering, QA, repository administrators, and AI agents  
**Would supersede, upon activation ADR:** The human-approval provisions of ADR-017, ADR-018, ADR-020, ADR-021, ADR-025, and ADR-026.

## Context

The prior agent workflow required an explicit plan/Approval Window before repository changes and a
fresh human approval for protected-branch, Production, data, migration, RBAC, secret, and other
high-risk operations. The Owner is evaluating an autonomous operating model as a target state in which agent delivery
does not wait for per-operation human approval.

Removing approval without an executable replacement would create unlimited standing access and no
reliable recovery path. The decision therefore outlines replacing human approval gates with machine-verifiable
control-plane policy, independent verification, just-in-time capabilities, canary rollout, automated
recovery, and append-only audit evidence.

This ADR records the proposed target architecture; it is not yet in force and requires a separate activation ADR.

## Decision

1. Agents would autonomously plan, claim, edit, test, merge protected branches, deploy Production,
   migrate/backfill data, change RBAC, and rotate secrets once activated. A human would not approve each action.
2. Each mutation sequence has an Execution Record rather than an Approval Window. It records the
   task/event, baseline, scope, capabilities, Acceptance Criteria, evidence, limits, and recovery.
3. A separate control plane validates policy and issues short-lived, scoped capabilities. It must not
   expose secret values. Executor and verifier remain separate operational roles.
4. Production progresses through backup/recovery validation, canary, policy-defined runtime gates,
   and automatic rollout. Failed verification or monitoring triggers bounded retry, rollback,
   capability revocation, or quarantine before notification.
5. WRA, Decision Snapshot, evidence levels, independent verification, quality review, and audit are
   retained as automated quality controls. They are not human permission gates.
6. This ADR defines a proposed target architecture only. It is not currently in force. Until a separate
   activation ADR is approved by the Owner, the Approval Window ([ADR-025](ADR-025-APPROVAL-WINDOWS-FOR-AGENT-WORK.md))
   and its stop conditions remain in full effect. Runtime autonomy is not active.

## Consequences

- When activated, routine and high-risk operations will no longer wait on human approval, reducing coordination latency.
- The control plane becomes security- and reliability-critical infrastructure.
- Existing historical ADRs and reports remain factual records; their approval wording will be superseded
  only upon a formal activation ADR.
- Application Workspace roles and release-decision contracts are unchanged by this documentation
  change. A separate implementation decision is required before an application service principal or
  any runtime authorization contract changes.

## Alternatives considered

- **Proposed target: policy-bound autonomous execution.** No human action gate; system-enforced capability,
  verification, rollback, and quarantine controls preserve speed and limit blast radius.
- **Approval Window (current active policy).** Retained as the active operating model pending activation of ADR-027.
- **Permanent unrestricted super-admin agent.** Rejected because it combines autonomy with an
  unbounded credential and lacks a recoverable, auditable control boundary.

## Recovery

Until activated, the repository continues operating under ADR-025 and ADR-026. If an activation ADR is adopted in the future, a subsequent ADR may restore human approval requirements. For any runtime incident once active, the control plane revokes outstanding capabilities, rolls back the active target, preserves the audit record, and quarantines the failed execution.
