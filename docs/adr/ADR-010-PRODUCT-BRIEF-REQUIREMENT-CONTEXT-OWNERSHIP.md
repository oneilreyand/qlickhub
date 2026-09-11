# ADR-010: Product Brief and Requirement Context Ownership

**Status:** Accepted
**Date:** 2026-09-10
**Decision owners:** Product and Engineering

## Context

Qlick Hub persists both versioned Product Brief content and Workspace-owned Requirements. Earlier
UI combined Product Brief scope, Product Brief-local acceptance bullets, Requirement records, QA
documents, and attachments on one surface. The Requirements-only simplification removed that
mixed surface, but it also left Product Brief scope without an editable location and did not expose
the already-canonical Acceptance Criteria records beneath Requirements.

Keeping the same information in Product Brief versions and Requirement records creates competing
sources for Developer delivery and QA verification. External PRD and design links also need a clear
ownership rule so teams do not repeat a general Feature reference on every Requirement.

## Decision

1. A root Feature / Story Task may have one versioned primary Product Brief. It owns Feature-level
   context, labeled external reference links written in its Markdown content, In Scope, and Out of
   Scope.
2. A Workspace Requirement owns the delivery need, optional source/reference URL specific to that
   Requirement, and stable Acceptance Criteria records.
3. Requirement is still the canonical structural Test Case coverage target. Acceptance Criteria
   remain stable testable detail; this ADR does not add criterion-level Test Case mapping.
4. Product Brief and Requirements use separate Task Detail tabs. The Requirements tab does not
   display or mutate Product Brief, QA document, or attachment records.
5. Historical acceptance-criteria arrays already captured in Product Brief versions are preserved
   as immutable version history. New Product Brief UI does not present them as canonical criteria
   and carries them forward unchanged when another version is saved.
6. Planner roles (`owner`, `admin`, `po`) may mutate both surfaces through existing backend policy.
   Developer and QA access is read-only.
7. This decision does not introduce a gate requiring every existing `active` Requirement to have an
   active Acceptance Criterion. Such a gate requires a persisted-data audit and explicit legacy
   remediation decision.

## Consequences

- Product context and scope stay versioned without being copied into reusable Requirements.
- Developer and QA can distinguish Feature boundaries from testable Requirement outcomes.
- Existing Product Brief, Requirement, Acceptance Criterion, Task link, activity, and authorization
  contracts remain usable; no schema migration is required.
- A later structured multi-resource model may replace Markdown reference links if retrieval,
  classification, or independent resource auditing becomes necessary.

## Alternatives considered

- **Put In Scope and Out of Scope on every Requirement:** rejected because Requirements are reusable
  across Tasks and would duplicate or conflict with Feature-specific delivery boundaries.
- **Keep Acceptance Criteria only in Product Brief versions:** rejected because version snapshots do
  not provide the stable criterion identity required by the approved traceability model.
- **Make an external PRD the only source of truth:** rejected because Qlick Hub release traceability
  depends on authenticated, persisted Requirement and Acceptance Criterion records.
