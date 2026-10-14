# ADR-033: Documentation Completeness Ratchet and Local Developer Portal

**Status:** Accepted — effective when merged with the Owner's `owner-approved` label (Tier 2)
**Date:** 2026-10-14
**Decision owner:** Product (Owner) — reyand, DOC-PORTAL G1 2026-10-14
**Implementation stakeholders:** Engineering, QA, and AI agents
**Feature:** [DOC-PORTAL](../features/DOC-PORTAL/README.md)
**Policy IDs:** DOC-006 (new), DOC-002, DOC-004, SDLC-001

## Context

Project knowledge lives in about 250 Markdown files, route modules, Zod contracts, and Sequelize
models. Existing checks (`docs:check`, `sdlc:check`) validate document structure, but nothing checks
that documents match the code. Measured on `main` (9d42595, E1): about 45 of 102 unique endpoint
paths are referenced in non-report docs, the hand-written ERD lists 24 entities against 60 models,
and none of the 12 open TODO items records PRD/BE/FE progress. Blocking every existing gap at once
would stop all pull requests; reporting only would let gaps grow.

## Decision

1. A repository tool `tools/docsys/` extracts project facts into one versioned file,
   `.docsys/docs-data.json` (`npm run docs:extract`), and renders a local, unauthenticated developer portal from it. The portal is
   not hosted or deployed.
2. The tool is split into a stack-neutral **core** (data format, completeness rules, ratchet, portal)
   and **adapters** (Express routes, Zod contracts, Sequelize models, Markdown sources). Project paths
   and rule settings live in `docsys.config.json`, never in core.
3. **DOC-006 — Completeness ratchet.** A pull request must not introduce a documentation gap that is
   absent from the committed baseline `quality/doc-baseline.json`. Existing gaps are recorded once in
   the baseline and reported, not blocked. A resolved gap is removed from the baseline and cannot
   return without a new baseline entry.
4. Adding an entry to the baseline is an explicit exception. Because `quality/**` is a Tier 2 path,
   such a pull request already requires the Owner's `owner-approved` label (ADR-028); no new
   approval mechanism is introduced.
5. `npm run docs:completeness` runs in CI as part of `npm run validate`. `DOCSYS_MODE=report` turns blocking off for
   an emergency without a revert; using it must be recorded in the pull request.
6. This ADR does not change application behaviour, API contracts, data, or authorization.

## Consequences

- New endpoints, models, Feature folders, TODO items, and role flows must be documented in the same
  pull request, or explicitly excepted through a Tier 2 baseline change.
- Documentation debt becomes visible as a shrinking number in the portal and the check report.
- The core can be copied to another project; only config and, for a different stack, adapters change.
- Extractors that parse source code can produce false positives; mitigation is the baseline, the
  report mode, and fixture tests per adapter.

## Alternatives considered

- **Block all gaps immediately** — rejected: every pull request would fail until all debt is paid.
- **Report only** — rejected: no pressure against new gaps.
- **Off-the-shelf stack (VitePress + zod-to-openapi + ERD generator)** — rejected in DOC-PORTAL G1:
  requires changing API route registration, adds dependencies, and still needs custom TODO and UX
  views.
