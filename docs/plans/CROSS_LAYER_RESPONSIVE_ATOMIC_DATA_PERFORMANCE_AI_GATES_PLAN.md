# Cross-Layer Responsive, Atomic, Data, Performance, and AI Gates Plan

**Status:** Implemented — `CROSS-LAYER-RESPONSIVE-ATOMIC-DATA-PERFORMANCE-AI-GATES` archived as Done (see [archive](../archive/TODO_COMPLETED_2026-10-02.md))
**Date:** 2026-09-29
**Owner:** Product and Engineering
**Applicable Policy IDs:** `UI-001`, `UI-002`, `UI-003`, `UI-004`, `DATA-001`, `DATA-002`, `DATA-006`, `PERF-001`, `AI-001`, `AI-005`, `AI-006`, `AI-009`, `AI-010`, `AI-011`, `DOC-001`, `DOC-002`, `DOC-003`, `DOC-004`

## Confirmed facts

- The current app is React/Vite responsive web, with existing `sm`, `md`, and `lg` layout usage;
  no native iOS/Android project was identified.
- UI SSoT defines Atomic hierarchy and state handling; AGENTS.md required desktop/mobile review but
  did not explicitly require tablet proof or a decomposition criterion.
- Architecture requires formal PostgreSQL relations, migrations, and transactions, but did not
  define a consistent relation/query performance audit.
- The documentation checker verifies structure—not semantic compliance—and currently reports five
  focused tests plus documentation governance.

## Scope and decision

Add canonical responsive/Atomic rules to UI SSoT; relation, performance, and AI decision rules to
Architecture and Agent Guidelines; short operational references in AGENTS.md and the report template;
and traceable IDs, ADR, plan, report, and TODO lifecycle. The default scope is responsive web only.
No application code, contract, schema, migration, data, authorization, dependency, or deployment
change is authorized.

## Work Readiness Assessment

**6/16 — `Ready`:** requirement clarity 1, affected layers 2, shared-contract 0, data/migration 0,
authorization 0, coupling 2, validation 1, external dependency 0. Every AC has E1 document/source
inspection and E2 documentation-gate evidence. Existing unrelated AI Task Generator work remains
outside scope and must be preserved.

## Acceptance Criteria and evidence

| Acceptance Criterion                                                                                                     | Minimum evidence                                                           |
| ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| Web UI changes require phone, tablet, and desktop evidence; native scope is not assumed.                                 | E1 UI SSoT/registry/ADR inspection; E2 documentation gate.                 |
| Atomic review requires reuse evidence and purpose-based decomposition.                                                   | E1 UI SSoT, AGENTS.md, report-template inspection; E2 documentation gate.  |
| Database relation/query and FE/BE performance reviews have explicit evidence paths.                                      | E1 Architecture/Guidelines/registry inspection; E2 documentation gate.     |
| AI technology/model changes require a reproducible Decision Snapshot.                                                    | E1 Architecture/Guidelines/registry/ADR inspection; E2 documentation gate. |
| The documentation gate demonstrably enforces its published structural scope and its semantic limit is reported honestly. | E1 `scripts/checkDocs.mjs` and tests inspection; E2 `npm run docs:check`.  |

## Change Impact Map

**Cross-boundary documentation governance:** agent workflow, UI SSoT, technical Architecture,
Policy Registry, ADR history, report template, plan/report evidence, and TODO. No runtime module,
API contract, database, migration, authorization, UI route, external service, or deployment changes.

## Decision Snapshot

**Chosen:** three responsive web classes (`<768px`, `768px–1023px`, `≥1024px`), behavioral Atomic
decomposition, risk-based PostgreSQL plan inspection, measurement-before-budget, and an AI decision
record. **Benefit:** evidence matches real risk and avoids false precision. **Cost:** more review
work. **Rejected:** native scope by assumption, line-count rules, universal performance numbers,
and vendor-name model selection. **Recovery:** a future approved ADR may add native evidence tooling
or numeric budgets after baseline data exists.

## Validation and completion

Inspect the changed diff and the documentation-checker source/tests, then run `git diff --check` and
`npm run docs:check`. Record exact outcomes and the checker’s structural/semantic coverage in the
report. Mark TODO `Done` only if those checks pass.
