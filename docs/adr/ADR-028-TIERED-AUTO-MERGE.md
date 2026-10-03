# ADR-028: Tiered Auto-Merge for Agent Pull Requests

**Status:** Accepted
**Date:** 2026-10-03
**Decision owner:** Product (repository Owner)
**Refines:** [ADR-025](ADR-025-APPROVAL-WINDOWS-FOR-AGENT-WORK.md) (protected-branch merge stop condition)
**Decides:** item 5 of [Autonomous Agent Operations §8](../5_AUTONOMOUS_AGENT_OPERATIONS.md) only; the rest of [ADR-027](ADR-027-AUTONOMOUS-AGENT-OPERATIONS.md) stays Proposed.
**Plan:** [Tiered Auto-Merge Plan](../plans/TIERED_AUTO_MERGE_PLAN.md)

## Context

ADR-025 requires fresh human approval before any merge to a protected branch. In practice every
agent pull request waited for the Owner to open GitHub and press Merge, even for documentation,
tests, or lint fixes that CI had already verified. The Owner asked to remove that manual step
because it is tiring and adds no review value for routine changes.

Some changes still need a human look: they can change the rules agents follow, weaken the checks
themselves, or affect data, authorization, secrets, dependencies, or deployment.

## Decision

1. **Tier 1 — automatic.** A pull request that touches no Tier 2 path merges automatically once the
   required checks (`verify`, `owner-gate`) pass. The agent enables auto-merge (squash) right after
   creating the pull request. No Owner action is required.
2. **Tier 2 — one label.** A pull request that touches any path listed in
   `quality/tier2-paths.txt` also needs the `owner-approved` label. The label is the Owner's fresh
   approval for that merge; once it is present and checks pass, the merge completes automatically.
3. **Approval follows the final diff.** The `owner-gate` workflow removes `owner-approved` when new
   commits are pushed, so approval always covers the code that is merged.
4. **Agents never touch the label** and never push directly to `main`. Each agent report states the
   tier and, for Tier 2, the matched files.
5. **Enforcement paths are Tier 2.** `.github/**`, `scripts/check*.mjs`, and `quality/**` are in the
   list so an automatic change cannot weaken the gate.
6. All other ADR-025 stop conditions are unchanged: Production data mutation, destructive migration
   or backfill, secret or credential changes, force-push, scope or baseline expansion, expiry, and
   material product decisions still need fresh explicit approval before the agent acts.

## Consequences

- Routine work completes without any Owner click; the Owner reads results and handles only Tier 2.
- Code quality on Tier 1 relies on CI. The `verify` job runs validation, typecheck, PostgreSQL
  migrations, the API integration suite, and the web build. Squash merges keep each change
  revertible as one commit.
- If Vercel deploys `main` to Production automatically, a Tier 1 merge is also a Production
  deployment through that existing integration. The Owner keeps this behavior unless they switch
  Production to manual promotion. Migrations and deployment configuration remain Tier 2.
- Agents currently act with the Owner's GitHub identity, so the rule "agents never touch the label"
  is enforced by policy, not by the system. A separate bot identity for agents is a follow-up task.

## Alternatives considered

- **Keep manual merge for every PR:** rejected; it is tiring and adds little for verified routine
  changes.
- **Auto-merge everything after CI:** rejected; rule, security, data, and deployment changes would
  land with no human look.
- **Required code-owner review on GitHub:** rejected for now; agents act as the Owner, and GitHub
  does not let an author approve their own pull request.

## Rollback

Revert this ADR's pull request and set branch protection on `main` back to requiring a review.
Open auto-merge requests then wait for a manual merge again. No application data or deployment
changes are involved.
