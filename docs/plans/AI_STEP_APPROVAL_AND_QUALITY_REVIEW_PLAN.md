# AI Step Approval and Quality Review Plan

**Status:** Implemented — `AI-STEP-APPROVAL-AND-QUALITY-REVIEW` archived as Done (see [archive](../archive/TODO_COMPLETED_2026-10-02.md))
**Date:** 2026-09-29
**Owner:** Product and Engineering
**Applicable Policy IDs:** `AI-002`, `AI-003`, `AI-004`, `AI-005`, `AI-006`, `AI-007`, `AI-008`, `AI-009`, `AI-010`, `DOC-001`, `DOC-002`, `DOC-003`, `DOC-004`

## Confirmed facts

- ADR-016 defines WRA, evidence levels, impact analysis, and independent verification.
- ADR-017 already requires explicit approval of a repository-changing plan, but not approval of
  each subsequent state-changing action.
- The Product explicitly approved adding a stricter no-assumption, step-approval control and an
  auditable quality-review requirement on 2026-09-29.

## Scope and decision

Create one canonical operational definition in Agent & Developer Guidelines §2A.A.1 and §2A.H;
link to it from AGENTS.md, the Product Knowledge Map, Architecture, Policy Registry, ADR history,
and the canonical report template. The change applies to agent governance only. It does not alter
application behavior, shared contracts, database schema, authorization, migrations, or deployment.

## Work Readiness Assessment

**4/16 — `Ready`:** requirement clarity 1, affected layers 0, data/migration 0, authorization 0,
shared contract 0, coupling 2, validation 1, external dependency 0. Every AC has E1 inspection and
E2 documentation-gate evidence. Existing unrelated AI Task Generator changes are out of scope and
will be preserved.

## Acceptance Criteria and evidence

| Acceptance Criterion                                                                                               | Minimum evidence                                                          |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Every state-changing step requires bounded explicit approval and read-only inspection cannot imply approval.       | E1 canonical guideline/ADR/registry inspection; E2 `npm run docs:check`.  |
| Unknown facts and changed scope cannot silently advance work.                                                      | E1 canonical guideline and AGENTS.md inspection; E2 `npm run docs:check`. |
| Completion review covers DRY/reuse, overlap, obsolete or unused code, boundaries, and regression evidence.         | E1 guideline and report-template inspection; E2 `npm run docs:check`.     |
| The policy has a single canonical operational definition with traceable ADR, registry, map, and report references. | E1 link/diff inspection; E2 `npm run docs:check`.                         |

## Change Impact Map

**Cross-boundary documentation governance:** Agent instructions, canonical AI protocol, navigation
map, Architecture governance reference, Policy Registry, ADR decision/index, report template,
plan/report evidence, and TODO. No runtime module, contract, data, authorization, migration, or
release behavior changes.

## Decision Snapshot

**Chosen:** require approval per state-changing step, with explicitly enumerated finite sequences
permitted; permit read-only fact-finding; attach an evidence-backed completion review. **Benefit:**
the user retains control and the audit distinguishes fact from assumption. **Cost:** more checkpoints.
**Rejected:** task-wide approval because it allows accidental scope expansion; approval even for
read-only inspection because it blocks meaningful fact discovery. **Recovery:** revert this additive
documentation policy through a new approved ADR if Product changes the operating model.

## Validation and completion

Run `git diff --check` and `npm run docs:check`. Inspect changed links and ensure no unrelated
working-tree change is modified. Record actual results, quality-review method, and verification
status in the report; mark TODO `Done` only when those checks pass.
