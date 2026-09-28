## Task

AI-WORK-ASSURANCE-PROTOCOL: implement the vendor-neutral protocol for work readiness, AC evidence,
change analysis, AI handoff, independent verification, and human decision summaries.

## Outcome

The canonical Agent Guidelines now require a capability-aware Work Readiness Assessment before
repository-changing work, an AC-to-evidence contract with E0–E4 levels, Change Impact Maps,
Decision Snapshots for material alternatives, reproducible inter-agent handoffs, explicit
verification outcomes, and a human-readable decision summary. The Product Knowledge Map routes AI
agents to the preflight, the agent instructions and report template operationalise it, ADR-016
records the approved governance decision, and AI-002 through AI-006 identify the rules stably.

## Work assurance

- **Work Readiness Assessment:** 4/16, `Ready`. Requirement clarity 0; affected documentation
  layers 1; data/migration 0; authorization 0; shared contract 0; cross-entrypoint coupling 2;
  validation 1; external dependency 0. User approval resolved the policy decision; all requested
  protocol elements had a documentation evidence path.
- **Agent capability and access:** The executor could read and edit the repository documentation,
  inspect existing SSoT/ADR/report conventions, and run documentation validation. It could not
  obtain an independent semantic review from another agent or human in this task.
- **AC-to-evidence matrix:**

| Acceptance Criterion                                                 | Required / achieved evidence level (E0–E4) | Primary evidence and environment                                                                  | Verification status |
| -------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------- | ------------------- |
| Define WRA, capability declaration, score bands, and Ready outcomes. | E1 / E2                                    | `docs/4_AGENT_DEV_GUIDELINES.md` §2A; repository documentation check.                             | Accepted with gaps  |
| Map ACs to E0–E4 evidence and forbid trust-based promotion.          | E1 / E2                                    | Agent Guidelines §2A and AI-003 registry entry; repository documentation check.                   | Accepted with gaps  |
| Require Change Impact Map and Decision Snapshot with pro/con.        | E1 / E2                                    | Agent Guidelines §2A and AI-005/AI-006 entries; repository documentation check.                   | Accepted with gaps  |
| Require reproducible handoff and independent verification outcome.   | E1 / E2                                    | Agent Guidelines §2A, report template, ADR-016, and AI-004 entry; repository documentation check. | Accepted with gaps  |
| Preserve human-readable orientation and final decision summary.      | E1 / E2                                    | Product Knowledge Map, Agent Guidelines §2A, and report template; repository documentation check. | Accepted with gaps  |

- **Change Impact Map:** `Cross-boundary change` to agent governance and future delivery process.
  Affected consumers are all agents, plans, reports, Feature Cards, ADR decisions, and human
  reviewers. No application function/module behavior, shared API contract, persisted data,
  authorization, UI, release gate, environment, or deployment changes.
- **Decision Snapshot:** The alternatives were trust in model/vendor identity, mandatory second
  model for every task, an unstructured free-text report, and full analysis for every tiny change.
  The selected vendor-neutral, proportional protocol makes primary evidence and reproducibility the
  trust boundary. It avoids model lock-in and needless delay, at the cost of more structured plans
  and reports. No compatibility or runtime rollback is required; reverting the policy would require
  a new ADR and SSoT update.
- **Agent handoff and independent verification:** Base commit is `1bba0d9`; the submitted bundle
  is an uncommitted documentation working tree and therefore must be frozen in a commit or attached
  as `git diff --binary HEAD` before a verifier returns `Accepted`. Executor: Codex. Structural
  verifier: `npm run docs:check` and `git diff --check`. Semantic independent verifier: unavailable
  in this task. Final result is `Accepted with gaps`, not a claim that another agent or human
  approved the policy content.

## Source of truth and impact

- **Applicable SSoT:** `docs/4_AGENT_DEV_GUIDELINES.md`, `docs/0_PRODUCT_KNOWLEDGE_MAP.md`, and
  `AGENT_REPORT_TEMPLATE.md`.
- **Policy IDs:** `AI-001`, `AI-002`, `AI-003`, `AI-004`, `AI-005`, `AI-006`, `DOC-001`,
  `DOC-002`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** None; this is an agent-governance documentation change.
- **Authorization impact:** None; human authority and existing backend authorization remain intact.
- **Migration risk:** None.

## Changed files

- `docs/adr/ADR-016-VENDOR-NEUTRAL-AI-WORK-ASSURANCE.md` — accepted governance decision.
- `docs/4_AGENT_DEV_GUIDELINES.md` — canonical protocol and evidence definitions.
- `docs/POLICY_REGISTRY.md` — stable AI-002 through AI-006 references.
- `AGENTS.md` — concise mandatory operating rules for all repository agents.
- `AGENT_REPORT_TEMPLATE.md` — WRA, evidence, impact, handoff, verification, and human-summary
  report fields.
- `docs/0_PRODUCT_KNOWLEDGE_MAP.md` — AI reading path to the protocol; the previously added domain
  context map remains the human-friendly orientation layer.
- `TODO.md` — task status and follow-up evidence link.
- `docs/reports/AI_WORK_ASSURANCE_PROTOCOL_2026-09-24.md` — this observed evidence record.

## Validation

- `npm run docs:check` — passed; 5/5 documentation tests passed, 0 failed, 0 skipped, and the
  documentation governance check passed.
- `git diff --check` — passed with no whitespace errors.
- Semantic self-review — confirmed ADR-016, the canonical SSoT, Policy Registry, agent entrypoint,
  reporting template, and AI reading path agree; it is not independent verification.

## Risks or follow-up

- An independent semantic review by another agent or a human is still required before the protocol
  can be reported as fully `Accepted` under its own AI-004 rule.
- The protocol does not create automatic model capability detection or an autonomous deployment
  gate. Agents declare access truthfully and stop when evidence cannot be produced.
- No code, API, database, runtime, deployment, or Production data changed.

## Human decision summary

The repository now has one vendor-neutral language for auditing AI work instead of trusting model
names or persuasive reports. The structural documentation evidence is complete. The only open item
is an independent semantic review of this policy bundle; until then, the policy is implemented but
the implementation handoff remains `Accepted with gaps`.

## TODO update

- `AI-WORK-ASSURANCE-PROTOCOL` → `Blocked` pending independent semantic review.
