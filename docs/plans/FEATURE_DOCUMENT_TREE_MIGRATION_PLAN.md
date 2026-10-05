# Feature Documentation Tree Migration Plan

**Status:** Implemented (template and compatibility slice) — merged via PR #6 (`5421930`); individual card migrations remain separate tasks (see [report](../reports/FEATURE_DOCUMENT_TREE_MIGRATION_2026-09-30.md))
**Task:** `FEATURE-DOCUMENT-TREE-MIGRATION`
**Policy boundaries:** `DOC-001`, `DOC-002`, `DOC-003`, `DOC-004`, `DOC-005`
**Decision record:** [ADR-022](../adr/ADR-022-FEATURE-KNOWLEDGE-TREE.md)

## Confirmed facts

- The repository has 33 Feature Cards in the legacy one-file format and no folder Feature Card.
- The existing checker validates each card's metadata, headings, Policy IDs, and selected local
  links, but it cannot recognize a Feature folder or require role-path files.
- Existing reports, plans, and external references may link directly to legacy card paths.

## Work Readiness Assessment

| Dimension           |      Score | Basis                                                                                             |
| ------------------- | ---------: | ------------------------------------------------------------------------------------------------- |
| Requirement clarity |          1 | Folder, role paths, and diagram are requested; migration timing is intentionally incremental.     |
| Affected layers     |          1 | Documentation structure and checker only.                                                         |
| Data/migration      |          0 | No product persistence or database migration.                                                     |
| Authorization       |          0 | Documents clarify but do not alter backend authorization.                                         |
| Shared contract     |          1 | Feature navigation references existing executable contracts.                                      |
| Coupling            |          2 | All future cross-role Feature Cards use the convention.                                           |
| Validation          |          1 | Checker unit test, full docs check, local-link scan, and human review.                            |
| External dependency |          0 | No deployment, token, or vendor configuration.                                                    |
| **Total**           | **6 / 16** | **Medium — template/compatibility slice is ready; individual migrations need separate approval.** |

## Acceptance criteria and evidence

| Acceptance Criterion                                                                                           | Objective evidence                          | Minimum level |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------- |
| New cross-role Feature has one folder, diagram overview, and focused Owner/Admin, PO, Developer, and QA paths. | Template file inventory and checker test.   | E2            |
| Existing single-file cards remain valid.                                                                       | `npm run docs:check` against current cards. | E2            |
| Folder card lacks required shared/role document and is rejected.                                               | Checker unit test.                          | E2            |
| No legacy Feature is moved, renamed, or deleted in this slice.                                                 | Diff review and Feature inventory.          | E1            |

## Change Impact Map

`Feature request → README diagram → role path or shared document → executable contract / SSoT →
testing evidence → report`

| Area                               | Impact                                                                |
| ---------------------------------- | --------------------------------------------------------------------- |
| Feature documentation              | Adds folder format and gradual migration rule.                        |
| Agent reading path                 | Starts at `README.md`, then reads only the relevant role/shared path. |
| Documentation checker              | Supports legacy cards and validates new folder completeness.          |
| Application, data, API, deployment | No change.                                                            |

## Decision Snapshot

| Alternative                                        | Decision             | Consequence                                                       |
| -------------------------------------------------- | -------------------- | ----------------------------------------------------------------- |
| Folder overview plus focused role/shared documents | Selected             | Easy role navigation without duplicating policy.                  |
| Separate role documents only                       | Rejected             | Shared scope and traceability fragment.                           |
| Bulk migration                                     | Rejected             | Creates unreviewable link churn.                                  |
| Legacy cards forever                               | Retained temporarily | Preserves valid links while active Features migrate deliberately. |

## Bounded rollout and recovery

1. Publish the template, ADR, navigation rule, and checker compatibility.
2. Use the folder for new cross-role Features immediately.
3. Migrate one actively changed Feature only after a separate approved plan identifies inbound links,
   exact files, and evidence; preserve a legacy redirect before removing an old path.
4. If the format proves unclear, stop new migrations; legacy cards continue to work and no product
   rollback is required.

## Quality review intent

Verify no global policy or executable contract is copied into role documents, no existing Feature
is silently moved, role labels match canonical RBAC, the diagram includes failure/retest flow, and
the checker rejects incomplete folders while continuing to accept legacy cards.
