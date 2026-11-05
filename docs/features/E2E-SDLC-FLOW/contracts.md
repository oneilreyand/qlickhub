# E2E-SDLC-FLOW — Data, API, and Shared Contracts

**Status:** Disetujui
**Applicable Policy IDs:** DOC-005, QA-010, DATA-001

## Data and relations

- No new table for the flow. Readiness is computed from `tasks` (Developer subtasks of the Feature,
  non-QA, not canceled) and `task_requirements`.
- `qa_test_cycles.status` uses the existing `superseded` value for older open cycles of the same QA
  subtask.
- Migration `20261105000095-shorten-applied-requirement-codes` renames `requirements.code` values
  `REQ-<uuid>` to `REQ-001`, … per Workspace (ordered by `created_at`, after the highest numeric
  `REQ-<n>`), and creates `requirement_code_renames (requirement_id, workspace_id, old_code,
new_code, renamed_at)` for audit and `down`. `requirement_findings.requirement_code` is an
  immutable snapshot and keeps the old label.
- Apply (`persistReviewedDraftInTransaction`) takes `pg_advisory_xact_lock` per Workspace and
  assigns the next numbers (`apps/api/src/modules/requirements/requirementCodes.ts`).

## API and executable contract

| Endpoint                                                                      | Change                                                                                                                           |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `GET /v1/workspaces/:workspaceId/tasks/:taskId/developer-readiness`           | New. Active member with access to the QA subtask; `400` for a non-QA subtask. Body `{ readiness }` (`DeveloperReadinessSchema`). |
| `POST /v1/workspaces/:workspaceId/test-cases/:testCaseId/runs`                | `409` while readiness is not met (`QA-010`).                                                                                     |
| `POST /v1/workspaces/:workspaceId/test-cases/:testCaseId/runs/:runId/results` | For a contextual retest Run, also records the Retest Attempt in the same transaction.                                            |
| `POST /v1/workspaces/:workspaceId/qa-test-cycles`                             | Marks older open cycles of the QA subtask `superseded`.                                                                          |
| `GET /v1/workspaces/:workspaceId/my-work-queue`                               | QA items: one per own open QA subtask; reason from readiness.                                                                    |
| Bug context (`BugWithContextSchema`)                                          | `originatingTestResult.testRun.qaSubtaskId` and `qaAssigneeId` (optional).                                                       |

Sources: `packages/contracts/src/testManagement.ts` (`DeveloperReadinessSchema`),
`packages/contracts/src/bug.ts`.

## Boundary notes

- Backend: `developerReadiness.ts`, `testManagementService.ts`, `bugService.ts`,
  `workQueueService.ts`, `aiTaskDraftPersistence.ts`, `requirementCodes.ts`.
- Frontend: QA work page, Test Case run page, Bug page, Feature page, Tugas Saya, Brief editor,
  API client error copy.
- Unaffected: authentication, Workspace membership management, notifications schema.
