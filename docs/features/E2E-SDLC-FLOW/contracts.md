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

- Migration `20261105000096-add-notification-bug-id` (P6) adds nullable `notifications.bug_id`,
  FK `(workspace_id, bug_id)` → `bugs(workspace_id, id)` `ON DELETE SET NULL (bug_id)`, and a
  partial index; it backfills older Bug notifications from `notification_outbox.payload_json.bugId`
  where `idempotency_key = event_key:recipient_user_id`.

## API and executable contract

| Endpoint                                                                      | Change                                                                                                                           |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `GET /v1/workspaces/:workspaceId/tasks/:taskId/developer-readiness`           | New. Active member with access to the QA subtask; `400` for a non-QA subtask. Body `{ readiness }` (`DeveloperReadinessSchema`). |
| `POST /v1/workspaces/:workspaceId/test-cases/:testCaseId/runs`                | `409` while readiness is not met (`QA-010`).                                                                                     |
| `POST /v1/workspaces/:workspaceId/test-cases/:testCaseId/runs/:runId/results` | For a contextual retest Run, also records the Retest Attempt in the same transaction.                                            |
| `POST /v1/workspaces/:workspaceId/qa-test-cycles`                             | Marks older open cycles of the QA subtask `superseded`.                                                                          |
| `GET /v1/workspaces/:workspaceId/my-work-queue`                               | QA items: one per own open QA subtask; reason from readiness.                                                                    |
| Bug context (`BugWithContextSchema`)                                          | `originatingTestResult.testRun.qaSubtaskId` and `qaAssigneeId` (optional).                                                       |

| `GET /v1/notifications` and realtime/push (`InAppNotificationSchema`) | `bugId` (optional) on Bug notifications; push `data.bugId` and link `/work/bugs/:id`. |
| `POST /v1/workspaces/:workspaceId/tasks/:taskId/complete-qa-review` | New (P7). Route `qa`; only the QA assigned to the QA subtask. Body `CompleteQaReviewSchema` `{ approveSubtaskIds }` (Developer subtasks of the same Feature in `in_review`). One transaction: each approval uses the QA reviewer transition, then the QA subtask goes `done` through the QA completion gate; any failure rolls back all. `409` for a subtask not in review. Body `{ data: { qaSubtask, approvedSubtasks } }`. |
| `GET /v1/workspaces/:workspaceId/my-work-queue` (P7) | Planner item `approve_product_brief` ("Setujui Brief") while the Feature's primary Product Brief is not `approved`. |
| `GET /v1/workspaces/:workspaceId/tasks/:taskId/test-executions` (P7, existing) | Now read by the Developer work page (read-only); no API change. |

Sources: `packages/contracts/src/notification.ts` (`bugId`), `packages/contracts/src/task.ts` (`CompleteQaReviewSchema`), `packages/contracts/src/workQueue.ts` (`approve_product_brief`), `packages/contracts/src/testManagement.ts` (`DeveloperReadinessSchema`),
`packages/contracts/src/bug.ts`.

## Boundary notes

- P7 adds no migration. The Developer build and environment travel as labelled lines
  (`Build:`, `Lingkungan:`) in the existing `ready_for_qa` comment (`apps/web/src/lib/utils/qaHandoff.ts`).

- Backend: `developerReadiness.ts`, `testManagementService.ts`, `bugService.ts`,
  `workQueueService.ts`, `aiTaskDraftPersistence.ts`, `requirementCodes.ts`.
- Frontend: QA work page, Test Case run page, Bug page, Feature page, Tugas Saya, Brief editor,
  API client error copy.
- Unaffected: authentication, Workspace membership management.
