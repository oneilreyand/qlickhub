# Feature Catalog and Role Flows Plan

**Status:** Active — documentation discovery slice
**Task:** `FEATURE-CATALOG-AND-ROLE-FLOWS`
**Policy boundaries:** `DOC-001`, `DOC-002`, `DOC-003`, `DOC-004`, `DOC-005`
**Related decision:** [ADR-022](../adr/ADR-022-FEATURE-KNOWLEDGE-TREE.md)

## Confirmed facts

- `docs/features/` contains 33 legacy one-file Feature Cards and one `_template` directory; no
  production Feature Card currently uses the folder format.
- The current Feature README explains the future format but is not a catalogue of the 33 cards and
  has no role-first navigation across them.
- The canonical end-to-end lifecycle and role boundaries already live in
  [Workflow and Roles](../2_WORKFLOW_AND_ROLES.md); this task must link to that SSoT, not create a
  competing workflow policy.
- Legacy cards, plans, reports, and external links may point to their current paths.

## Work Readiness Assessment

| Dimension           |      Score | Basis                                                                                               |
| ------------------- | ---------: | --------------------------------------------------------------------------------------------------- |
| Requirement clarity |          1 | The discovery problem and required roles are clear; grouping is a navigation label, not new policy. |
| Affected layers     |          1 | Documentation landing pages and documentation checker only.                                         |
| Data/migration      |          0 | No product data, schema, or migration.                                                              |
| Authorization       |          0 | No runtime role or backend authorization change.                                                    |
| Shared contract     |          0 | Existing contracts are linked, not changed.                                                         |
| Coupling            |          1 | The catalogue points to every legacy Feature Card.                                                  |
| Validation          |          1 | Link/structure checks and a human readability review are required.                                  |
| External dependency |          0 | No deployment, vendor, credential, or live-data dependency.                                         |
| **Total**           | **4 / 16** | **Small — ready, with careful link validation.**                                                    |

## Acceptance criteria and evidence

| Acceptance criterion                                                                                                               | Objective evidence                                                          | Minimum level |
| ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------- |
| A reader can see every current Feature Card once, grouped by product area, with status and a direct source link.                   | Catalogue inventory compared with the 33 files in `docs/features/`.         | E1            |
| Owner/Admin, PO, Developer, and QA each have a short role-first route and a diagram that links back to the canonical workflow.     | `ROLE_FLOWS.md` content review and local-link check.                        | E1            |
| The Feature README is a usable landing page linking to the catalogue, role flows, current/future card formats, and canonical SSoT. | `npm run docs:check` and human readability review.                          | E2 / E1       |
| All legacy Feature paths remain present and unchanged.                                                                             | `git diff --name-status` and pre/post file inventory.                       | E1            |
| The checker catches broken local links from the new navigation documents.                                                          | Existing link validation plus a focused checker test if coverage is absent. | E2            |

## Change Impact Map

`Feature Card inventory → catalogue category → role-first flow → canonical Workflow SSoT → existing
Feature Card / evidence link`

| Area                                                      | Intended impact                                                                                  |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `docs/features/README.md`                                 | Becomes the human-facing entry page, not a format-only instruction page.                         |
| `docs/features/FEATURE_CATALOG.md`                        | Adds a single inventory of the legacy cards without becoming a policy source.                    |
| `docs/features/ROLE_FLOWS.md`                             | Adds four role routes and diagrams that point to canonical workflow rules.                       |
| Documentation checker                                     | Validates the new local navigation links and any catalogue completeness rule added by this task. |
| Existing cards, app, API, data, authorization, deployment | No change.                                                                                       |

## Decision Snapshot

| Alternative                                     | Decision | Consequence                                                  |
| ----------------------------------------------- | -------- | ------------------------------------------------------------ |
| Catalogue + role map first; migrate cards later | Selected | Solves discovery immediately without breaking legacy links.  |
| Bulk-move all 33 cards into folders now         | Rejected | High link churn and an unreviewable documentation migration. |
| Migrate one card at a time without a catalogue  | Rejected | Readers still cannot see the overall product and role flow.  |
| Copy global workflow into each card             | Rejected | Creates competing policy and likely drift.                   |

## Files and bounded rollout

This task may change only the following files:

1. `TODO.md`
2. `docs/features/README.md`
3. `docs/features/FEATURE_CATALOG.md`
4. `docs/features/ROLE_FLOWS.md`
5. `docs/plans/FEATURE_CATALOG_AND_ROLE_FLOWS_PLAN.md`
6. `docs/reports/FEATURE_CATALOG_AND_ROLE_FLOWS_2026-09-30.md`
7. `quality/manifests/FEATURE-CATALOG-AND-ROLE-FLOWS.json`
8. `scripts/checkDocs.mjs`
9. `scripts/checkDocs.test.mjs`

10. Publish the catalogue and role-first pages while leaving every legacy card in place.
11. Validate all new links and the full legacy inventory.
12. Have a human review whether the categories and role entry points make the product discoverable.
13. Migrate an individual Feature to a folder only in a later, separately approved task that maps
    inbound links and preserves a legacy redirect.

Recovery is simple: revert only the catalogue and role-navigation files. Existing Feature Cards and
their links remain untouched.

## Quality review intent

Verify that every catalogue link is unique and live, category labels do not create new product
policy, role flows only summarise and link to the canonical SSoT, no legacy card is duplicated or
moved, and the landing page does not hide unverified production status.
