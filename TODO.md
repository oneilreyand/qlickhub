# TODO — Folder Hierarchy & Task Management

Status values: `Todo`, `In progress`, `Blocked`, `Done`.

## Product decision

Folder represents a stable work structure, not a calendar. Use this hierarchy:

```text
Workspace → Initiative / Release → Feature / Workstream → Parent Task → Subtask
```

Tasks store `startDate`, `dueDate`, `completedAt`, `status`, and `priority`. A parent task may have one direct subtask level only; subtasks inherit the parent's workspace and folder. Daily, weekly, monthly, and overdue views are API-backed filters—not persisted folders.

## Instructions for the agent

1. Claim exactly one item by changing its status to `In progress` and add your agent name/date.
2. Read `AGENTS.md`, this TODO, `docs/plans/QA_NATIVE_WORK_HUB_DELIVERY_PLAN.md`, `DESIGN_IMPLEMENTATION_PLAN.md`, and `AGENT_REPORT_TEMPLATE.md` before changing code.
3. Build the smallest vertical slice only. Do not begin a later item until the current item is verified and marked `Done`.
4. Use React + Vite + React Router + Redux Toolkit/Thunk in `apps/web`; Express + TypeScript + Sequelize + PostgreSQL in `apps/api`.
5. All persisted changes require a Sequelize migration, input validation, backend authorization, and relevant tests. Never use local-only production task or folder data.
6. Keep hierarchy depth to two persisted folder levels below Workspace: Initiative/Release → Feature/Workstream. Reject deeper nesting in backend service validation.
7. Use global Redux UI state for errors, snackbar notifications, pending mutations, and mobile layout state. Do not duplicate those states locally.
8. Use the atomic component system for UI. Include loading, empty, error, disabled, and permission-denied states for API-backed screens.
9. Run the narrowest relevant test first, then `npm run build:api` for API work and `npm run build:web` for frontend work. Record only commands actually run.
10. Finish with the report format from `AGENT_REPORT_TEMPLATE.md`, then update this TODO truthfully.

## P0 — Foundation

- [x] **Done** (Antigravity - 2026-08-14) — WH-Pre: Secure evidence storage. Replace local/in-memory attachment state with workspace-scoped persisted evidence API, Sequelize model/migration, authorization policies, activity logs on upload/delete, secure preview/download API, and UI integration with proper loading/empty/error/permission states.
- [x] **Done** (Antigravity - 2026-08-13) — F0: Define folder/task contracts: Zod request/response schemas for workspaces, folders, task create/update/move, date filters, and problem-detail errors. Preserve the contracts package as the only API boundary.
- [x] **Done** (Antigravity - 2026-08-13) — F1: Restore minimal Workspace persistence: Sequelize migration/model for `workspaces` and membership; create server-side membership policy with owner/admin/member roles.
- [x] **Done** (Antigravity - 2026-08-13) — F2: Implement Workspace API: authenticated create, list memberships, read, and update endpoints with cross-workspace authorization tests.
- [x] **Done** (Antigravity - 2026-08-13) — F3: Build workspace selector integration using real API data; remove any temporary workspace fixtures only after the real loading, empty, error, and create states work.

## P0 — Folder hierarchy

- [x] **Done** (Antigravity - 2026-08-13) — H1: Add `work_folders` migration/model with `workspace_id`, optional `parent_folder_id`, name, position, creator, timestamps, and indexes.
- [x] **Done** (Antigravity - 2026-08-13) — H2: Implement folder policy/service/routes: list tree, create, rename, reorder, and archive. Enforce same-workspace parent, no self-parenting, and maximum two persisted levels.
- [x] **Done** (Antigravity - 2026-08-13) — H3: Add API integration tests for folder ordering, hierarchy-depth rule, cross-workspace access, and forbidden mutations.
- [x] **Done** (Antigravity - 2026-08-13) — H4: Build the API-backed folder tree UI with selection URL state, create/rename/archive interactions, and complete loading/empty/error/permission states.

## P0 — Tasks and time views

- [x] **Done** (Antigravity - 2026-08-13) — T1: Add `tasks` migration/model with workspace/folder ownership, title, description, status, priority, assignee, reporter, `start_date`, `due_date`, `completed_at`, timestamps, and folder index.
- [x] **Done** (Antigravity - 2026-08-13) — T2: Implement task API: list, create, update, move, and complete. Validate folder/workspace integrity and enforce mutation authorization.
- [x] **Done** (Antigravity - 2026-08-13) — T3: Add task API tests for date filtering, unfiled tasks, cross-workspace rejection, move rules, and audit events where applicable.
- [x] **Done** (Antigravity - 2026-08-13) — T4: Build task list/detail UI using persisted data. Use atomic components and Redux thunks; show task status, priority, date fields, and folder location.
- [x] **Done** (Antigravity - 2026-08-13) — T5: Build dynamic Today, This Week, This Month, and Overdue views from API date filters. Do not create date-based folders.

## P0 — Integrity hardening

- [x] **Done** (Codex - 2026-08-13) — R1: Enforce workspace-scoped task folder/assignee relations, preserve a single workspace owner, make folder reordering atomic, repair task authentication/reporter persistence, and add folder descendant task filtering. Verified with clean test migrations, contracts, API regressions, typechecks, and builds.
- [x] **Done** (Codex task_role_policy - 2026-08-13) — R2: Enforce task mutation authorization by workspace role and task assignment; owner/admin may mutate all tasks, QA may mutate only own or unassigned tasks, and Product/Dev remain read-only. Verified with policy and database-backed task integration tests, API typecheck, and build.

## P1 — Quality gate

- [x] **Done** (Codex - 2026-08-13) — UX1: Clarify login form placeholders, route a successful sign-in to the Work Hub dashboard, and use dark mode as the initial dashboard theme while preserving a user's saved theme choice.
- [x] **Done** — A0: Refactor Work Hub shared folder navigation, QA status presentation, and requirement form controls into Atomic Design components. (Codex, 2026-08-13)
- [x] **Done** — A1: Complete Work Hub Atomic Design extraction and document mandatory component reuse for agents. (Codex, 2026-08-13)
- [x] **Done** (Codex - 2026-08-13) — D1: Correct dark-mode contrast in shared UI primitives and the Work Hub table so surfaces, borders, text, and interactive states use the dark design tokens.
- [x] **Done** (Codex - 2026-08-13) — Q1: Add critical-path frontend tests for Workspace selection, folder hierarchy, task move, date filters, mutation errors, snackbar behavior, and responsive navigation.
- [x] **Done** (Codex - 2026-08-13) — Q2: Run clean-database migrations and full release validation. Recorded clean migrations, API authorization regressions, package builds, desktop/mobile checks, keyboard behavior, and empty/loading/error states.
- [x] **Done** (Codex - 2026-08-14) — UX2: Use the two frontend banner assets in an accessible Overview carousel with automatic rotation, polished transitions, and responsive presentation.
- [x] **Done** (Codex - 2026-08-14) — UX3: Replace the Task Hub’s row of status filter buttons with an accessible compact status dropdown. Verified with the Select atom test and frontend production build.
- [x] **Done** (Codex - 2026-08-14) — UX4: Keep Task Hub custom date-range and status filters horizontally adjacent at every viewport width. Verified with frontend production build.

## P1 — Reporting

- [x] **Done** (Codex - 2026-08-14) — RPT1: Build an API-backed QA delivery report page with date filtering, status/priority summaries, delivery progress, and loading/empty/error states. Verified with the frontend test suite and production build before unrelated concurrent subtask UI changes introduced their own type errors.

## P1 — Audit remediation

- [x] **Done** (Codex - 2026-08-14) — AUD1: Audit the committed parent/subtask collaboration release and fix verified policy, audit-trail, and UI permission defects. Verified with migrations 26/27, the 74-test API integration suite, frontend tests, and production builds.
- [x] **Done** (Codex - 2026-08-17) — AUD2: Enforce workspace-scoped QA document folder relations in service and PostgreSQL, with cross-workspace and folder-deletion regression tests. Verified: clean temporary migration 37, 11 QA document integration tests, and API TypeScript build.

## P1 — Parent tasks, subtasks, and collaboration

Reference: `docs/plans/TASK_SUBTASK_COLLABORATION_PLAN.md`.

- [x] **Done** (Antigravity - 2026-08-13) — ST1: Add contracts, canonical migrations, models, and database integrity rules for one-level subtasks, delivery area (`frontend`, `backend`, `qa`), task activity, and task discussion records.
- [x] **Done** (Antigravity - 2026-08-14) — ST2: Implement parent/subtask services, API routes, and role policy. PO plans and assigns subtasks; assigned Dev/QA members update their own execution status; all workspace members retain read access.
- [x] **Done** (Antigravity - 2026-08-14) — ST3: Add immutable activity audit generation and read API for parent and subtask changes, including an aggregated parent timeline.
- [x] **Done** (Antigravity - 2026-08-14) — ST4: Implement persisted task discussion, replies, mentions, and workspace-scoped authorization. Messages are human collaboration; they remain separate from activity audit events.
- [x] **Done** (Antigravity - 2026-08-14) — ST5: Build Work Hub UI for parent-task status groups, subtask progress/FE-BE-QA summaries, subtask creation and assignment, Activity, and Discussion across desktop and mobile.
- [x] **Done** (Antigravity - 2026-08-14) — ST6: Add integration/frontend tests and release validation for data integrity, role matrix, activity/discussion visibility, loading-empty-error states, keyboard interaction, and responsive layouts.

## P1 — Work Hub Delivery Plan Slices

Reference: `docs/plans/QA_NATIVE_WORK_HUB_DELIVERY_PLAN.md`.

- [x] **Done** (Antigravity - 2026-08-15) — WH-0: Cleanup inventory and route protection. Audit Component Gallery, GenericPage, and legacy routes; ensure route compatibility and zero broken production navigation paths.
- [x] **Done** (Antigravity - 2026-08-15) — WH-1: Folder persistence and policy foundation. Add Zod contracts, migration, model, policy helpers, services, routes, and tests for folders/subfolders.
- [x] **Done** (Antigravity - 2026-08-15) — WH-2: Work Hub read experience and task placement. Build WorkHubPage, tree/list views, folder_id placement, and Inbox/Unfiled fallback.
- [x] **Done** (Antigravity - 2026-08-15) — WH-3: Task detail and requirement links. Add task_requirements contracts/migrations/service/routes and requirement linking UI.
- [x] **Done** (Antigravity - 2026-08-15) — WH-4: QA documents and authorised evidence. Add QA documents with Markdown versioning and task/requirement evidence linking.
- [x] **Done** (Antigravity - 2026-08-15) — WH-5: QA traceability. Add requirement-to-test-case links and bug trace reports across workspace folders.
- [x] **Done** (Antigravity - 2026-08-15) — WH-6: Production retirement and release validation. Retire legacy demo routes and perform full release validation.

## P0 — Product Brief foundation

- [x] **Done** (Codex - 2026-08-15) — PB1: Persist one versioned Product Brief per task using the existing document/version/link records; add long-form Markdown, separate In Scope and Out of Scope snapshots, owner/status metadata, Product role authorization, audit activity, API contracts, and Task Detail UI states. Verified: 26 contract tests, 8 Product Brief/document API integration tests, 24 web tests, API/web production builds. Google Drive media remains a follow-up slice after the server-side storage adapter is configured and verified.

## P0 — Product media foundation

- [x] **Done** (Codex - 2026-08-15) — PB2: Extend the persisted task attachment record for Product Media categories/captions and a server-side Google Drive storage adapter; retain local storage only for development/test, stream authorised image/video previews, and add accessible gallery/video fullscreen UI without exposing Drive credentials or raw storage references. Verified: test migration 34, 26 contract tests, 5 attachment API integration tests, 5 Task Detail Drawer tests, and API/web production builds.

## P0 — Regression integrity

- [x] **Done** (Codex - 2026-08-15) — R3: Repair the task integration fixture so its QA delegation assertion explicitly uses the Workspace Restricted policy; preserve the configurable default policy and restore a green full API suite. Verified: 94/94 API integration tests passed.

## P0 — Product handoff foundation

- [x] **Done** (Codex - 2026-08-15) — PB3: Add versioned Product Brief acceptance criteria so a PO can define observable developer delivery targets alongside context and scope; keep QA verification status out of this slice while preserving historical PRD snapshots and audit metadata. Verified: migration 35, 26 contract tests, 8 Product Brief/document API integration tests, 5 Task Detail Drawer tests, and API/web production builds.
- [x] **Done** (Codex - 2026-08-15) — PB4: Place Product Brief first in the task PRD & Specs flow, before requirements and supporting QA documents; preserve accessible reading and keyboard order. Verified: 6 Task Detail Drawer tests and web production build.


## P0 — Role-Adaptive Collaboration & My Tasks

- [x] **Done** (Antigravity - 2026-08-17) — ROLE-1: Implement Role-Adaptive My Tasks Dashboard & Persona Views (PO, Dev FE/BE, QA) with delivery area breakdown badges (FE/BE/QA), role-aware filter tabs, subtask completion metrics, and seamless end-to-end task detail navigation. Verified: 30 frontend tests passing and clean production web build.
- [x] **Done** (Antigravity - 2026-08-17) — ROLE-2: Enhance Task Detail with Multi-Role Delivery Readiness summary (FE/BE/QA completion status, PRD scope snapshot), rich subtask cards with delivery area styling, assignee information, and direct executor status updates. Verified: 30 web tests passing, 26 contract tests passing, and clean production web build.
- [x] **Done** (Antigravity - 2026-08-17) — ROLE-3: Polish Task Discussion with Quick Persona / Member mention chips, Tektokan topic starters (PRD Query, API Contract, Bug Blocker, Ready for Review), and streamlined reply composer. Verified: 30 web tests passing, and clean production web build.
- [x] **Done** (Antigravity - 2026-08-17) — ROLE-4: Enhance CreateSubtaskModal with Visual Segmented Delivery Area Cards (FE, BE, QA), smart role-based assignee sorting, and quick preset templates for PO planning. Verified: 30 web tests passing and clean production web build.
- [x] **Done** (Antigravity - 2026-08-17) — NOTIF-1: Implement In-App Notification Center in Header navbar (mention alerts, assignment notices, review readiness alerts, unread badge, filter tabs, mark-as-read, and 1-click task navigation). Verified: 30 web tests passing and clean production web build.

## P0 — Firebase Cloud Messaging (FCM) Push Notifications

- [x] **Done** (Antigravity - 2026-08-18) — FCM-1: Implement Firebase Cloud Messaging (FCM) push notifications on task assignment, task status updates, and working task discussion updates across contracts, database tokens, backend dispatch service, and web client / service worker. Verified: 29 contract tests, 107 API integration tests (including dedicated notification suite), 30 web tests, and production API/web builds.

## P0 — Task Hub Hardening, Role Integrity & Architecture Refactoring

- [x] **Done** (Antigravity - 2026-08-18) — WH-HARDEN-1: Fixed 3 critical issues (Redux auth migration replacing localStorage user reads, role authorization alignment for `canCreateTask` matching backend policy `['owner', 'admin', 'po']`, explicit `taskError` banner with retry rendering on fetch failure), 6 important issues (Sequelize `DataTypes.ENUM` alignment for status/priority/deliveryArea, composite index migration on `(workspace_id, assignee_id)`, subtask query limit clamping, multi-field search consistency across title/description/id, recursive folder descendant detection on FE and recursive CTE query on BE), and 4 architectural improvements (granular per-field selectors, `useDebounce` hook on search inputs, sub-component decomposition of `TaskHubDashboardTemplate.tsx`, and elimination of hardcoded `position: 0`). Verified: 29 contract tests, 112 API tests across 39 test suites, 73 web tests across 25 test files, and full monorepo TypeScript typecheck & production builds.

- [x] **Done** (Antigravity - 2026-08-18) — DB-AUDIT-1: Comprehensive DB schema audit — inspected all 24 migrations and 20 Sequelize models against live `qa_management_dev` PostgreSQL schema. Findings: (1) migration 39 `idx_tasks_workspace_assignee` was pending → executed `db:migrate`, confirmed index now in DB; (2) `WorkspaceMemberModel`, `WorkspaceModel`, `UserModel`, `AuthSessionModel`, `UserFcmTokenModel` were missing explicit `field:` column mappings for camelCase properties — added all missing `field:` declarations and `underscored: true` to each model; (3) `associations.ts` had `onDelete: 'CASCADE'` for `task_comment_mentions → users` but DB FK is `RESTRICT` (set by migration 27 to preserve mention history) — aligned to `RESTRICT`; (4) remaining models (`qaDocument`, `qaDocumentVersion`, `requirementTestCase`, `taskAttachment`, `taskDocument`, `taskRequirement`, `requirement`) added `underscored: true` for explicit config. Tasks/status/priority/deliveryArea ENUM types confirmed correct in DB. All FK composite constraints verified intact. Verified: TypeScript typecheck clean, 112/112 API integration tests pass, 73/73 frontend tests pass.
