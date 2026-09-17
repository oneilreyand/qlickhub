## Task

QA-ASSURANCE-S2A-TEST-CASE-VERSION-AC-FOUNDATION

## Outcome

The database now has an additive Test Case version foundation with immutable definition snapshots and a Workspace-safe Acceptance Criterion mapping table. Every Test Case present when migration 71 runs receives deterministic revision `1`, containing a complete definition and Requirement-link snapshot. Migration 72 later permits only the controlled lifecycle transitions needed for review/publication; it cannot alter a snapshot definition. Legacy Acceptance Criteria are deliberately left unmapped until a QA author maps or explicitly excludes them in the forthcoming revision workflow.

## Source of truth and impact

- **Applicable SSoT:** [Architecture](../1_ARCHITECTURE.md), [Workflow and Roles](../2_WORKFLOW_AND_ROLES.md), and [QA execution and release plan](../plans/QA_EXECUTION_RELEASE_ASSURANCE_PLAN.md).
- **Policy IDs:** `QA-006`, `QA-009`, `RELEASE-003`, `DOC-002`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** Migration `20260915000071` adds `test_case_versions` and `test_case_version_acceptance_criteria`. There is no external API or UI contract change in this data-foundation slice.
- **Authorization impact:** None at runtime in this slice. The tables establish provenance required for later QA-author revision workflows and PO publication.
- **Migration risk:** Additive. Existing Test Case rows and Requirement links remain in place. The migration inserts one revision-1 snapshot per pre-existing Test Case without changing legacy rows. Rollback drops only the two new versioning tables and must not be used after production versioning data exists without a recovery plan.

## Changed files

- `apps/api/src/db/migrations/20260915000071-create-test-case-version-and-ac-mapping-foundation.cjs` — creates both tables, Workspace-scoped composite foreign keys, mapping/exclusion constraints, and deterministic legacy snapshot backfill.
- `apps/api/src/db/models/testCaseVersion.ts` and `apps/api/src/db/models/testCaseVersionAcceptanceCriterion.ts` — Sequelize persistence models.
- `apps/api/src/db/models/index.ts` and `apps/api/src/db/models/associations/qaAssociations.ts` — model exports and associations.
- `apps/api/src/db/__tests__/testCaseVersionFoundationIntegration.test.ts` — PostgreSQL regression coverage for snapshot persistence, immutability, revision uniqueness, and AC mapping.

## Validation

- `npm run build` in `apps/api` — passed.
- `npm run db:verify:clean-migrations` — passed on a newly created and automatically removed PostgreSQL database; migrations 17–71 applied successfully.
- `npx sequelize-cli db:migrate:undo --name 20260915000071-create-test-case-version-and-ac-mapping-foundation.cjs --env test && npm run db:migrate:test` — passed on the test database; migration 71 was rolled back and reapplied to verify both directions for the new tables.
- `NODE_ENV=test node --test dist/db/__tests__/testCaseVersionFoundationIntegration.test.js` — passed: 1/1 PostgreSQL integration test, 0 skipped. This was re-run after migration 72 added controlled lifecycle transitions.

## Risks or follow-up

- Publication, review/rejection, and immutable revision creation endpoints/UI are intentionally not implemented yet; legacy mutable Test Case fields remain the active runtime path until S2B.
- Test Runs are not pinned to a Test Case version in this slice. S3 adds that pin together with Feature, QA Subtask, Test Cycle, candidate, and environment scope.
- AC mappings are currently empty for backfilled revisions by design; a later QA mapping workflow must make each active AC mapped or explicitly excluded before AC-level release enforcement begins.

## TODO update

- `QA-ASSURANCE-S2A-TEST-CASE-VERSION-AC-FOUNDATION` → `Done`
