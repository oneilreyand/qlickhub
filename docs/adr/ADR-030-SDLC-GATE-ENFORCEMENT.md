# ADR-030: SDLC Gate Enforcement in CI

**Status:** Accepted — effective when merged with the Owner's `owner-approved` label (Tier 2)
**Date:** 2026-10-13
**Decision owner:** Product (repository Owner)
**Refines:** [ADR-029](ADR-029-STAGED-FEATURE-SDLC.md)
**Policy boundary:** `SDLC-002` (new), `SDLC-001`, `DOC-004`, `DOC-005`

## Context

ADR-029 made the staged SDLC the documented rule, but only file presence was machine-checked. Four
gaps remained: no Feature folder existed yet; nothing required runtime code to be preceded by an
approved record, so a single-file card or no card at all could still accompany code; stage documents
could stay as placeholders after being marked approved; and gate approvals lived only in chat. The
Owner asked for the documentation flow to be consistent and enforced rather than advisory.

## Decision

1. `scripts/sdlcNew.mjs` (`npm run sdlc:new`) is the supported way to create a Feature folder or a
   Quick Card, so every record starts from the current template.
2. `npm run docs:check` validates every Feature folder Stage Tracker and every Quick Card: stage 0–6
   rows, allowed statuses, monotonic approval, approver/date for approved stages, one Status and no
   placeholders in approved stage documents, and WRA ≤ 4/16 for Quick Cards.
3. CI runs `npm run sdlc:check -- --base <PR base>`. A change to `apps/`, `packages/`, `api/`, or
   `database/` passes only when the same change updates a Feature folder whose stage 3 Breakdown is
   approved with approver/date, or an approved Quick Card. Adding a new single-file Feature Card fails.
4. The check proves that a gate was recorded, not that its content is correct; semantic review and
   independent verification remain required (`AI-004`).
5. Existing legacy cards and already-merged work are not retroactively blocked; open branches must
   satisfy the check before merge.

## Consequences

- Code cannot reach `main` without a visible, approved SDLC record.
- Small fixes need a Quick Card, which adds a few minutes per change.
- `scripts/check*.mjs` and `.github/**` remain Tier 2, so weakening this gate needs the Owner's label.

## Alternatives considered

- **PR-description check:** rejected; descriptions are editable outside review history and are not
  reproducible locally.
- **Keep instructions only:** rejected; recent branches changed policy and schema without records.
- **Require an approved Feature folder even for small fixes:** rejected as disproportionate.

## Rollback

Remove the `sdlc:check` CI step and the Stage Tracker validation in a Tier 2 PR with a superseding ADR.
