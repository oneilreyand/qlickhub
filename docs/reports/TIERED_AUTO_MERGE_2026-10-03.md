# TIERED-AUTO-MERGE — 2026-10-03

## Task

`TIERED-AUTO-MERGE` — plan: [TIERED_AUTO_MERGE_PLAN](../plans/TIERED_AUTO_MERGE_PLAN.md); decision:
[ADR-028](../adr/ADR-028-TIERED-AUTO-MERGE.md).

## Outcome

Implementation candidate ready. After the Owner merges it and applies the GitHub settings, Tier 1
agent pull requests merge automatically after green checks, and Tier 2 pull requests merge
automatically once the Owner adds `owner-approved`.

## Work assurance

- **Work Readiness Assessment:** 6/16, `Ready` — governance plus a CI workflow; no application,
  data, or deployment change.
- **User plan approval:** Owner approved the plan on 2026-10-03 ("setuju"), with D1, D2, and D4 as
  recommended. D3 (Vercel Production branch) is unverified and recorded as a follow-up.
- **Agent capability and access:** fresh clone of `origin/main` `3b27715`. The executor cannot push,
  change GitHub settings, create labels, or observe Vercel settings.
- **AC-to-evidence matrix:**

| Acceptance Criterion                                                | Required / achieved | Primary evidence                                                                                                                                                          | Status            |
| ------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| Path matching is correct for every Tier 2 area; Tier 1 ignored.     | E2 / E2             | `npm run tier:test`: 5 passed, 0 failed.                                                                                                                                  | Accepted          |
| Gate blocks Tier 2 without label, passes with label and for Tier 1. | E2 / E2             | Local simulation on real merge commits: `AGENTS.md` change exit 1 → exit 0 with `--approved true`; `README.md` change exit 0.                                             | Accepted          |
| Governance documents agree and pass checks.                         | E2 / E2             | `npm run validate` (below).                                                                                                                                               | Accepted          |
| Tier 1 PR auto-merges with no Owner action.                         | E3 / —              | This evidence PR (`docs/auto-merge-evidence`, Tier 1 files only) is the live test; result recorded when it merges.                                                        | Pending (this PR) |
| Tier 2 PR blocked until label; new commit removes label.            | E3 / E3             | PR #17: `owner-gate` failed without label; label added 02:34 UTC, new commit at 02:46 removed it and the gate failed again; re-labeled, gate passed, merged as `850d2a2`. | Accepted          |

- **Change Impact Map:** CI (new `owner-gate` workflow and required check), agent rules (`AGENTS.md`,
  Agent Guidelines §2A.A.1, `AI-013`, new `AI-020`), docs/5 §8 item 5. Application, data, contracts,
  authorization: `N/A`.
- **Decision Snapshot:** tiered label gate chosen over manual merge for all PRs and over unrestricted
  auto-merge; GitHub code-owner review not used because agents act as the Owner.
- **Quality review:** the Tier 2 list includes the gate's own files; the label is removed on new
  commits; `--no-renames` makes renames or deletions of Tier 2 files count.

## Source of truth and impact

- **Applicable SSoT:** [Agent Guidelines](../4_AGENT_DEV_GUIDELINES.md), [Policy Registry](../POLICY_REGISTRY.md).
- **Policy IDs:** `AI-013`, `AI-020`, `DOC-002`, `DOC-004`.
- **Data/interface impact:** None. **Authorization impact:** None (repository workflow only).
  **Migration risk:** None.

## Changed files

- `.github/workflows/owner-gate.yml`, `scripts/checkTier.mjs`, `scripts/checkTier.test.mjs`,
  `quality/tier2-paths.txt` — gate.
- `docs/adr/ADR-028-TIERED-AUTO-MERGE.md`, `docs/adr/README.md`, `docs/POLICY_REGISTRY.md`,
  `docs/4_AGENT_DEV_GUIDELINES.md`, `AGENTS.md`, `docs/5_AUTONOMOUS_AGENT_OPERATIONS.md` — policy.
- `package.json` — `tier:test` added to `validate`.
- `TODO.md`, the plan, and this report.

## Validation

- `npm run tier:test` — 5 passed, 0 failed, 0 skipped.
- `npm run validate` (clean clone, Node 22) — passed: `docs:check` 9/9 and governance passed;
  `agent:policy:test` 22/22; `tier:test` 5/5; lint 0 errors (17 pre-existing warnings); typecheck passed.

## Post-merge evidence (2026-10-05)

- PR #17 merged as `850d2a2`; CI `verify` passed on `main`.
- Branch ruleset "Require approved agent changes on main" is active for `main`: restrict deletions, block force
  pushes, and required status checks `verify` and `owner-gate` (not strict). Read from the public
  `GET /repos/oneilreyand/qlickhub/rules/branches/main` endpoint.
- Direct pushes to `main` are effectively blocked: the ruleset requires `owner-gate`, which runs only on pull
  requests.

## Risks or follow-up

- Owner applies GitHub settings and creates the `owner-approved` label (steps in the plan).
- D3 confirmed 2026-10-05: GitHub deployment records show `vercel[bot]` deploying every `main` merge (`3b27715`, `9cb9f45`, `12506f2`, `a5e80c0`) to the Production environment about two minutes after merge. Behavior kept as decided in ADR-028.
- Follow-up task: separate GitHub bot identity for agents so the gate can also verify who added the
  label.

## Human decision summary

This pull request is Tier 2 (it changes `AGENTS.md`, ADRs, `.github/**`), so it is the last manual
merge. The task closes after the two live pull requests prove the post-merge AC.

## TODO update

- `TIERED-AUTO-MERGE` → `In progress` until the post-merge AC are proven.
