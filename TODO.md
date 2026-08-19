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

## P0 — Requirement & Reference Links (PO Embedded References with 1-Click Dev/QA Access)

- [x] **Done** (Antigravity - 2026-08-19) — REQ-REF-1: Transform Linked Workspace Requirements into streamlined Requirement & Reference Links. Restrict embedding/linking/unlinking of reference URLs (Figma, Google Sheets, PRD/Docs, Jira/Linear) strictly to PO/Admin/Owner roles across contracts, backend policies, and routes. Provide 1-click external redirect access (`target="_blank" rel="noopener noreferrer"`) with platform branding detection (🎨 Figma, 📊 Spreadsheet, 📄 PRD, 📌 Issue, 🔗 Web) for Dev and QA members. Implemented auto-generated category codes, transactional activity logging in `task_activity`, and role-based frontend drawer views. Verified: 29 contract tests, 6 real PostgreSQL integration tests in `requirementApiIntegration.test.ts`, 77 frontend tests across 26 suites (including 11 `TaskDetailDrawer` unit tests), clean typechecks, and production builds (`build:api` and `build:web`).

## P0 — Subtask Enhancement (Accordion UI, Rich Description, Attachments & Per-Subtask Chat)

- [x] **Done** (Antigravity - 2026-08-19) — SUBTASK-ENHANCE-1: Implement interactive Subtask Accordion with expandable workspace directly underneath subtask rows. Support inline Markdown rich description view/editing, file and screenshot evidence upload/preview (`task_attachments`), per-subtask collaboration chat thread with quick topic tags (`task_comments`), delivery area badging (`FE`/`BE`/`QA`), quick status & priority updates, and atomic design decomposition (`Accordion`, `SubtaskSummaryRow`, `SubtaskDescriptionEditor`, `SubtaskAttachmentsBox`, `SubtaskCommentBox`, `SubtaskAccordionItem`, `SubtaskList`). Verified: 87/87 frontend tests passing across 28 test suites, clean typecheck for both web and api, and clean production builds (`build:api`, `build:web`).

- [x] **Done** (Antigravity - 2026-08-19) — ROLE-TIMELINE-1: Implement Inter-Role Subtask Timeline, Schedule Health Engine, and Cross-Role Overlap / Bottleneck Attribution (`PO Specs ➔ Dev BE ➔ Dev FE ➔ QA Verification`). Built `scheduleHealth.ts` computation engine (calculating slippage days, schedule health statuses `completed`, `on_track`, `at_risk`, `delayed`, `unscheduled`, and identifying primary bottleneck roles `PO`, `Dev Backend`, `Dev Frontend`, `QA`). Created `TaskScheduleHealthBadge` molecule, interactive `SubtaskRoleTimeline` (with primary blocker diagnosis banner, 4-stage inter-role handoff pipeline, role filter buttons, and day-by-day role Gantt stream with Today marker), integrated role timeline into `SubtaskList` (view switcher `[📋 Accordion]` vs `[📊 Role Timeline]`), added dual start/due date pickers in `CreateSubtaskModal` and `SubtaskAccordionItem`, integrated schedule health in `TaskDetailDrawer` overview and subtitle, and added expandable role subtask bars to `TaskTimelineView`. Verified: 97/97 frontend tests passing across 30 test suites (including `scheduleHealth.test.ts`, `SubtaskRoleTimeline.test.tsx`, `TaskTimelineView.test.tsx`, and `TaskDetailDrawer.test.tsx`), 0 TypeScript errors (`typecheck:web`), and clean production bundle (`build:web`).

- [x] **Done** (Antigravity - 2026-08-19) — SDLC-TASK-1: Enforce strict subtask-only task assignment (parent tasks unassigned containers owned by reporter/PO) and role-based data access scoping (planners owner/admin/po see 100% of workspace tasks; dev/qa executors see only their assigned subtasks in My Tasks and relevant parent feature containers in Task Hub, with direct access outside scope restricted with 403 Forbidden). Removed parent task assignee selection in `CreateTaskModal`. Updated full seed data script with unassigned parent tasks and targeted executor subtasks. Verified: 55/55 backend tests passing across 16 test suites, 110/110 frontend tests passing across 31 test files, clean monorepo TypeScript typecheck, successful `db:seed:full` re-seed, and clean production builds (`build:api`, `build:web`).

## P0 — Role-Adaptive Onboarding Wizard (First-Time User Experience)

- [x] **Done** (Antigravity - 2026-08-19) — ONBOARD-1: Implement Interactive Role-Adaptive Onboarding Wizard for first-time users. Add `onboarding_completed_at` migration & model, backend `/v1/auth/onboarding/complete` and `/v1/auth/onboarding/reset` routes, Zod contracts, Redux auth slice integration, and Atomic Design `RoleOnboardingModal` with 4-step role-tailored workflow (Persona Welcome, SOP/Quality Gate, Workspace Context, Quick Launch) and replay capabilities. Verified: 31/31 contract tests, 139/139 backend tests across 45 suites (including `onboardingApi.test.ts`), 118/118 frontend tests across 32 suites (including `RoleOnboardingModal.test.tsx` and `authSlice.test.ts`), clean TypeScript typechecks, and clean production builds (`build:api`, `build:web`).

## P0 — Monorepo Rebranding & Package Scope Refactor

- [x] **Done** (Antigravity - 2026-08-19) — PKG-REFACTOR-1: Refactor monorepo workspace packages and npm imports from `@qa/*` to `@qlick/*` (`@qlick/contracts`, `@qlick/api`, `@qlick/web`). Updated all 91 source/test/config files across `packages/contracts`, `apps/api`, and `apps/web`. Verified: 31/31 contract tests, 139/139 backend tests across 45 suites, 118/118 frontend tests across 32 suites, and clean production builds (`build:api`, `build:web`).

## P0 — Dynamic & Persistent In-App Notification System with FCM Integration

- [x] **Done** (Antigravity - 2026-08-19) — NOTIF-PERSIST-1: Replace hardcoded in-memory notifications with a persistent PostgreSQL database notification model (`notifications` table), backend REST endpoints (`GET /v1/notifications`, `PATCH /v1/notifications/:id/read`, `POST /v1/notifications/read-all`, `DELETE /v1/notifications`), real-time notification triggers on task assignment / status change / discussion mentions, dynamic Redux thunks, and dynamic `Header` UI. Verified: 33/33 contract tests, 145/145 backend integration tests across 46 test suites, 119/119 frontend tests across 32 suites, pristine `db:seed:full` re-seed, 0 TypeScript errors, and clean production builds (`build:api`, `build:web`).

- [x] **Done** (Antigravity - 2026-08-19) — NOTIF-CHANNEL-DEADLINE-1: Implement `@channel` broadcast mention in task discussions (notifying all task stakeholders: reporter, assignee, subtask assignees, thread participants) and automated approaching deadline notifications (24h due date alerts with 20h anti-spam protection, `POST /v1/notifications/check-deadlines`, header badge and filter tabs) across contracts, backend discussion/notification services, and UI. Verified: 33/33 contract tests, 147/147 backend tests across 47 suites, 119/119 frontend tests across 32 suites, and clean production builds (`build:api`, `build:web`).

## P0 — QA Governance, Document Management & Audit Hardening

- [x] **Done** (Antigravity - 2026-08-19) — QA-DOCS-AUTH-1: Restrict Workspace Creation strictly to `['owner', 'admin', 'po']` (blocking QA and Dev roles with `403 Forbidden`). Build full-featured QA Documents Manager and task drawer linking (Test Plans, Test Strategies, Test Scenarios, QA Sign-offs with Markdown revision history) restricted strictly to `['owner', 'admin', 'qa']` (PO and Dev read-only). Resolved Audit Recommendation 1 (100% clean test runner, eliminated all `act(...)` warnings in unit tests) and Recommendation 3 (load-more pagination controls for task activities and discussion comments). Verified: 122 frontend tests passing across 33 test suites, 13 backend policy tests passing, 0 TypeScript errors (`typecheck:web` & `typecheck:api`), and clean production builds (`build:web` & `build:api`).


