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

## P1 — Reporting

- [x] **Done** (Codex - 2026-08-14) — RPT1: Build an API-backed QA delivery report page with date filtering, status/priority summaries, delivery progress, and loading/empty/error states. Verified with the frontend test suite and production build before unrelated concurrent subtask UI changes introduced their own type errors.

## P1 — Audit remediation

- [x] **Done** (Codex - 2026-08-14) — AUD1: Audit the committed parent/subtask collaboration release and fix verified policy, audit-trail, and UI permission defects. Verified with migrations 26/27, the 74-test API integration suite, frontend tests, and production builds.

## P1 — Parent tasks, subtasks, and collaboration

Reference: `docs/plans/TASK_SUBTASK_COLLABORATION_PLAN.md`.

- [x] **Done** (Antigravity - 2026-08-13) — ST1: Add contracts, canonical migrations, models, and database integrity rules for one-level subtasks, delivery area (`frontend`, `backend`, `qa`), task activity, and task discussion records.
- [x] **Done** (Antigravity - 2026-08-14) — ST2: Implement parent/subtask services, API routes, and role policy. PO plans and assigns subtasks; assigned Dev/QA members update their own execution status; all workspace members retain read access.
- [x] **Done** (Antigravity - 2026-08-14) — ST3: Add immutable activity audit generation and read API for parent and subtask changes, including an aggregated parent timeline.
- [x] **Done** (Antigravity - 2026-08-14) — ST4: Implement persisted task discussion, replies, mentions, and workspace-scoped authorization. Messages are human collaboration; they remain separate from activity audit events.
- [x] **Done** (Antigravity - 2026-08-14) — ST5: Build Work Hub UI for parent-task status groups, subtask progress/FE-BE-QA summaries, subtask creation and assignment, Activity, and Discussion across desktop and mobile.
- [x] **Done** (Antigravity - 2026-08-14) — ST6: Add integration/frontend tests and release validation for data integrity, role matrix, activity/discussion visibility, loading-empty-error states, keyboard interaction, and responsive layouts.
