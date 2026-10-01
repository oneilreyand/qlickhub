# Approval Window V1 — Governance Plan

**Status:** Approved for bounded documentation implementation
**Task:** `APPROVAL-WINDOW-V1`
**Policy boundaries:** `AI-007`, `AI-008`, `AI-009`, `AI-010`, `AI-012`, `AI-013`, `DOC-001`, `DOC-002`, `DOC-003`, `DOC-004`
**Decision record:** [ADR-025](../adr/ADR-025-APPROVAL-WINDOWS-FOR-AGENT-WORK.md)

## Approval Window record

- **Authority:** Product owner in this conversation, 2026-10-01.
- **Baseline:** `d28559e6283d12b89f7c5c5b3a8ba468d9b07b69`.
- **Expiry:** 2026-10-01 23:59:59 Asia/Jakarta; it authorizes only the bounded sequence below and
  never authorizes publication or a high-risk action.

## Confirmed facts

- ADR-018 and the canonical Agent Guidelines require an explicit checkpoint before every
  state-changing action, though a precisely enumerated finite sequence is permitted.
- The Product approved replacing that per-mutation default with a bounded task Approval Window to
  reduce delays while preserving direct approval for irreversible or high-impact operations.
- ADR-021 already requires task, scope, baseline, expiry, and lease matching for one approved
  broker request; V2 runtime activation remains pending and is outside this task.
- The current worktree contains unrelated local changes. This task preserves them and changes only
  the files named below.

## Scope and non-goals

This is a documentation-governance change only. It introduces the canonical Approval Window rule,
its stop conditions, the registry entries, and ADR history. It does not change application code,
CI, broker runtime, repository permissions, data, database schema, migrations, user roles,
dependencies, deployment, a protected branch, or a Pull Request.

## Work Readiness Assessment

| Dimension           |      Score | Basis                                                                       |
| ------------------- | ---------: | --------------------------------------------------------------------------- |
| Requirement clarity |          0 | Product selected the bounded-approval approach.                             |
| Affected layers     |          1 | Agent-governance documents and instructions only.                           |
| Data/migration      |          0 | No application data or migration.                                           |
| Authorization       |          1 | Changes the documented human/agent approval boundary, not application RBAC. |
| Shared contract     |          0 | No runtime contract.                                                        |
| Coupling            |          2 | Applies to all future repository-changing agent tasks.                      |
| Validation          |          1 | Documentation governance and link checks.                                   |
| External dependency |          1 | Publication later needs the existing GitHub approval/PR process.            |
| **Total**           | **6 / 16** | **Ready** — every AC has a local evidence path.                             |

## Acceptance criteria and evidence

| Acceptance Criterion                                                                                                  | Objective evidence                                                                           | Minimum level | Verifier                                            |
| --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------- | --------------------------------------------------- |
| One bounded user approval can authorize routine in-scope edits, tests, commit, non-protected push, and draft PR work. | Guideline, AGENTS, map, registry, and ADR wording agree; `npm run docs:check`.               | E2            | Local gate; independent PR reviewer on publication. |
| High-impact or irreversible operations still require fresh approval.                                                  | Explicit stop-condition list in canonical guideline, registry, and ADR; documentation check. | E2            | Local gate; independent PR reviewer on publication. |
| Unknowns, scope expansion, baseline change, expiry, and insufficient evidence fail closed.                            | Canonical guideline and ADR inspection; documentation check.                                 | E2            | Local gate; independent PR reviewer on publication. |
| V1 branch protection and V2 broker controls are not weakened or activated by this change.                             | Scope-limited diff inspection; ADR-025 non-goals; documentation check.                       | E1/E2         | Local gate; independent PR reviewer on publication. |

## Change Impact Map

`user task approval` → `Approval Window validation` → `bounded agent sequence` → `evidence report`
→ `explicit high-risk decision when required`.

| Area                                               | Classification            | Intended impact                                                       |
| -------------------------------------------------- | ------------------------- | --------------------------------------------------------------------- |
| Agent workflow                                     | Cross-boundary governance | Replaces repeated routine checkpoints with one task-bounded approval. |
| V1 protected-branch enforcement                    | No behavior change        | Remains required for acceptance into `main`.                          |
| V2 broker                                          | Documentation alignment   | Remains pending; its stricter runtime checks are unchanged.           |
| Application/API/UI/data/RBAC/migrations/deployment | None                      | Explicitly out of scope.                                              |

## Decision Snapshot

| Option                                   | Decision            | Trade-off                                                            |
| ---------------------------------------- | ------------------- | -------------------------------------------------------------------- |
| Approval Window for bounded routine work | Selected            | Faster delivery; needs precise task scope and stop conditions.       |
| Checkpoint for every mutation            | Replaced as default | Maximum interaction control but unacceptable delay for routine work. |
| Open-ended Task/repository approval      | Rejected            | Faster initially, but scope and recovery become uncheckable.         |
| Autonomous merge/deploy                  | Rejected            | Would remove human authority over release and irreversible changes.  |

## Approved bounded sequence

1. Add `APPROVAL-WINDOW-V1` to `TODO.md` as in progress.
2. Update `AGENTS.md`, Product Knowledge Map, Agent Guidelines, and Policy Registry with the
   canonical Approval Window and high-risk stop conditions.
3. Add ADR-025 and its index entry.
4. Add this plan and a final evidence report; update the TODO item to `Done` only after validation.
5. Run `git diff --check` and `npm run docs:check`, inspect only this task's diff, then record the
   actual outcomes. Do not create a commit, push, Pull Request, GitHub approval record, or manifest
   requiring a GitHub approval record in this sequence.

## Files allowed to change

- `AGENTS.md`
- `TODO.md`
- `docs/0_PRODUCT_KNOWLEDGE_MAP.md`
- `docs/4_AGENT_DEV_GUIDELINES.md`
- `docs/POLICY_REGISTRY.md`
- `docs/adr/ADR-025-APPROVAL-WINDOWS-FOR-AGENT-WORK.md`
- `docs/adr/README.md`
- `docs/plans/APPROVAL_WINDOW_V1_PLAN.md`
- `docs/reports/APPROVAL_WINDOW_V1_2026-10-01.md`

## Recovery

No runtime state is changed. Revert only this task's document diff through a new approved
governance decision if the policy needs to be withdrawn. Publication, merge, or any V2 runtime
activation remains separately approved work.
