# ADR-022: Feature Documentation Tree, Role Paths, and Diagram Entry

**Status:** Accepted
**Date:** 2026-09-30
**Decision owner:** Product and Engineering
**Policy boundary:** `DOC-001`, `DOC-002`, `DOC-003`, `DOC-004`, `DOC-005`

## Context

Single-file Feature Cards are useful for a small vertical slice, but a cross-role Feature can make
the PO, Developer, QA, contract, authorization, and evidence material hard to scan. Splitting by
role without an overview would duplicate scope and policy or cause a reader to miss a shared
decision. Existing cards are already linked by reports and plans, so a bulk move would create
unnecessary link and review risk.

## Decision

New cross-role or cross-layer Feature Cards use one folder under `docs/features/<FEATURE-ID>/`.
Its `README.md` is the canonical entry point and retains the Feature metadata, ten-card overview,
traceability, a compact Mermaid flow, and navigation to focused files. The folder contains
product, shared contract, authorization, test evidence, and Owner/Admin, PO, Developer, and QA
role paths. A role file describes only that role's actions, inputs, outputs, and handoff; it links
to global SSoT rather than copying policy or executable contract fields.

The current one-file format remains valid for small cards and legacy compatibility. Migration is
opt-in, one active Feature at a time, and preserves a short legacy redirect before the old path is
removed in a separately approved cleanup. Reports remain outside Feature folders as evidence.

## Consequences

- Readers start with one diagram and navigate directly to the role or shared concern they need.
- The overview prevents conflicting role narratives; backend authorization remains canonical even
  when a role document describes UI visibility.
- The documentation checker validates both formats and requires the full folder structure for new
  folder cards.
- Existing external links remain stable until each migration explicitly updates them.

## Alternatives considered

- **Separate PO, Developer, and QA files without an overview:** rejected because shared scope and
  release rules would be fragmented.
- **Move all existing cards at once:** rejected because it creates high-volume, low-value link
  churn and makes review unreliable.
- **Keep every Feature in one long document:** retained only for small cards; it does not scale for
  cross-role delivery.

## Migration and recovery

Adopt the template for new work. For a selected active Feature, copy its verified content into the
new tree, add an old-path redirect, update links, run documentation checks, and request review.
Rollback removes the new folder before the old card is deleted. No product data, runtime contract,
or authorization behavior changes through this documentation decision.
