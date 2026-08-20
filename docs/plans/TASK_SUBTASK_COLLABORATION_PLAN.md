# Parent Tasks, Subtasks, Activity, and Discussion Plan

**Status:** approved product scope — ready for phased delivery  
**Created:** 2026-08-13  
**Architecture Decision Record:** [`docs/adr/ADR-001-CORE-DOMAIN-AND-COLLABORATION-DECISIONS.md`](file:///Users/mac/Documents/GitHub/QAREPORT/docs/adr/ADR-001-CORE-DOMAIN-AND-COLLABORATION-DECISIONS.md)  
**Supersedes:** the hierarchy decision in `QA_NATIVE_WORK_HUB_DELIVERY_PLAN.md` only to add one direct subtask level.

## 1. Outcome

A Product Owner can divide a parent task into accountable FE, BE, and QA subtasks. Each subtask has its own assignee, status, priority, and schedule, while the parent task gives the delivery team one concise progress view.

The task detail also contains two separate collaboration surfaces:

- **Activity** is an immutable, server-generated audit of task changes.
- **Discussion** is a persisted message thread for people collaborating on that task.

All data remains Workspace-scoped and authorised by the API. This is not a global chat product and does not introduce arbitrary task nesting.

## 2. Product decisions and business logic

### 2.1 Task hierarchy

```text
Workspace → Folder → Subfolder → Parent Task → Subtask
```

- A task with `parentTaskId = null` is a **parent task**. Existing tasks remain valid parent tasks.
- A **subtask** has exactly one parent task and cannot have children of its own.
- A parent and every direct subtask must share one Workspace and one folder (or all be unfiled). A subtask never appears in a different delivery folder from its parent.
- Moving a parent task to another folder moves all of its direct subtasks in the same database transaction. A subtask cannot be moved independently.
- Parent deletion is not in scope. If it is introduced later, it must be blocked while subtasks exist or explicitly cascade through an audited transaction.

### 2.2 FE, BE, and QA responsibility

- A subtask has required `deliveryArea`: `frontend`, `backend`, or `qa`.
- The delivery area is a planning label, not a replacement for a member's Workspace role.
- Every assigned user must be an active member of the same Workspace.
- A PO can create subtasks for FE, BE, and QA and assign them to the relevant members.
- A parent task displays a completion summary, for example `2/3 complete` and `FE 1/1 · BE 0/1 · QA 1/1`.
- Parent status is not auto-completed when every subtask is done. The parent remains a deliberate PO/Owner/Admin decision; its progress is derived only for display.

### 2.3 Parent list grouped by status

- The Work Hub's primary task list displays parent tasks only and groups them in this order: `To Do`, `In Progress`, `In Review`, `Done`, `Canceled`.
- Each group is collapsible and shows its parent-task count.
- Existing date, folder, search, and status filters apply before grouping.
- Subtasks remain inside their parent card/detail. They are not duplicate top-level rows.
- A subtask's status affects the parent progress summary, not the status group of the parent task.

### 2.4 Role policy

| Operation | Owner/Admin | PO | Assigned Dev | Assigned QA | Other member |
|---|---:|---:|---:|---:|---:|
| Read parent, subtasks, Activity, Discussion | yes | yes | yes | yes | yes |
| Create/plan/assign subtask | yes | yes | no | no | no |
| Edit subtask title, area, assignee, priority, dates | yes | yes | no | no | no |
| Edit parent title, planning fields, or status | yes | yes | no | no | no |
| Update own subtask execution status/description | yes | no | yes | yes | no |
| Move parent and its subtasks | yes | yes | no | no | no |
| Post a Discussion message | yes | yes | yes | yes | yes |
| Edit/delete own message | yes | yes | yes | yes | yes |
| Moderate another user's message | yes | no | no | no | no |

The API policy layer enforces this matrix. UI visibility is convenience only.

### 2.5 Activity and Discussion

**Activity** records server-side changes such as parent/subtask creation, assignment, delivery-area change, status change, schedule change, and parent move. It includes actor, timestamp, action, and a safe change summary. Activity cannot be authored, edited, or removed by the browser.

The parent Activity view aggregates direct-subtask events in chronological order and labels the affected subtask. A subtask still has its own focused Activity view.

**Discussion** is a task-scoped message thread. Every Workspace member can read and participate. A message may mention Workspace members and may reply once to another message. Messages have `editedAt`/`deletedAt`; a deleted message retains an audit-safe tombstone rather than disappearing from moderation history.

Messages are visible to the whole Workspace through the task thread. V1 stores mentions and refreshes the thread after a send; real-time delivery, unread counters, and broad broadcast notifications are a later phase. If a broadcast notification is added later, only Owner/Admin/PO may send it and the UI must require confirmation.

## 3. Data and integrity design

### 3.1 Extend `tasks`

```text
tasks
  parent_task_id?        -- nullable for parent/legacy tasks
  delivery_area?         -- frontend | backend | qa; required for a subtask
```

The migration must be additive and leave existing records as parent tasks.

- Add `UNIQUE (id, workspace_id)` to support Workspace-scoped composite references.
- Add `(parent_task_id, workspace_id) → tasks(id, workspace_id)` with `ON DELETE RESTRICT`.
- Add a check that `parent_task_id IS NULL OR parent_task_id <> id`.
- Add an index for `(workspace_id, parent_task_id, created_at)`.
- Use a PostgreSQL trigger to reject a nested subtask, enforce the same folder as its parent, and enforce that `delivery_area` is present only for a subtask. Service validation remains required but is not the sole integrity boundary.

### 3.2 New records

```text
task_activity
  id, workspace_id, task_id, actor_id?, action, metadata_json,
  created_at

task_comments
  id, workspace_id, task_id, author_id, parent_comment_id?, body,
  edited_at?, deleted_at?, created_at, updated_at

task_comment_mentions
  comment_id, user_id, created_at
```

- `task_activity` is append-only for application users.
- `task_comments` and `task_comment_mentions` use composite Workspace-scoped foreign keys wherever the database supports them.
- Replies are limited to one level and must target a comment on the same task.
- Mention targets must be active members of the same Workspace.
- All task mutations that affect a user-visible field write their Activity event in the same Sequelize transaction.

## 4. API contract and service design

New contracts belong in `packages/contracts`; controllers accept only validated contract input.

| Endpoint | Purpose |
|---|---|
| `GET /v1/workspaces/:workspaceId/tasks?rootOnly=true&includeSubtaskSummary=true` | Parent-task list for status grouping, with progress counts. |
| `GET /v1/workspaces/:workspaceId/tasks/:taskId/subtasks` | Paginated direct subtasks for one parent. |
| `POST /v1/workspaces/:workspaceId/tasks/:taskId/subtasks` | PO/Admin/Owner creates a planned FE/BE/QA subtask. |
| `PATCH /v1/workspaces/:workspaceId/tasks/:taskId` | Field-level policy distinguishes planning updates from an assignee's execution updates. |
| `GET /v1/workspaces/:workspaceId/tasks/:taskId/activity` | Paginated audit timeline; parent requests aggregate direct-subtask events. |
| `GET /v1/workspaces/:workspaceId/tasks/:taskId/comments` | Paginated Discussion thread with replies and mention metadata. |
| `POST /v1/workspaces/:workspaceId/tasks/:taskId/comments` | Create a message and validate mentions. |
| `PATCH` / `DELETE /v1/workspaces/:workspaceId/tasks/:taskId/comments/:commentId` | Edit own message or soft-delete according to the role policy. |

Backward compatibility: the existing task list retains its current default unless the Work Hub explicitly requests `rootOnly=true`. This prevents other consumers from silently losing child tasks.

## 5. UI design

Reuse the existing Atomic Design system: `Tabs`, `Drawer`, `Modal`, `Button`, `Badge`, `Skeleton`, and Snackbar infrastructure.

- `TaskCollection` gains collapsible parent-task status groups.
- A parent row/card exposes progress, FE/BE/QA chips, assignee/status preview, and an accessible **View subtasks** control.
- `TaskDetailDrawer` gains **Overview**, **Subtasks**, **Activity**, and **Discussion** tabs.
- The Subtasks tab offers a PO/Admin/Owner **Add subtask** modal and individual status controls only when the policy permits them.
- The Activity tab has loading, empty, error, and pagination states. Its empty state says that no changes have been recorded.
- The Discussion tab has loading, empty, error, disabled, and permission-denied states. It uses labelled controls, keyboard-operable replies, and an `@mention` picker constrained to Workspace members.
- On mobile, the task detail remains a full-width drawer/page and all status groups retain touch-safe controls.

## 6. Delivery phases

### ST1 — Contracts, migration, and models

Add task hierarchy/delivery-area contracts; canonical migration; Sequelize models and associations for subtasks, Activity, comments, and mentions; composite keys, trigger, and indexes.

**Acceptance:** a clean migration succeeds; raw cross-Workspace, self-parent, nested-subtask, folder-mismatch, and invalid-delivery-area writes are rejected.

### ST2 — Parent/subtask API and role policy

Implement service, controllers, routes, field-level policy, parent move propagation, and parent-list subtask summaries.

**Acceptance:** PO can plan/assign FE-BE-QA subtasks; an assigned Dev/QA member can update only their execution work; all other forbidden mutations return RFC 9457 403.

### ST3 — Immutable Activity audit

Create Activity events in the same transaction as task/subtask mutations and expose paginated focused/aggregated read APIs.

**Acceptance:** parent timeline correctly includes labelled subtask events, cannot be forged by the browser, and cannot cross Workspace boundaries.

### ST4 — Persisted Discussion

Implement messages, one-level replies, mentions, soft-delete/moderation, and full membership authorization.

**Acceptance:** every Workspace member can collaborate in the task thread; non-members cannot read, mention, or post; discussion remains separate from the audit log.

### ST5 — Work Hub parent-task UI

Build grouped parent list, subtask summary, detail tabs, planning modal, Activity, Discussion, and responsive task detail UI.

**Acceptance:** a PO can plan FE/BE/QA from a parent task; the assigned team sees its work; parent progress and timeline update from API data on desktop and mobile.

### ST6 — Quality gate and release

Add database/API/frontend regression tests, run clean migration and all builds, validate keyboard/mobile/error states, and record release evidence.

**Acceptance:** all integrity, role, message visibility, and UI flows pass in a clean Workspace with no local-only task, audit, or message data.

## 7. Explicit exclusions

- No arbitrary-depth subtasks.
- No global chat, direct messages, or browser-only messages.
- No live WebSocket delivery, unread counters, or broad push notifications in V1.
- No file uploads in Discussion until the authorised evidence-storage workflow is available.
- No automatic completion of parent tasks from subtask completion.
