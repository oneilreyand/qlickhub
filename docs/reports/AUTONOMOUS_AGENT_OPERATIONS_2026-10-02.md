## Task

REVISE-AUTONOMOUS-AGENT-OPERATIONS-AS-PROPOSED

## Outcome

ADR-027 and `docs/5_AUTONOMOUS_AGENT_OPERATIONS.md` are documented as a **Proposed target state (not in force)** for Owner evaluation. The active repository governance remains strictly bound by Approval Windows ([ADR-025](file:///Users/mac/Documents/GitHub/qlikhub/docs/adr/ADR-025-APPROVAL-WINDOWS-FOR-AGENT-WORK.md)) and its canonical stop conditions. All active SSoT files (`AGENTS.md`, `docs/4_AGENT_DEV_GUIDELINES.md`, `docs/0_PRODUCT_KNOWLEDGE_MAP.md`, `docs/1_ARCHITECTURE.md`, `docs/DEPLOYMENT_AND_ENVIRONMENTS.md`, `AGENT_REPORT_TEMPLATE.md`, and `docs/POLICY_REGISTRY.md`) continue to mandate human Approval Windows and stop conditions. Policies `AI-015` through `AI-019` are marked `[Proposed — target state, not in force; ADR-027]`. The local validation scripts (`scripts/checkExecutionRecord*`) are retained as dry-run tools.

## Work assurance

- **Work Readiness Assessment:** 7/16, `Ready`. Governance and documentation revision aligning target state proposal with active Approval Window policy. No application code, runtime infrastructure, database schema, or production mutation was touched.
- **User plan approval:** User instructed revision of PR #15: ADR-027 status to Proposed, docs/5 to proposed target state (not in force), active files restored to origin/main Approval Window rules, Section 8 added to docs/5 for activation decisions, and keep dry-run tools.
- **Approval Window / high-risk decisions:** Scope strictly limited to governance and documentation files in PR #15 (`AGENTS.md`, `docs/4_AGENT_DEV_GUIDELINES.md`, `docs/5_AUTONOMOUS_AGENT_OPERATIONS.md`, `docs/POLICY_REGISTRY.md`, `docs/0_PRODUCT_KNOWLEDGE_MAP.md`, `docs/1_ARCHITECTURE.md`, `docs/DEPLOYMENT_AND_ENVIRONMENTS.md`, `AGENT_REPORT_TEMPLATE.md`, `docs/features/AI_TASK_GENERATOR_MODAL.md`, `docs/adr/ADR-027-AUTONOMOUS-AGENT-OPERATIONS.md`, `docs/adr/README.md`, and this report). No merge to main.
- **Agent capability and access:** The executor inspected and edited repository documentation, ran validation suites and policy tests in the local worktree, and prepared the PR update without touching production or credentials.
- **AC-to-evidence matrix:**

| Acceptance Criterion                                                                                                                                | Required / achieved evidence level (E0–E4) | Primary evidence and environment                                                                                        | Verification status |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ------------------- |
| ADR-027 marked Proposed, "Would supersede, upon activation ADR", and context updated to target evaluation.                                          | E1 / E1                                    | [ADR-027](../adr/ADR-027-AUTONOMOUS-AGENT-OPERATIONS.md) inspection.                                                    | Accepted            |
| docs/5 status set to "Proposed target state — not in force" with prominent alert banner.                                                            | E1 / E1                                    | [docs/5](../5_AUTONOMOUS_AGENT_OPERATIONS.md) header inspection.                                                        | Accepted            |
| docs/5 §8 specifies the 5 Owner decisions required at activation (Prod mutation, RBAC, secret rotation, destructive migrations, merge to main).     | E1 / E1                                    | [docs/5 §8](../5_AUTONOMOUS_AGENT_OPERATIONS.md#8-owner-decisions-required-at-activation) inspection.                   | Accepted            |
| Active governance files (`AGENTS.md`, `docs/4`, `docs/0`, `docs/1`, `DEPLOYMENT`, `POLICY_REGISTRY`, template) retain active Approval Window rules. | E2 / E2                                    | Git diff vs `origin/main`, `npm run docs:check` (9/9 passed).                                                           | Accepted            |
| Policy IDs `AI-015`–`AI-019` marked Proposed in registry.                                                                                           | E1 / E1                                    | [POLICY_REGISTRY.md](../POLICY_REGISTRY.md) table inspection.                                                           | Accepted            |
| Validator `scripts/checkExecutionRecord*` and tests retained as dry-run tools.                                                                      | E2 / E2                                    | `npm run agent:policy:test` (22/22 passed).                                                                             | Accepted            |
| Repository-wide validation passes without errors.                                                                                                   | E2 / E2                                    | `npm run validate` (docs:check 9/9, policy:test 22/22, lint 0 errors / 38 warnings, typecheck api/web/contracts green). | Accepted            |

- **Evidence outcomes:**
  - `npm run docs:check`: 9 passed, 0 failed, 0 skipped.
  - `npm run agent:policy:test`: 22 passed, 0 failed, 0 skipped.
  - `npm run validate`: passed (lint 0 errors, typecheck contracts/api/web passed).
- **Change Impact Map:** Pure documentation and governance refinement. Does not alter frontend, backend API, shared contracts, database migrations, application RBAC, or live infrastructure.
- **Decision Snapshot:** Retain Approval Window (ADR-025) as active repository policy. Position ADR-027 as a proposed target state requiring an explicit future activation ADR and specific Owner activation decisions.
- **Agent handoff and independent verification:** Owner semantic review on PR #15 is required.
- **Quality review:**
  - Reuse/DRY: Shared policy references across docs/0, docs/1, docs/4, and AGENTS.md link to docs/5 with explicit "(proposed target state, not in force)" disclaimers.
  - Duplicate/overlap: None. Active rules point to ADR-025; proposed target rules point to ADR-027.
  - Obsolete/unused: Reverted unilateral claims of active autonomy back to active Approval Window policy.
  - Boundary/best practice: Emphasized that dry-run results or local validator passes never constitute permission to execute mutations.

## Source of truth and impact

- **Applicable SSoT:** [Product Knowledge Map](../0_PRODUCT_KNOWLEDGE_MAP.md), [Architecture](../1_ARCHITECTURE.md), [Agent Guidelines](../4_AGENT_DEV_GUIDELINES.md), [Autonomous Agent Operations](../5_AUTONOMOUS_AGENT_OPERATIONS.md), [Deployment & Environments](../DEPLOYMENT_AND_ENVIRONMENTS.md), [Policy Registry](../POLICY_REGISTRY.md), [ADR-025](../adr/ADR-025-APPROVAL-WINDOWS-FOR-AGENT-WORK.md), and [ADR-027](../adr/ADR-027-AUTONOMOUS-AGENT-OPERATIONS.md).
- **Policy IDs:** `AI-001`, `AI-006`–`AI-014` (Active); `AI-015`–`AI-019` (Proposed); `DOC-001`–`DOC-004`.
- **Data/interface impact:** None.
- **Authorization impact:** Active Approval Window rules remain strictly in force. Autonomy is proposed only.
- **Migration risk:** None.

## Changed files

- `AGENTS.md` — restored active Approval Window and stop conditions; referenced docs/5 as proposed target state.
- `docs/4_AGENT_DEV_GUIDELINES.md` — restored active Approval Window and write-broker rules; noted docs/5 as proposed target state.
- `docs/5_AUTONOMOUS_AGENT_OPERATIONS.md` — status changed to Proposed target state (not in force); added banner warning; added §8 Owner decisions required at activation.
- `docs/adr/ADR-027-AUTONOMOUS-AGENT-OPERATIONS.md` — status changed to Proposed; "Would supersede, upon activation ADR"; context updated.
- `docs/POLICY_REGISTRY.md` — restored AI-001..AI-014 to active Approval Window text; added AI-015..AI-019 as Proposed.
- `docs/0_PRODUCT_KNOWLEDGE_MAP.md` — restored reading path table and flowchart to Approval Window; listed docs/5 as proposed target state.
- `docs/1_ARCHITECTURE.md` — restored §6.D to cited-draft/Apply boundary, noting docs/5 as proposed target.
- `docs/DEPLOYMENT_AND_ENVIRONMENTS.md` — restored explicit human release and migration approval requirements.
- `docs/features/AI_TASK_GENERATOR_MODAL.md` — restored cited-draft preview text.
- `AGENT_REPORT_TEMPLATE.md` — restored Approval Window and Human decision summary sections.
- `docs/adr/README.md` — indexed ADR-027.
- `TODO.md` — preserved `AUTONOMOUS-AGENT-OPERATIONS` and `AUTONOMOUS-CONTROL-PLANE-DRY-RUN` as In progress (pending Owner review).
- `docs/reports/AUTONOMOUS_AGENT_OPERATIONS_2026-10-02.md` — updated report to record Proposed status.

## Validation

- `npm run docs:check` — 9/9 passed, 0 failed, 0 skipped.
- `npm run agent:policy:test` — 22/22 passed, 0 failed, 0 skipped.
- `npm run validate` — clean pass across docs:check, agent:policy:test, lint, and typecheck.

## Risks or follow-up

- PR #15 must remain in Draft state for Owner review.
- Runtime autonomy is not in force. No agent may bypass Approval Windows or human gates until an activation ADR is formally approved by the Owner.

## Human decision summary

ADR-027 and `docs/5_AUTONOMOUS_AGENT_OPERATIONS.md` are positioned as a proposed target architecture. Active governance remains under ADR-025 Approval Windows. The Owner must review PR #15 and evaluate the 5 activation decisions outlined in `docs/5 §8`.

## TODO update

- `AUTONOMOUS-AGENT-OPERATIONS` remains `In progress` (Codex — 2026-10-02; pending Owner review).
- `AUTONOMOUS-CONTROL-PLANE-DRY-RUN` remains `In progress` (Codex — 2026-10-02; pending Owner review).
