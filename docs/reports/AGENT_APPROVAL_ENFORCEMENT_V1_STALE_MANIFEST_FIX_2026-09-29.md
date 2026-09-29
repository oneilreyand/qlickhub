## Task

Repair stale version 2 approval-manifest matching that blocks an independently approved later task when both manifests include `TODO.md`.

## Outcome

The stale-manifest regression was first reproduced as a failing test, then corrected by requiring a selected manifest's complete file scope to be present in the current diff. Full local validation now passes: focused suite 19/19, documentation governance 5/5, quality coverage for 11 combined changed files, and CI-equivalent approval enforcement with exactly two relevant manifests. GitHub CI and independent PR verification remain pending; this repair is not complete.

## Work assurance

- **Work Readiness Assessment:** 9/16, `Ready after split`; this bounded slice corrects a repository acceptance control and requires independent review.
- **User plan approval:** approved in this conversation on 2026-09-29; scope is exactly the five files listed in Owner approval comment `5887893167`.
- **Step approval log:** Owner approval-record creation and initial plan/manifest/report creation received explicit user approval in this conversation. Regression test and code repair remain separate checkpoints.
- **Agent capability and access:** executor can reproduce the checker result against the clean closure branch, inspect GitHub approval records, and run the focused tests. No application environment, database, deployment, or GitHub permission setting is changed.
- **AC-to-evidence matrix:**

| Acceptance Criterion | Required / achieved evidence level (E0–E4) | Primary evidence and environment | Verification status |
| --- | --- | --- | --- |
| A stale manifest sharing only `TODO.md` is excluded. | E2/E2 | New `checkQualityManifest.test.mjs` regression test, clean closure worktree. | Accepted with gaps — CI/review pending. |
| A current manifest with full file scope in the diff remains selected. | E2/E2 | Same regression test and CI-equivalent gate pass after containment predicate repair. | Accepted with gaps — GitHub CI/review pending. |
| A changed file without approval remains rejected. | E2/E2 | Existing missing-manifest test remains in 19/19 passing suite. | Accepted with gaps — CI/review pending. |
| No application runtime or persistence surface changes. | E1/E1 | Exact five-file repair scope inspection. | Accepted with gaps — PR diff review pending. |

- **Evidence outcomes:** before this repair, the CI-equivalent command inspected 6 changed files and 2 version 2 manifests, then failed because historical `AGENT-APPROVAL-ENFORCEMENT-V1` shares `TODO.md` and its old baseline differs from the current closure base. The new regression test initially failed with both `AGENT-APPROVAL-STALE` and `AGENT-APPROVAL-CURRENT` selected. After the one-line containment repair, `npm run quality:test` passed 19/19, `npm run docs:check` passed 5/5, `npm run quality:check` reported complete coverage for 11 changed files, the CI-equivalent approval gate selected only the closure and repair manifests with no gap, and whitespace checks passed. GitHub CI and independent review remain pending.
- **Change Impact Map:** cross-boundary checker selection and module test changes only; runtime application surfaces are unaffected.
- **Decision Snapshot:** complete-scope containment is selected over any-file overlap; exact-one-manifest equality and bypassing the gap are rejected.
- **Agent handoff and independent verification:** CI-equivalent pass achieved; GitHub CI and PR review pending.
- **Quality review:** preliminary review found the repair reuses the existing approval resolver and test suite, adds no parallel checker or policy definition, and leaves application runtime boundaries unchanged. Final committed-diff review remains pending.
- **Cross-layer quality gates:** not applicable; no UI, data-access, performance, or AI technology/model change.

## Source of truth and impact

- **Applicable SSoT:** [Product Knowledge Map](../0_PRODUCT_KNOWLEDGE_MAP.md), [Agent Guidelines](../4_AGENT_DEV_GUIDELINES.md), [Policy Registry](../POLICY_REGISTRY.md), and [ADR-020](../adr/ADR-020-VERIFIABLE-AGENT-CHANGE-APPROVAL-ENFORCEMENT.md).
- **Policy IDs:** `AI-007`, `AI-009`, `AI-010`, `DOC-001`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** None.
- **Authorization impact:** Preserves the intended repository acceptance boundary; no application or GitHub permission change.
- **Migration risk:** None.

## Changed files

- `scripts/checkQualityManifest.mjs` — selects a version 2 manifest only when its complete scope belongs to the current diff.
- `scripts/checkQualityManifest.test.mjs` — regression coverage for stale `TODO.md` overlap.
- `docs/plans/AGENT_APPROVAL_ENFORCEMENT_V1_STALE_MANIFEST_FIX_PLAN.md` — approved repair WRA and evidence plan.
- `docs/reports/AGENT_APPROVAL_ENFORCEMENT_V1_STALE_MANIFEST_FIX_2026-09-29.md` — observed repair evidence and remaining gaps.
- `quality/manifests/AGENT-APPROVAL-ENFORCEMENT-V1-STALE-MANIFEST-FIX.json` — exact-scope Owner approval claim.

## Validation

- Reproduction: CI-equivalent approval command against base `ff9b6603c6afcd49a7d8497619264b397335f0c8` failed with the old manifest baseline mismatch.
- `npm run quality:test` — passed, 19/19 tests, 0 failed, 0 skipped, clean closure worktree after repair.
- `npm run docs:check` — passed, 5/5 tests, 0 failed, 0 skipped.
- `git diff --check` — passed, 0 whitespace errors.
- `npm run quality:check -- --base ff9b6603c6afcd49a7d8497619264b397335f0c8` — passed; 11 changed files, complete quality coverage.
- CI-equivalent approval enforcement — passed; exactly 2 current manifests selected, no approval gap.
- Pending: GitHub CI and independent PR review.

## Risks or follow-up

- Do not push the closure branch until the stale-manifest matcher is repaired and verified.
- V2 managed-write prevention remains deferred and is outside this repair.

## Human decision summary

The current gate safely blocks the branch but for the wrong reason: a historical manifest shares a common administrative file. The chosen repair excludes stale manifests without accepting unapproved files.

## TODO update

- `AGENT-APPROVAL-ENFORCEMENT-V1` → `Done` after PR #3 merged at `866755f069df7236a52731159ddafe4e77df1362` with `verify` success and independent review approval.

## Final closeout evidence

PR #3 merged on 2026-09-29 after GitHub CI and independent review succeeded. The regression test protects against stale version 2 manifests being selected solely because they overlap a later diff on `TODO.md`; unapproved changed files remain fail-closed. V2 managed-write prevention is explicitly out of scope and remains unimplemented.
