## Task

`AI-WORKFLOW-SIX-STAGE-CLARIFICATION` — concise agent delivery with one bounded approval.

## Outcome

Local documentation candidate prepared. Plan and window share one consent; the canonical flow
keeps task, documentation, evidence, handoff, and completion connected. Local checks pass;
independent semantic review and publication remain pending.

## Work assurance

- **WRA / plan:** `4/16`, Ready for local preparation: requirement 0, layers 1, data/migration 0,
  authorization 1 (governance only), contract 0, coupling 2, validation 0 (static/unit), external 0.
  Facts: ADR-025 allows a bounded sequence, but the active map, Architecture reference, and report
  template still contain per-step wording. Objective: align them and reduce repeated communication.
  Unresolved: independent semantic review and publication; neither is claimed complete locally.
- **User request:** In this conversation the Product requested the six stages and then fewer
  questions/approvals and less token use. This is preparation of that local documentation result;
  no GitHub approval record or permission for merge/deployment is created or inferred.
- **Local sequence:** baseline `88cb3e899e33c5a50ab46a2b55accec857309404`, clean checkout on
  `codex/doc-ssot-integrity`; inspect, prepare the documents listed below, run documentation checks,
  review the diff, and record outcomes. Ends with this local result. No commit/push/PR in this run.
- **Capability:** local documentation read/write and npm checks; no runtime/database or external
  write capability needed for the acceptance criteria.
- **AC-to-evidence matrix:**

| AC                                                                | Required / achieved | Primary evidence                                             | Verification status                    |
| ----------------------------------------------------------------- | ------------------- | ------------------------------------------------------------ | -------------------------------------- |
| Plan and window use one consent, followed by bounded work.        | E1 / E1             | Guidelines §2 and §2A.A.1; AGENTS and report template        | Independent review pending             |
| Six-stage flow keeps docs, tests, results, and handoff connected. | E1 / E1             | Guidelines §2; map diagram; AI-014; ADR-026                  | Independent review pending             |
| Existing stop conditions and application controls remain.         | E1 / E1             | Guidelines §2A.A.1/K and Architecture §6.D; scoped diff      | Independent review pending             |
| Documentation structure and whitespace checks pass.               | E2 / E2             | git diff --check exit 0; npm run docs:check exit 0, 9/9 pass | Passed locally; CI pending publication |

- **Change Impact Map:** Cross-boundary governance: instructions → canonical lifecycle/window →
  task/evidence/report → handoff and completion. Runtime/API/UI/data/migrations/deployment: N/A.
- **Decision Snapshot:** selected one consent and concise user results linked to primary evidence
  (less delay, requires a clear scope); rejected repeated approvals (slow) and removing evidence
  (loss of verifiability). ADR-026 refines historical decisions without rewriting them.
- **Handoff / independent verification:** baseline and changed files listed; semantic review and
  CI on publication remain pending. Do not infer active GitHub/host enforcement from these docs.
- **Evidence outcomes:** documentation checks succeeded locally (details below); semantic inspection
  covers the changed active paths. No runtime or independent-verifier result is claimed.
- **Quality review:** inspected the eight tracked-file diffs and two new documents; searched active
  references for per-step approval wording. Reuse/DRY: flow defined once in Guidelines, other entry
  points link to it. Duplicate/overlap: existing task/plan/evidence reused by policy; no parallel
  lifecycle added. Obsolete wording: separate plan/window approval, map micro-step gates, and report
  per-step log corrected; historical ADRs/reports retained. Boundary: §2A.A.1/K, V1/Apply/release
  controls retained. Regression: documentation checks pass; semantic independence remains a gap.
- **Cross-layer gates:** N/A; no application code, UI, database, query, performance, or AI model change.

## Source of truth and impact

- SSoT: Knowledge Map, Agent Guidelines §2/§2A, Architecture §6.D; ADR-025 and ADR-026.
- Policies: `AI-007`, `AI-009`, `AI-010`, `AI-013`, `AI-014`, `DOC-001`, `DOC-002`, `DOC-003`, `DOC-004`.
- Data/interface impact: none. Application authorization impact: none. Migration risk: none.
- Recovery: review/revise the local document diff; no runtime recovery required.

## Changed files

- `docs/4_AGENT_DEV_GUIDELINES.md` — owns the flow and combined approval rule.
- `AGENTS.md`, `docs/0_PRODUCT_KNOWLEDGE_MAP.md`, `docs/1_ARCHITECTURE.md` — align active references.
- `AGENT_REPORT_TEMPLATE.md` — one window record and separate high-risk decisions.
- `docs/POLICY_REGISTRY.md` — indexes AI-014.
- `docs/adr/ADR-026-CONCISE-AGENT-DELIVERY-FLOW.md`, `docs/adr/README.md` — decision and index.
- `TODO.md` and this report — task status and primary evidence references.

## Validation

- `git diff --check` — exit 0, no whitespace errors.
- `npm run docs:check` — exit 0; 9 tests passed, 0 failed, 0 cancelled, 0 skipped;
  `Documentation governance passed.` No warnings emitted.
- `git diff -- <active documents>` plus targeted `rg` inspection — reviewed combined approval,
  task creation order, preservation of stop conditions, and links to the canonical flow. Targeted
  search found no old per-step gate wording in the changed active entry points/template.
- Environment: local repository at the stated baseline, existing npm dependencies; database N/A.
  No application tests/build/database/UAT claimed or required for this documentation-only candidate.

## Risks or follow-up

Independent review/publication and existing V1 external approval validation remain to be completed.
The docs checker cannot prove all semantic consistency, agent compliance, or runtime enforcement.

## Human decision summary

The lighter workflow is prepared and checked locally. Review the primary diff and evidence before
publication; independent review and final completion remain pending.

## TODO update

`AI-WORKFLOW-SIX-STAGE-CLARIFICATION` remains `In progress` until independent review/publication.
