# ADR-016: Vendor-Neutral AI Work Assurance Protocol

**Status:** Accepted
**Date:** 2026-09-24
**Decision owner:** Product
**Implementation stakeholders:** Product, Engineering, QA, and AI agents

## Context

Qlick Hub already requires shared contracts, authenticated persisted evidence, PostgreSQL
integration tests where applicable, truthful reports, and explicit human approval for autonomous AI
production mutations. These rules constrain implementation but do not yet standardise how an AI
agent evaluates work before it starts, proves each Acceptance Criterion, hands work to another
agent, or separates an independently verified fact from a plausible narrative.

Different models may have useful diversity of reasoning, but a model name does not prove access,
execution, or independence. A second agent that reads only a first agent's summary can repeat the
same unsupported assumption. Humans also need a concise decision view without losing access to the
primary evidence behind it.

The user approved the protocol through the instruction to implement the complete AI work-assurance
recommendation on 2026-09-24.

## Decision

1. Repository, configuration, data, or deployment changes begin with a Work Readiness Assessment
   (WRA). It scores scope risk, declares the agent's actual capabilities/access, maps every
   Acceptance Criterion to objective evidence, and returns `Ready`, `Ready after split`, or
   `Blocked`; it is not a duration promise.
2. WRA uses eight dimensions—Requirement clarity, affected layers, data/migration, authorization,
   shared contract, change coupling, validation, and external dependencies—with a `0–16` scale.
   Scores 9–12 are split into vertical slices; scores 13–16 require a human decision and a
   rollout/recovery plan before implementation.
3. Evidence is labelled E0 Claim, E1 Inspection, E2 Executed, E3 Persisted, or E4 Runtime/UAT.
   E0 cannot accept an Acceptance Criterion. Evidence can be upgraded only by new primary evidence
   or a newly executed check; trust in an earlier report is not an upgrade.
4. Every material change receives a Change Impact Map. Contract, data, authorization, workflow,
   architecture, migration, or rollout alternatives also receive a Decision Snapshot with the
   options, pro/con analysis, selected approach, compatibility, and recovery consequences.
5. Every AI-to-AI handoff carries a reproducible Evidence Package, including baseline, source
   documents, assumptions, changed files/diff, exact commands/results, environment, evidence per
   AC, gaps, risks, and next action.
6. An independent verifier inspects primary evidence and reports `Accepted`, `Accepted with gaps`,
   `Rejected`, or `Blocked`. Deterministic CI can serve this role only when it covers every relevant
   AC. A different model is optional; independent context, sufficient access, and reproducibility
   are mandatory.
7. The final handoff gives humans a concise result, evidence/gaps, material trade-offs and impact,
   and the decisions still requiring human authority. Human approval remains required for policy
   changes, material trade-offs, destructive migrations, and release decisions.

## Consequences

- Agent work has a common auditable language independent of GPT, Gemini, or any other model.
- Plans and reports become more structured; small, obvious local changes use a proportional WRA and
  do not require a full Decision Snapshot.
- A task cannot be truthfully marked `Done` when required evidence is unavailable; it remains
  `Blocked` or is reported as accepted with declared gaps where the human explicitly permits that
  outcome.
- The protocol governs agent process only. It adds no application API, database table, runtime
  automation, user permission, or production-data mutation.

## Alternatives considered

- **Trust the model or vendor label:** rejected because labels do not establish repository access,
  actual command execution, or evidence reproducibility.
- **Require a second model for every task:** rejected because model diversity alone is not
  independence and would add delay to low-risk work already covered by deterministic CI.
- **Use a single free-text report:** rejected because it lets evidence level, assumptions, and
  unverifiable gaps be obscured.
- **Require full formal analysis for every typo:** rejected because the process must remain
  proportional; impact and decision depth follow actual risk.
