# ADR-019: Cross-Layer Quality, Performance, and AI Technology Gates

**Status:** Accepted
**Date:** 2026-09-29
**Decision owner:** Product
**Implementation stakeholders:** Product, Engineering, QA, and AI agents

## Context

Qlick Hub already requires Atomic Design reuse, desktop/mobile review, PostgreSQL integration
evidence, and an AI work-assurance protocol. These controls do not yet require tablet evidence,
state when a growing component must be decomposed, make database relation/query-performance review
explicit, require performance measurement evidence, or standardize the decision for AI technology
and model changes.

## Decision

1. Responsive **web** UI changes prove behavior at phone, tablet, and desktop widths. Native
   iOS/Android work is excluded until Product approves native-specific tooling and evidence.
2. Atomic Design review searches existing components first. A component is decomposed when it has
   independent testable/reusable responsibilities or its change risks unrelated consumers; line
   count alone is not the criterion.
3. Model, migration, and query changes document relation ownership/cardinality, foreign keys,
   deletion lifecycle, Workspace scope, transactions, indexes, N+1/unbounded-read risk, and a
   disposable-PostgreSQL query plan when risk or measurements warrant it.
4. Changes with frontend or backend performance risk record an appropriate measurement method,
   environment/data, baseline when available, observed result, and unverified gaps. Product sets
   numeric budgets later when a representative baseline supports them.
5. Provider/model/prompt/structured-output/retrieval/fallback changes for AI record a Decision
   Snapshot covering purpose, alternatives, data/secret boundaries, evaluation, latency, cost,
   failure handling, observability, rollout, and rollback.

## Consequences

- Reviews have explicit evidence targets instead of a vague “responsive” or “fast” claim.
- Large components become candidates for purposeful decomposition without arbitrary line limits.
- The team learns representative performance baselines before committing to universal thresholds.
- AI technology remains an explicit product/engineering decision, not an implicit provider default.
- The documentation checker structurally validates files, local target links, registry IDs, and
  Feature Card references; semantic compliance with these gates remains a human/agent review and
  evidence obligation until a dedicated automated check exists.

## Alternatives considered

- **One mobile check only:** rejected because tablet is a distinct layout transition.
- **Fixed component line-count limit:** rejected because responsibilities and reuse are more reliable
  signals of Atomic boundaries.
- **Universal numeric performance budget now:** rejected because no representative baseline was
  established and invented thresholds would be false precision.
- **Choose AI model by vendor/model name alone:** rejected because it ignores data boundaries,
  quality, failure behavior, cost, and observability.
