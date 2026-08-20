# QA-native Work Hub — Design and Frontend Implementation Plan

**Status:** approved product direction, ready for delivery slices  
**Updated:** 2026-08-12  
**Owner:** Product / QA Management System

## 1. Product direction

The product is a QA-native delivery workspace, not a visual clone of ClickUp. Its primary promise is that a team can start from a requirement and always understand the delivery and QA result attached to it.

```text
Workspace → Folder → Subfolder → Task
                               ├── Linked requirements
                               ├── Documents
                               ├── Test plans, cases, and runs
                               ├── Bugs and evidence
                               └── Activity
```

Requirements are independent project records linked to one or more tasks. They are shown prominently inside a task, but are not nested data owned by a single task. This keeps traceability intact when one requirement affects several tasks, tests, or defects.

## 2. Information architecture

The active Workspace gains one primary destination: **Work Hub**.

| Route | Purpose |
|---|---|
| `/projects/:projectId/work` | Tree, selected folder/subfolder, task list, and filters. |
| `/projects/:projectId/work/folders/:folderId` | Deep link to a folder or subfolder. |
| `/projects/:projectId/tasks/:taskId` | Deep link to a task detail page/drawer state. |
| `/projects/:projectId/requirements` | Transitional filtered Work Hub view, then redirect to Work Hub. |
| `/projects/:projectId/tasks` | Transitional filtered Work Hub view, then redirect to Work Hub. |
| `/projects/:projectId/tests` | Test Management remains a specialised execution workspace. |

The sidebar keeps Workspaces, Overview, Work Hub, Test Management, and later Bugs/Chat. During the transition, Component Gallery may remain isolated as an admin-only tool; it is not a product destination and must be removed in WH-6.

## 3. Desktop layout

```text
┌─────────────── app shell ─────────────────────────────────────────────────┐
│ Workspace name · global search · notifications · profile                  │
├─────────────┬──────────────────────────────────────┬───────────────────────┤
│ Folder tree │ Folder/Subfolder header               │ Task detail           │
│             │ View · filter · create                │ tabs                  │
│ ▾ Mobile    ├──────────────────────────────────────┤ Overview              │
│   ▾ Release │ Task table or board                   │ Requirements          │
│     Checkout│ ID · title · owner · status · QA state│ Documents             │
│             │                                      │ QA traceability       │
│             │                                      │ Bugs · Activity       │
└─────────────┴──────────────────────────────────────┴───────────────────────┘
```

- The left tree is the persistent information hierarchy, not a second sidebar.
- The centre is the working list. Start with a table/list view; add board, calendar, and reporting views only when their real data exists.
- The right detail panel opens on selection; a direct task URL renders the same content full-width on narrow screens.
- Every task row exposes requirement coverage and QA readiness, not only generic status and priority.

## 4. Task detail design

The default **Overview** tab contains task ownership, status, due date, description, and the short QA readiness summary.

| Tab | First release content |
|---|---|
| Requirements | Linked requirements, status, acceptance criteria, and coverage warning. |
| Documents | Markdown/specification documents, version/status metadata, and authorised file evidence. |
| QA | Linked test plan/cases, latest run result, pass/fail/blocked totals, and create-test action where permitted. |
| Bugs | Bugs linked through test execution and any direct task link. |
| Activity | Audit trail; no client-side fabricated history. |

The task detail must show useful empty states: “No requirement linked”, “No QA document yet”, “No test case mapped”, and “No execution recorded”. These are readiness signals, not errors.

## 5. Design system and accessibility

- Preserve Inter, primary brand lime `#B1E743` (with `#141413` charcoal contrast text for WCAG AAA compliance), emerald `#10B981`, amber `#F59E0B`, neutral `#64748B`, sidebar navy `#0B1C30`, 16px cards, and accessible dark mode.
- Use the existing shared Button, Badge, Tabs, Drawer, Modal, Skeleton, Snackbar, and FileDropzone components. Extend them only when a real Work Hub interaction needs it.
- Status must be conveyed by label and icon as well as colour. Maintain keyboard focus, `aria-expanded` for the tree, labelled icon buttons, and a minimum 44px tap target on touch controls.
- On tablet/mobile, the tree becomes a slide-over, the task list fills the page, and task detail becomes a route/page rather than a cramped three-column layout.
- API-backed content needs loading, empty, error, permission-denied, and disabled mutation states before it is considered complete.

## 6. Frontend slices

1. **Work Hub shell:** add the route and navigation entry; render an API-backed empty tree/list state without breaking existing project guards.
2. **Folder navigation:** add tree selection, breadcrumbs, folder/subfolder creation, rename, archive, and list filtering.
3. **Task placement:** render persisted tasks by folder, create task in the selected location, and move a permitted task.
4. **Task detail:** add the Overview and Requirements tabs, including link/unlink interactions and coverage signals.
5. **QA documentation:** add Documents and QA tabs using persisted document metadata and existing test APIs; files use only the authorised storage flow.
6. **Traceability and retirement:** link tests and bugs, redirect legacy task/requirement URLs, then remove mock pages and the Component Gallery route.

Each slice is independently shippable only when its backend contract, role-aware UI, empty/error states, and narrow validation are complete.

## 7. Explicit exclusions for this phase

- No ClickUp feature-for-feature recreation.
- No arbitrary-depth folders, custom field builder, dashboards, Gantt/calendar, time tracking, or live collaborative document editing.
- No browser-side database calls, local-only production data, or fake file links.
- No AI action that writes a task, document, test, or bug without explicit authenticated user approval.
