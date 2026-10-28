# ADR-034: UI Theme Contract and Coverage Gate

**Status:** Accepted — effective when merged
**Date:** 2026-10-25
**Decision owner:** Product (Owner) — user approval in Codex chat, 2026-10-25
**Implementation stakeholders:** Frontend, QA, and AI agents
**Feature:** [UI-WORKSPACE-REFRESH](../features/UI-WORKSPACE-REFRESH/README.md)
**Policy IDs:** UI-001, UI-002, UI-003, UI-004, UI-005, SDLC-001

## Context

Qlick Hub has a class-based theme provider and semantic CSS variables, but visual components have
historically been able to hard-code a dark surface without a light counterpart. The Task Hub
Schedule card demonstrated the regression: the application was in Light mode while the card used
an unconditional dark background, border, and foreground. Existing lint/typecheck/build checks do
not classify this as an error.

## Decision

1. All production web visual components and pages use semantic theme tokens or paired Light/Dark
   utilities for surfaces, borders, foregrounds, focus states, and relevant async/permission
   states.
2. `npm run theme:check` scans production component and page source. It rejects a visual module
   with no Light/Dark strategy and rejects an unconditional dark application surface. The command
   is included in `npm run validate`.
3. Full-bleed image/video viewers may use an invariant dark media stage only with a documented
   `theme-check: invariant-media` reason. This exception is not valid for normal application UI.
4. The checker is a preventive static guard. Component tests and browser checks still prove
   behavior, contrast, focus, and responsive presentation in Light and Dark modes.

## Consequences

- New visual code cannot silently add a one-theme module to the validation path.
- Existing components are remediated and browser-reviewed in bounded UI-WORKSPACE-REFRESH phases;
  checker coverage alone is not a claim of runtime accessibility.
- No API, shared contract, database, authorization, or deployment behavior changes.

## Alternatives considered

- **Manual visual review only** — rejected because the Schedule regression was not caught before
  review and manual review does not protect future pull requests.
- **Convert every color utility to one global palette at once** — rejected because broad blind
  replacement risks status semantics, media presentation, and unrelated role flows.
- **Theme checker plus phased remediation** — selected because it blocks new omissions immediately
  while retaining targeted, verifiable browser evidence for existing surfaces.
