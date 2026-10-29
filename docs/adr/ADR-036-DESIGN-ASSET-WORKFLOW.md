# ADR-036: Design Asset Workflow — Canvas as Working File, Text Source and WebP Exports in the Repository

**Status:** Accepted — effective when merged with the Owner's `owner-approved` label (Tier 2)
**Date:** 2026-10-29
**Decision owner:** Product (Owner) — reyand, approved in Claude chat 2026-10-29
**Implementation stakeholders:** Product, Frontend, QA, and AI agents
**Policy IDs:** DOC-007 (new), DOC-002, DOC-004, DOC-005, UI-001

## Context

UI designs are produced in a private claude.ai Design canvas. A private link cannot be a source of
truth (ADR-035): repository readers and other agents cannot open it. SIMPLE-UI-DELIVERY-FLOW
therefore committed exported PNGs to `docs/features/SIMPLE-UI-DELIVERY-FLOW/design/`.

Measured on `main` @ `04ff4f4` (2026-10-29): `docs/` holds 48 PNG files totalling about 8.2 MB, of
which that design folder is 4.5 MB; `.git` is about 84 MB. Every committed image revision stays in
history permanently, so exporting on each design iteration grows the repository without bound. The
canvas source of the WORK-VISIBILITY design is about 76 KB of text, and its seven screens measure
1.6 MB as PNG and 0.48 MB as WebP (quality 80).

## Decision

1. **The canvas is a working file, never the reference.** Iterate there freely; nothing is
   committed per iteration.
2. **A design folder is a directory named `design` under `docs/`.** It contains:
   - `README.md` — status, link to the canvas, the plan/Feature it serves, a table mapping each
     exported file to its artboard, what is not yet designed, and how to re-export;
   - `source/` — the canvas source as text (artboard `.dc.html` files and `canvas.json`), plus any
     export script, so images can be regenerated without the canvas;
   - exported images — **WebP only, at most 300 KB per file**.
3. **Export at gates only.** Export images when a design is approved (G2, or an approved revision),
   and re-export only the screens that changed. Desktop for every screen; phone and dark variants
   for primary screens unless the PRD requires more.
4. **Enforcement.** `npm run docs:check` rejects a design folder without `README.md`, without a
   non-empty `source/`, with a non-WebP raster image, or with a WebP over 300 KB.
5. **Legacy.** `docs/features/SIMPLE-UI-DELIVERY-FLOW/design/` (PNG, no `source/`) is exempt until
   it is next revised; any revision converts it. Evidence screenshots in `docs/screenshots/` and
   reports are out of scope of this decision.

## Consequences

- The repository keeps reviewable, regenerable design source; images grow only at gates and are
  about 70% smaller.
- Designers and agents need a WebP converter (`cwebp`, or any image library) when exporting.
- The export renderer in a design folder is a simplified preview of the canvas runtime; the canvas
  remains the visual reference while a design is in progress.
- Moving a design from a plan folder into a Feature folder keeps the same structure.

## Alternatives considered

| Option                                                             | Pro                    | Con                                                                                 | Decision                                                          |
| ------------------------------------------------------------------ | ---------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Images outside the repository (Drive, Supabase Storage) with links | Zero repository growth | Links can break or be private; agents cannot read them; weakens repository evidence | Rejected                                                          |
| Git LFS                                                            | History stays light    | Setup in GitHub and Vercel, storage quota, every agent must support LFS             | Rejected for current size; revisit if design assets exceed ~50 MB |
| Keep PNG exports per iteration                                     | No new tooling         | Unbounded history growth                                                            | Rejected                                                          |
