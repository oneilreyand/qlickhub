# ADR-029: Staged Feature SDLC with Visible Stage Gates

**Status:** Accepted — effective when merged with the Owner's `owner-approved` label (Tier 2)
**Date:** 2026-10-13
**Decision owner:** Product (repository Owner)
**Refines:** [ADR-017](ADR-017-AI-PLAN-APPROVAL-AND-EVIDENCE-OUTCOMES.md), [ADR-022](ADR-022-FEATURE-KNOWLEDGE-TREE.md), [ADR-026](ADR-026-CONCISE-AGENT-DELIVERY-FLOW.md)
**Policy boundary:** `SDLC-001` (new), `DOC-005`, `AI-002`, `AI-009`, `AI-014`

## Context

The current six-stage flow (ADR-026) governs how an agent obtains approval and proves its work, but it
does not require a problem statement, a solution comparison, a PRD with user flows and wireframes, or
a standard breakdown into phases and BE/FE/QA tasks before implementation. Plans have no template and
use inconsistent status values. A 2026-10-01 delivery (Leader Hub) added a migration, cross-Workspace
endpoints, and an authorization boundary without a plan, Feature Card, or ADR, and its report claimed
"no regression risk" without supporting evidence. The Owner cannot see, per step, where a feature
stands or what is being decided.

## Decision

1. Feature work follows seven stages with one gate each: 0 Problem (G0), 1 Solution options (G1),
   2 PRD (G2), 3 Breakdown (G3), 4 Build per phase, 5 Test & Review (G5), 6 Release & Close (G6).
2. Each stage produces one file in the Feature folder (`problem.md`, `solution.md`, `product.md`,
   `breakdown.md`, `phases/PHASE-NN.md`, `testing.md`, `release.md`). `README.md` holds a Stage Tracker.
   The canonical rule is [Agent Guidelines §2B](../4_AGENT_DEV_GUIDELINES.md#2b-tahap-sdlc-feature-staged-feature-sdlc).
3. The agent shows a Stage Card in chat at every gate, separating sourced facts from `unknown` items
   and stating the decision needed. A gate is never approved implicitly.
4. A phase is a vertical slice (ADR-017 retained) with WRA ≤ 8 and BE, FE, and QA tasks where the slice
   touches those layers. Approval of G3 is the Approval Window for the next phase; each later phase
   receives its own window.
5. The release record states whether a merge to `main` also deploys Production. The open conflict
   between ADR-028 Tier 1 auto-merge and the Production-deployment stop condition in `AI-013` is a
   separate Owner decision; this ADR changes neither rule.
6. Proportional paths: Quick (WRA 0–4, single layer, no contract/data/authorization/release change)
   uses the [Quick Card](../plans/QUICK_CARD_TEMPLATE.md); Standard (WRA 5–8) may abbreviate `solution.md`; Full (WRA ≥ 9 or any
   cross-role, data, authorization, or release boundary) uses every stage.
7. Relationship to ADR-026: G0–G2 are product decisions, not repository-mutation approvals. Stages
   0–2 are drafted read-only and shown as Stage Cards; the approved documents are committed inside the
   G3 Approval Window. The ADR-026 six-stage flow continues to govern each phase (stages 3–6), so no
   per-edit approval is reintroduced. On the Quick and Standard paths G0–G2 may be approved in one
   consent.
8. Existing documents are unchanged in meaning: the 33 legacy single-file cards, the folder-card
   required files and ten headings validated by `scripts/checkDocs.mjs`, historical plans and reports,
   and ADR-017's vertical-slice rule all remain valid.
9. `npm run docs:check` validates the folder structure and Stage Tracker; semantic review of gates
   remains a human or verifier responsibility.

## Consequences

- Every feature shows its current stage and links to the decision and evidence of each step.
- More documents for large features; small fixes stay light through the Quick path.
- Existing legacy cards stay valid; migration happens only when a feature is next touched.

## Alternatives considered

- **Keep the current six-stage flow only:** rejected; it does not capture problem, PRD, or breakdown.
- **Mandatory BE-then-FE phases:** rejected again for the ADR-017 reason; BE/FE split happens inside
  each vertical slice instead.
- **External PRD tool only:** rejected for now; repository files keep traceability with code and CI.

## Rollback

Revert this ADR and the corresponding SSoT/template changes; existing Feature folders remain readable.
