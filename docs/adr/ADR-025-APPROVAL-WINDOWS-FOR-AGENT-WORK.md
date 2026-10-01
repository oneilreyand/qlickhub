# ADR-025: Approval Windows for Bounded Agent Work

**Status:** Accepted
**Date:** 2026-10-01
**Decision owner:** Product
**Implementation stakeholders:** Product, Engineering, QA, repository administrators, and AI agents
**Refines:** [ADR-017](ADR-017-AI-PLAN-APPROVAL-AND-EVIDENCE-OUTCOMES.md), [ADR-018](ADR-018-AI-STEP-APPROVAL-AND-QUALITY-REVIEW.md), and [ADR-021](ADR-021-TASK-BOUND-AGENT-WRITE-BROKER.md)

## Context

ADR-018 deliberately required a checkpoint before every state-changing action. It protected human
control, but made routine delivery slow: one bounded coding task could require separate approvals
for a claim, each edit, each test, a commit, and a draft pull request. The Product has requested a
faster workflow without allowing unbounded or irreversible autonomous change.

ADR-021 already establishes the useful boundary: one external approval can cover a task-bound
patch and declared verification when its scope, baseline, expiry, and lease match. That principle
can govern routine agent work before the V2 broker is activated, while the broker retains its
stricter exact-file enforcement when it is available.

## Decision

1. A user may approve an **Approval Window** for one bounded routine mutation sequence. It contains
   a Task ID, baseline, objective/AC, allowed files or bounded paths, named state changes,
   validation/evidence, recovery approach, and expiry.
2. Within that window, an agent may claim the Task, edit in-scope files, run declared checks, fix
   failures that do not change the AC or scope, commit, push a non-protected branch, and create or
   update a draft Pull Request. It returns one evidence report after the sequence instead of asking
   at every micro-step.
3. The agent must stop and obtain fresh explicit approval for protected-branch merge or push,
   Production deployment/data mutation, destructive migration or backfill, authorization/RBAC/
   secret/credential/dependency change, force-push/history rewrite, an unapproved external artifact,
   scope or baseline expansion, approval expiry, or a failure that needs a material product choice.
4. Read-only inspection remains approval-free but is never implied approval. Unknown facts remain
   unresolved. A window fails closed whenever its scope, baseline, evidence, or authority no longer
   matches the work.
5. This decision changes governance only. It does not activate V2, weaken V1 protected-branch
   verification, grant direct write access to a V2-managed worktree, or authorize any application
   data, role, deployment, or release mutation.

## Consequences

- Routine work needs one clear consent rather than repeated acknowledgements, reducing interaction
  delay while retaining a clear audit boundary.
- Plans must be specific enough to make scope and recovery checkable before work begins.
- Final merge and other high-impact operations remain explicitly human-controlled.
- A task may move across AI agents without re-approval only while the same task, baseline, scope,
  expiry, and evidence contract remain valid. V2 broker activation remains a separate runtime task.

## Alternatives considered

- **Keep a checkpoint per mutation:** rejected because the Product observed needless delay for
  routine bounded work.
- **Approve an entire repository or open-ended Task:** rejected because it obscures later scope
  expansion and weakens recovery/accountability.
- **Fully autonomous merge and deployment:** rejected because release, production data, and
  protected-branch decisions require direct human authority.

## Rollback

Revert this governance decision through a new approved ADR and restore the canonical wording in
Agent Guidelines, Policy Registry, Knowledge Map, and `AGENTS.md`. V1 branch protection and any
V2 broker boundary remain active throughout rollback.
