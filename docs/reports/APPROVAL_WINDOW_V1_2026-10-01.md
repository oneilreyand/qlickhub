## Task

`APPROVAL-WINDOW-V1` — replace repeated routine agent approvals with a bounded Approval Window.

## Outcome

Approval Window is now the canonical rule for routine bounded agent work. One user-approved task
window can cover in-scope edits, declared checks, same-scope remediation, commit, non-protected
push, and draft PR updates. High-risk actions remain explicit human decisions.

## Work assurance

- **Work Readiness Assessment:** 6/16, `Ready`; documentation governance only. The approved plan
  defines every file, mutation, evidence path, and stop condition.
- **User plan approval:** User approved `APPROVAL-WINDOW-V1` in this conversation on 2026-10-01.
- **Step approval log:** One Approval Window authorized the bounded sequence in
  `docs/plans/APPROVAL_WINDOW_V1_PLAN.md`, from baseline
  `d28559e6283d12b89f7c5c5b3a8ba468d9b07b69` through 2026-10-01 23:59:59 Asia/Jakarta; no
  high-risk action is included.
- **Agent capability and access:** Executor can inspect and edit repository documentation and run
  local documentation checks. No database, production, deployment, branch-protection, or GitHub
  write action is authorized or used.
- **AC-to-evidence matrix:**

| Acceptance Criterion                                                      | Required / achieved evidence level (E0–E4) | Primary evidence and environment                                                                   | Verification status                                          |
| ------------------------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| One bounded approval covers routine work.                                 | E2 / E2                                    | Canonical guideline §2A.A.1, `AI-009`, ADR-025, AGENTS, Knowledge Map; local `npm run docs:check`. | Accepted locally; independent PR review pending publication. |
| High-impact actions require fresh approval.                               | E2 / E2                                    | Guideline stop conditions, `AI-013`, and ADR-025; local documentation check.                       | Accepted locally; independent PR review pending publication. |
| Scope, baseline, expiry, unknowns, and insufficient evidence fail closed. | E2 / E2                                    | Guideline §2A.A.1 and ADR-025; local documentation check.                                          | Accepted locally; independent PR review pending publication. |
| V1/V2 boundaries are unchanged.                                           | E1/E2                                      | Scoped diff and ADR-025 non-goals; local documentation check.                                      | Accepted locally; independent PR review pending publication. |

- **Evidence outcomes:** `git diff --check` passed with no whitespace output. `npm run docs:check`
  passed locally: 9/9 tests passed, 0 failed, 0 skipped, and `Documentation governance passed.`
- **Change Impact Map:** Cross-boundary documentation governance only. No runtime consumer,
  contract, data, authorization, UI, migration, release, or deployment changes.
- **Decision Snapshot:** Approval Window selected; per-mutation approval replaced for routine work;
  open-ended and fully autonomous authority rejected.
- **Agent handoff and independent verification:** executor rechecked the approved nine-file scope
  against the current working tree. Local evidence is complete; independent PR review/CI is pending
  until the user explicitly authorizes publication.
- **Quality review:** inspected the nine-file scope plus ADR-018/021 and the registry. Reuse/DRY:
  one canonical operational rule remains in Agent Guidelines, with references elsewhere; none found.
  Duplicate/overlap: ADR-025 records rationale while the guideline owns operation; none found.
  Obsolete/unused: the replaced checkpoint wording is removed from active agent paths; none found.
  Boundary/best practice: V1 acceptance and V2 broker enforcement are retained; none found.
  Regression evidence: whitespace and documentation checks passed as recorded.
- **Cross-layer quality gates:** N/A; no UI, data access, performance, or AI model technology
  changed.

## Source of truth and impact

- **Applicable SSoT:** Product Knowledge Map, Agent Guidelines §2A, Policy Registry, ADR-018,
  ADR-021, and ADR-025.
- **Policy IDs:** `AI-007`, `AI-008`, `AI-009`, `AI-010`, `AI-012`, `AI-013`, `DOC-001`,
  `DOC-002`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** None.
- **Authorization impact:** No application authorization change; governance approval boundary only.
- **Migration risk:** None.

## Changed files

- `AGENTS.md` — directs agents to Approval Window and high-risk approval.
- `TODO.md` — records this completed governance task.
- `docs/0_PRODUCT_KNOWLEDGE_MAP.md` — updates AI reading path.
- `docs/4_AGENT_DEV_GUIDELINES.md` — owns the canonical rule and stop conditions.
- `docs/POLICY_REGISTRY.md` — updates `AI-009` and adds `AI-013`.
- `docs/adr/ADR-025-APPROVAL-WINDOWS-FOR-AGENT-WORK.md` and `docs/adr/README.md` — decision history and index.
- `docs/plans/APPROVAL_WINDOW_V1_PLAN.md` — approved scope and AC evidence mapping.
- This report — reproducible local outcome evidence.

## Validation

- `git diff --check` — passed; no whitespace errors.
- `npm run docs:check` — passed locally: 9/9 tests, 0 failed, 0 skipped; documentation governance passed.

## Risks or follow-up

Publishing through a PR still needs the existing one-time GitHub approval record required by V1.
This task does not create that record, commit, push, merge, or activate V2.

## Human decision summary

The Product selected a faster, bounded approval model while retaining explicit human authority for
high-impact and irreversible operations.

## TODO update

- `APPROVAL-WINDOW-V1` → `Done` locally; publication remains a separately approved action.
