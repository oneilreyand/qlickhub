# Feature Documentation Tree Migration — Evidence Report

**Task:** `FEATURE-DOCUMENT-TREE-MIGRATION`
**Status:** Implemented locally — external approval verified; independent verification pending
**Policy boundaries:** `DOC-001`, `DOC-002`, `DOC-003`, `DOC-004`, `DOC-005`

## Scope

This slice adds the folder Feature template, role paths, canonical overview diagram, migration
guidance, and checker compatibility. It does not move, rename, or delete a legacy Feature Card;
it does not change application code, API contracts, data, authorization, or deployment.

## Evidence outcome

On 2026-09-30, `npm run docs:check` passed: 6 tests passed, 0 failed, 0 skipped. `git diff
--check` passed with no whitespace errors. A read-only local-link scan inspected 300 Markdown
documents under `docs/` and found 0 broken local targets.

The checker now validates both legacy single-file Feature Cards and non-template folder cards. Its
new unit test proves that a folder missing a shared document or a required role path is rejected.
The existing 33 legacy Feature Cards passed unchanged. No application test, build, database, or
deployment check was applicable because this slice changes documentation and a Node-only
documentation checker only.

## Quality review

- **Reuse:** the new folder links to the existing SSoT and executable contracts; it does not copy
  their policy or field definitions.
- **Duplicate/overlap:** the legacy format remains explicitly transitional; no Feature Card was
  duplicated or moved in this slice.
- **Obsolete material:** none found. The legacy template is retained deliberately for compatible,
  gradual migration.
- **Boundary:** the role files describe workflow and handoff only; backend authorization remains
  the canonical enforcement boundary.
- **Known gap:** independent review is still required before a PR can merge. GitHub Owner approval
  is recorded in [Issue #1](https://github.com/oneilreyand/qlickhub/issues/1#issuecomment-5902715806).

## Independent verification

Pending independent review of the checked-in diff and command evidence.
