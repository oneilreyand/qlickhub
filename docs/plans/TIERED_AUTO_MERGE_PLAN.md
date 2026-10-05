# Tiered Auto-Merge Plan

**Status:** Approved by Owner 2026-10-03 (D1, D2, D4 as recommended; D3 confirmed: Vercel deploys `main` to Production automatically; kept as-is) — implementation in review
**Task:** `TIERED-AUTO-MERGE`
**Policy boundaries:** `AI-013`, `AI-014`, `DOC-002`, `DOC-004`
**Baseline:** `origin/main` `3b27715` (2026-10-03)
**Decision record (to be created):** ADR-028 — Tiered auto-merge for agent pull requests

## Goal

Remove the manual pull-request merge step for routine, low-risk work so the Owner only gives a
task and reads the result. Keep one lightweight Owner signal (a label, not a manual merge) for
changes that can alter agent rules, security, data, or deployment.

## Confirmed facts

- `AI-013` and Agent Guidelines §2A.A.1 require fresh approval before any merge to a protected
  branch. Every agent PR therefore waits for a manual Owner merge today.
- CI job `verify` (`.github/workflows/ci.yml`) runs `npm run validate`, quality report, typecheck,
  PostgreSQL migrations, 477 API integration tests, and the web build on every pull request.
- The repository has no `CODEOWNERS` file and no merge automation workflow.
- Antigravity already pushes branches and creates pull requests with `gh`; most manual steps in
  recent sessions came from an executor without GitHub write access, not from the rules.
- Agents push and act on GitHub with the Owner's own identity.
- ADR-027 (`Proposed`) lists merge-to-`main` as an open Owner decision (docs/5 §8 item 5). This
  plan decides that item only; the rest of ADR-027 stays `Proposed`.

## Unverified facts

- **Whether Vercel deploys `main` to Production automatically** (Git integration). If yes, an
  automatic merge is also an automatic Production deployment. See D3.
- Current GitHub branch-protection settings on `main` (required reviews, required checks).

## Tiers

### Tier 1 — automatic merge after green CI

Any pull request that touches **only** paths outside Tier 2: application code, tests, UI,
non-policy documentation (Feature Cards, plans, reports, archive, README files,
`docs/3_UI_ATOMIC_DESIGN_SYSTEM.md`), `TODO.md`, and refactors.

The agent creates the PR and runs `gh pr merge --auto --squash`. GitHub merges when `verify`
and `owner-gate` pass. No Owner action.

### Tier 2 — automatic merge only after the Owner adds the `owner-approved` label

A pull request that touches any of these paths:

| Area                         | Paths                                                                                                                                                                                                                                                     |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Agent rules and governance   | `AGENTS.md`, `AGENT_REPORT_TEMPLATE.md`, `docs/0_PRODUCT_KNOWLEDGE_MAP.md`, `docs/1_ARCHITECTURE.md`, `docs/2_WORKFLOW_AND_ROLES.md`, `docs/4_AGENT_DEV_GUIDELINES.md`, `docs/5_AUTONOMOUS_AGENT_OPERATIONS.md`, `docs/POLICY_REGISTRY.md`, `docs/adr/**` |
| Enforcement itself           | `.github/**`, `scripts/check*.mjs`, `quality/**`                                                                                                                                                                                                          |
| Database                     | `apps/api/src/db/migrations/**`, `database/migrations/**`                                                                                                                                                                                                 |
| Authorization and auth       | `apps/api/src/policies/**`, `apps/api/src/modules/auth/**`, `apps/api/src/http/middleware/authenticate.ts`, `apps/api/src/http/middleware/authorize.ts`                                                                                                   |
| Secrets, env, and deployment | `.env*.example`, `apps/*/.env*.example`, `vercel.json`, `.vercelignore`, `api/**`, `docs/DEPLOYMENT_AND_ENVIRONMENTS.md`                                                                                                                                  |
| Dependencies                 | `package.json`, `package-lock.json`, `apps/*/package*.json`, `packages/*/package*.json`                                                                                                                                                                   |

The Owner reviews the PR summary and adds the label (also possible from the GitHub mobile app).
The merge then completes automatically. Enforcement paths are Tier 2 so an automatic change
cannot weaken the gate.

## Mechanism

1. **New CI job `owner-gate`** (`.github/workflows/owner-gate.yml`), triggered on
   `pull_request` types `opened`, `synchronize`, `reopened`, `labeled`, `unlabeled`:
   - Lists changed files against the PR base and matches them with the Tier 2 path list kept in
     one file, `quality/tier2-paths.txt`.
   - No Tier 2 file: pass.
   - Tier 2 file and label `owner-approved` present: pass.
   - Tier 2 file without the label: fail with a message naming the matched files.
   - On `synchronize` (new commits after approval) the job removes `owner-approved`, so approval
     always covers the final diff.
   - The matcher lives in `scripts/checkTier.mjs` with unit tests in `scripts/checkTier.test.mjs`.
2. **GitHub settings (Owner, once):** allow auto-merge; automatically delete head branches;
   branch protection on `main` requires status checks `verify` and `owner-gate` and does not
   require a manual review. "Require branches to be up to date" stays off: with auto-merge it would
   stall every PR whenever `main` moves; CI already tests the merge result with the latest base.
3. **Label:** create `owner-approved` in the repository.
4. **Governance documents:** ADR-028 (Accepted on Owner merge); `AI-013` changed so merge to `main`
   is allowed through tiered auto-merge; new `AI-020` describing the tiers; Agent Guidelines
   §2A.A.1 and `AGENTS.md` updated; docs/5 §8 item 5 marked decided by ADR-028. All other `AI-013`
   stop conditions (Production data, destructive migration, secrets, force-push, scope expansion,
   material product decision) are unchanged.
5. **Agent routine:** create PR → `gh pr merge --auto --squash` → report the PR link and tier. For a
   Tier 2 PR the report says "needs `owner-approved`" and lists the matched files. Agents never add
   or remove the `owner-approved` label.

## Owner decisions

| #   | Decision                                    | Recommendation                                                                                                                                                        |
| --- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Tier 2 path list above                      | Accept as listed. Moving `docs/3_UI_ATOMIC_DESIGN_SYSTEM.md` to Tier 1 is already applied because UI token changes are low risk and easy to revert.                   |
| D2  | Merge method                                | Squash merge: one commit per PR keeps `git revert` simple.                                                                                                            |
| D3  | If Vercel auto-deploys `main` to Production | Keep it, because `verify` already runs the full suite and rollback is an alias switch; or switch Production to manual promote if you want a separate release step.    |
| D4  | Agents use the Owner's GitHub identity      | Accept for now with the rule "agents never touch the label"; follow-up task: give agents a separate bot identity so `owner-gate` can also verify who added the label. |

## Acceptance criteria and evidence

| AC                                                                                    | Evidence                                                                      |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| A Tier 1 PR merges automatically after green CI with no Owner action.                 | One real low-risk PR merged by auto-merge; PR timeline shows no manual merge. |
| A Tier 2 PR stays blocked until `owner-approved` is added, then merges automatically. | Test PR touching a Tier 2 path: `owner-gate` fails, then passes after label.  |
| New commits after approval remove the label and block the merge again.                | Same test PR: push a commit, label removed, gate fails.                       |
| Path matching is correct for every Tier 2 pattern and ignores Tier 1 paths.           | `scripts/checkTier.test.mjs` unit tests.                                      |
| Governance documents agree and pass checks.                                           | `npm run validate`; ADR-028 indexed; `AI-013`/`AI-020` consistent.            |

## Files likely to change

`.github/workflows/owner-gate.yml` (new), `scripts/checkTier.mjs` (new), `scripts/checkTier.test.mjs`
(new), `quality/tier2-paths.txt` (new), `package.json` (test script), `docs/adr/ADR-028-TIERED-AUTO-MERGE.md`
(new), `docs/adr/README.md`, `docs/POLICY_REGISTRY.md`, `docs/4_AGENT_DEV_GUIDELINES.md`,
`AGENTS.md`, `docs/5_AUTONOMOUS_AGENT_OPERATIONS.md` (§8 item 5 only), `TODO.md`, this plan, and a
report in `docs/reports/`.

## Impact

- **Data, migration, API contracts, application authorization:** none.
- **Risk:** with no human review, quality depends on CI. Mitigations: the full `verify` suite is
  required; squash merges keep revert to one commit; risky areas stay Tier 2; the gate removes stale
  approval on new commits.
- **Known gap:** until D4's follow-up, an agent acting as the Owner could technically add the label.
  This is controlled by rule, not by the system.

## Rollout

1. One PR with everything above. It is itself Tier 2, so it is the last manual merge.
2. Owner applies the GitHub settings and creates the label.
3. Prove the AC with one Tier 1 PR and one Tier 2 test PR; record results in the report.

## Recovery

Revert the merge commit and turn branch protection back to "require review". Auto-merge stops at
once; nothing in application data or deployment changes.
