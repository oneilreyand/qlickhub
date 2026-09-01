# AGY-8.1 — Release Record Cancellation and Task Archival Plan

**Status:** Blocked pending product-direction approval  
**Created:** 2026-09-01  
**Owner request:** A PO could not delete a Feature / Story after clearing visible work because the API reported one QA Sign-off and one Release Decision.  
**Implementation agent:** AGY / Antigravity

## 1. Confirmed current behaviour

- `DELETE /v1/workspaces/:workspaceId/tasks/:taskId` is available only to Owner, Admin, and PO. It soft-deletes the root Task and its direct Subtasks, and writes Task Activity.
- Before deleting, `TaskService.deleteTask` counts records attached to the root Task and every direct Subtask. It rejects the request when any Requirement link, document link, attachment, Bug, QA Sign-off, or Release Decision remains.
- The reported local response is therefore accurate: the Task has no removable links, but has one QA Sign-off and one Release Decision.
- QA Sign-offs and Release Decisions are append-only records. Migration `20260822000054-create-release-decision-records.cjs` has PostgreSQL triggers that reject every update to either source table. Existing policy deliberately keeps them as historical delivery anchors.
- Release readiness, release queues, and `ReleaseAssurancePanel` currently select the newest persisted Sign-off/Decision. They do not have a cancelled-record concept.

## 2. Product decision required before implementation

This proposal changes the current deletion policy. It must not be implemented until the Owner explicitly approves all of the following.

| ID  | Decision needed                                                                               | Recommended default                                                                                                                               |
| --- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Can a Feature / Story be soft-deleted after every release record has been formally cancelled? | **Yes.** Keep the Task and all assurance records in history; remove only the Task from active views.                                              |
| D2  | Is a cancellation reversible?                                                                 | **No.** A cancellation is a final, append-only corrective event. Record a new QA Sign-off/Release Decision only while the Feature remains active. |
| D3  | Who may cancel a QA Sign-off?                                                                 | Original signer, Owner, or Admin. A QA member must not cancel another QA member's record.                                                         |
| D4  | Who may cancel a Release Decision?                                                            | Original decider, Owner, Admin, or PO.                                                                                                            |
| D5  | What is the required sequence?                                                                | Cancel every Release Decision referencing a QA Sign-off first; only then cancel that QA Sign-off.                                                 |
| D6  | How long must cancelled history remain accessible?                                            | Retain indefinitely for Owner/Admin audit; do not hard-delete it.                                                                                 |

If D1 is declined, AGY must not relax Task deletion. The alternative is a distinct **Archive Task** workflow that preserves the Task in historical views and never permits deletion while release history exists.

## 3. Target domain model

Do **not** make `qa_sign_offs` or `release_decisions` mutable. Their immutable snapshots and the PostgreSQL triggers are valuable audit guarantees.

Add two additive, append-only cancellation-event tables instead:

```text
qa_sign_offs ── 0..1 qa_sign_off_cancellations
release_decisions ── 0..1 release_decision_cancellations
```

Each cancellation must contain:

- UUID primary key and `workspace_id`.
- The cancelled record ID and the root `feature_task_id`, each protected by Workspace-scoped foreign keys.
- `cancelled_by`, `cancelled_at`, and required trimmed `reason` (1–20,000 characters).
- Unique `(workspace_id, qa_sign_off_id)` or `(workspace_id, release_decision_id)` so the original record can be cancelled only once.
- A check that the referenced Feature is a root Task, plus indexes for `(workspace_id, feature_task_id, cancelled_at)`.

This design inserts a corrective event rather than updating or deleting an approval. It keeps original snapshots, actor identity, timestamps, and foreign keys intact.

## 4. API and contract work

### Contract changes

In `packages/contracts/src/releaseDecision.ts`:

1. Add `CancelQaSignOffInput` and `CancelReleaseDecisionInput`, both with a mandatory `reason`.
2. Add cancellation summary schemas to `QaSignOff` and `ReleaseDecision`, e.g. `cancellation: { id, cancelledBy, cancelledAt, reason } | null`.
3. Preserve API compatibility: existing fields and existing create inputs must not change.
4. Add contract tests for valid cancellation data, blank/oversized reasons, and response compatibility.

### Endpoints

Add authenticated routes below the existing Feature release routes:

```text
POST /workspaces/:workspaceId/features/:featureTaskId/release-decisions/:releaseDecisionId/cancellation
POST /workspaces/:workspaceId/features/:featureTaskId/qa-sign-offs/:qaSignOffId/cancellation
```

The endpoint name deliberately expresses a new event, not deletion or mutation of an approval.

Each service method must, in one transaction:

1. Resolve active Workspace membership and enforce D3/D4 on the server.
2. Lock the target assurance record and its existing cancellation row.
3. Verify the record belongs to the requested root Feature and Workspace.
4. Reject duplicate cancellation with RFC 9457 `409 CONFLICT`.
5. For QA Sign-off cancellation, reject while an active Release Decision still references it.
6. Insert the cancellation event and a Feature-scoped `TaskActivity` row.
7. Return the formatted source record plus its cancellation summary.

Use human-facing RFC 9457 detail, for example: “Cancel the related Release Decision before cancelling this QA Sign-off.” Do not expose raw database errors.

## 5. Read-model and deletion changes

AGY must update all server-side release reads to treat a record with a cancellation event as historical, not current:

- `listWorkspaceReleaseReadiness` selects the newest **active** QA Sign-off.
- `listFeatureReleaseRecords` returns active and cancelled records, ordered newest-first, with cancellation metadata.
- `createReleaseDecision` may only reference the latest active QA Sign-off; it must reject a cancelled sign-off.
- Work Queue and readiness callers must use the same active-record definition. Do not reproduce the calculation in React.

If D1 is approved, change `TaskService.deleteTask` so it blocks only **active** QA Sign-offs and Release Decisions. Cancelled records remain in PostgreSQL and remain addressable as audit history after the parent Task has been soft-deleted. Preserve the existing protection for Requirement links, documents, attachments, Bugs, and formal QA evidence.

The delete conflict response should distinguish active and cancelled assurance records, so the UI can say exactly which release action is still required. Do not silently delete or cancel any record during Task deletion.

## 6. Frontend work

Likely files:

- `apps/web/src/lib/api/releaseDecisionService.ts`
- `apps/web/src/components/ui/organisms/ReleaseAssurancePanel.tsx`
- `apps/web/src/components/ui/organisms/taskDetail/TaskDeleteConfirmationModal.tsx`
- the existing Task Activity renderer/tests that present `qa.sign_off.*` and `release.decision.*` events.

Required interaction:

1. Show an explicit “Cancelled” badge, canceller, timestamp, and reason on historical QA Sign-offs and Release Decisions.
2. Provide **Cancel Release Decision** only to a role authorized by D4, and **Cancel QA Sign-off** only to a role authorized by D3.
3. Use a shared accessible confirmation modal. It must require a reason, explain that the action cannot be undone, support keyboard focus, and show loading, error, permission-denied, and disabled states.
4. When a linked active Release Decision exists, disable/correctly explain QA Sign-off cancellation and direct the user to cancel the decision first.
5. Refresh release records, backend-derived readiness, Task Activity, and the delete blocker state after a successful cancellation.
6. Keep the original decision history visible; do not hide a cancelled record or recalculate readiness in the browser.

## 7. Authorization matrix

| Action                                      | Owner | Admin |  PO |  QA | Dev |
| ------------------------------------------- | ----: | ----: | --: | --: | --: |
| Cancel own QA Sign-off                      |   Yes |   Yes |  No | Yes |  No |
| Cancel another QA Sign-off                  |   Yes |   Yes |  No |  No |  No |
| Cancel own Release Decision                 |   Yes |   Yes | Yes |  No |  No |
| Cancel another Release Decision             |   Yes |   Yes | Yes |  No |  No |
| Delete Task after all active blockers clear |   Yes |   Yes | Yes |  No |  No |

The API policy/service is authoritative. Buttons are only presentational.

## 8. Migration and data safety

- Use one new canonical additive Sequelize migration; never edit migration 54 or replace its immutable triggers.
- Run it against a clean disposable PostgreSQL database and an upgrade database containing existing Sign-offs and Decisions.
- Existing records receive no backfill row and are therefore active by default.
- Do not run a migration, direct SQL, or cleanup against local/Production user data while implementing this task.
- Document rollback as application rollback plus retained additive tables; do not drop cancellation records from an environment with user data.

## 9. Required validation evidence

AGY must add and run real PostgreSQL integration tests, not model mocks, covering:

1. Owner, Admin, original QA signer, original PO decider, forbidden QA/Dev/non-member/cross-Workspace cases.
2. Blank and overlong reasons, mismatched Feature IDs, duplicate cancellation, and concurrent duplicate requests.
3. Enforced order: active Release Decision prevents QA Sign-off cancellation.
4. Readiness and work queues ignore cancelled records, while the history endpoint still returns them.
5. Cancellation inserts exactly one audit event with the source record ID, cancellation ID, reason, actor, and timestamp.
6. Task delete remains `409` with active records, succeeds only after the approved cancellation sequence and removal of other permitted blockers, and retains all cancellation/activity history after soft deletion.
7. Existing immutable-trigger behaviour remains: direct updates to source Sign-off/Decision records still fail.

Also run focused frontend component/API-client tests for the modal, role visibility, error text, Activity refresh, and cancelled-history presentation. Then run the project contract build, API build/typecheck, frontend typecheck/build, and scoped `git diff --check`. Record commands, pass/fail counts, test database, skipped tests, and warnings in `docs/reports/AGY_8_1_RELEASE_RECORD_CANCELLATION_AND_TASK_ARCHIVAL_<DATE>.md`.

## 10. Non-goals

- No hard deletion of QA Sign-offs, Release Decisions, Test Results, evidence, Bugs, or Activity.
- No automatic cancellation during Task deletion.
- No client-side readiness logic or browser-only audit state.
- No change to the independent-signer rule for Release Decisions.
- No Production deployment or Production database migration without a separate explicit approval after validation.

## 11. Definition of done

AGY may mark `AGY-8.1` Done only when D1–D6 are approved, the migration has clean/upgrade PostgreSQL evidence, authorization and activity tests pass, cancelled records remain visible in history, readiness uses active records only, and a planner can delete an otherwise clear Task only after the approved cancellation sequence. Otherwise leave the TODO item `Blocked` with the unresolved decision or validation evidence.
