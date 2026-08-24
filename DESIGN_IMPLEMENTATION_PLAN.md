# QA-native Work Hub — Design and Frontend Implementation Plan

**Status:** implemented frontend baseline; reconciled with current routes and modules
**Updated:** 2026-08-23 (AGY-7.3)
**Owner:** Product / QA Management System

## 1. Product direction

The product is a QA-native delivery workspace, not a visual clone of ClickUp. Its primary promise is that a team can start from a requirement and always understand the delivery and QA result attached to it.

```text
Workspace → Folder → Subfolder → Feature / Story (root Task)
                                       ├── Linked Requirements / Acceptance Criteria
                                       ├── Product Brief / QA Documents / Evidence
                                       ├── Dev and QA Subtasks
                                       ├── Test Cases → Runs → Results
                                       ├── Bugs → Retest
                                       ├── QA Sign-off → PO Release Decision
                                       └── Activity / Discussion
```

Requirements are independent Workspace records linked to one or more tasks. They are shown prominently inside a task, but are not nested data owned by a single task. This keeps traceability intact when one requirement affects several tasks, tests, or defects.

## 2. Information architecture

The active Workspace gains one primary destination: **Work Hub**.

| Route                                | Purpose                                                                                                                                      |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `/work`                              | Task Hub: persisted folder tree, task collection/timeline, filters, and detail drawer.                                                       |
| `/projects/:projectId/tasks/:taskId` | Durable Task/Feature detail route. It restores the active Workspace, handles 403/404 explicitly, and preserves parent context after refresh. |
| `/my-tasks`                          | Backend-derived role-aware attention queue and role workspace.                                                                               |
| `/reports`                           | Historical/reporting view using shared backend readiness facts.                                                                              |
| `/user-flows`                        | Product workflow guide.                                                                                                                      |
| `/workspaces/settings`               | Planner-visible Workspace settings.                                                                                                          |
| `/requirements`                      | Compatibility route rendering My Tasks; My Tasks remains highlighted.                                                                        |
| `/tests`                             | Compatibility route rendering Work Hub.                                                                                                      |
| `/components`                        | Protected `Dev` Component Gallery for Owner/Admin/PO; not a product workflow or release-evidence source.                                     |

The sidebar exposes Work Hub, My Tasks, Report, User Flow Guide, and planner-only Workspace Settings. Component Gallery remains a clearly labelled planner-only `Dev` utility. Bug/retest, persisted QA execution, Sign-off, and release-decision work are contextual modules inside Task Hub and My Tasks rather than separate top-level destinations.

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
- Task collection rows expose backend-derived release readiness; the detailed persisted trace remains in Task detail.

## 4. Task detail design

The default **Overview** tab contains task ownership, status, due date, description, and the short QA readiness summary. The implemented drawer composes the following shared modules:

| Tab                  | First release content                                                                                                                                                                    |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Specs & Requirements | Product Brief first, linked Requirements/Acceptance Criteria, Workspace linking controls for planners, QA documents, and authorised Task evidence.                                       |
| Delivery Trace       | One backend-derived Feature model separating structural coverage from execution/pass results.                                                                                            |
| Bugs                 | Persisted Bugs with Feature, Requirement, failed/blocked Result, build/environment, assignee, severity, status, reproduction, and resolution context.                                    |
| Subtasks             | Frontend, Backend, Mobile, Fullstack, and QA delivery work, schedule context, specialty-compatible assignment, role-aware execution/review controls, and shared responsive presentation. |
| Activity             | Persisted audit trail; no client-side fabricated history.                                                                                                                                |
| Discussion           | Persisted Task discussion, replies, mentions, and safe rich-media rendering; separate from audit activity.                                                                               |

My Tasks reuses the same Feature context and shared modules, adding role-specific work surfaces: PO planning/decision/timeline work, Developer assigned/review-feedback/Bug work, and QA test/review/retest/Sign-off work. Readiness always comes from the authenticated backend snapshot.

Workspace Settings displays each Developer's persisted Workspace specialties and an explicit unclassified legacy state. The Task planner offers classified Developers only for matching delivery areas. Task Hub summaries and Task detail keep Mobile and Fullstack separate from Frontend and Backend, while Report exposes both complete delivery-area metrics and Developer specialties in team workload. These surfaces present backend data; they do not infer classification or authorize assignments in the browser.

The task detail must show useful empty states: “No requirement linked”, “No QA document yet”, “No test case mapped”, and “No execution recorded”. These are readiness signals, not errors.

## 5. Design system and accessibility

- Preserve Inter, primary brand lime `#B1E743` (with `#141413` charcoal contrast text for WCAG AAA compliance), emerald `#10B981`, amber `#F59E0B`, neutral `#64748B`, sidebar navy `#0B1C30`, 16px cards, and accessible dark mode.
- Use the existing shared Button, Badge, Tabs, Drawer, Modal, Skeleton, Snackbar, and FileDropzone components. Extend them only when a real Work Hub interaction needs it.
- Status must be conveyed by label and icon as well as colour. Maintain keyboard focus, `aria-expanded` for the tree, labelled icon buttons, and a minimum 44px tap target on touch controls.
- On tablet/mobile, the navigation/folder regions collapse and durable Task detail renders as a route-backed full-width workspace rather than a cramped three-column layout.
- API-backed content needs loading, empty, error, permission-denied, and disabled mutation states before it is considered complete.

## 6. Frontend slices — delivered

1. **Work Hub shell:** add the route and navigation entry; render an API-backed empty tree/list state without breaking existing Workspace guards.
2. **Folder navigation:** add tree selection, breadcrumbs, folder/subfolder creation, rename, archive, and list filtering.
3. **Task placement:** render persisted tasks by folder, create task in the selected location, and move a permitted task.
4. **Task detail:** add the Overview and Requirements tabs, including link/unlink interactions and coverage signals.
5. **QA documentation:** add Documents and QA tabs using persisted document metadata and existing test APIs; files use only the authorised storage flow.
6. **Traceability and compatibility:** link tests and Bugs, retain useful legacy compatibility routes, and keep Component Gallery isolated as a protected development utility.

7. **Release assurance:** render the shared backend readiness snapshot, append-only QA Sign-off/PO decision history, labelled gate failures, and reasoned override validation.
8. **Role-aware attention queue:** render all backend-derived PO/Dev/QA buckets with reason/next action and reuse persisted Feature, Test, Bug, and release modules.
9. **Durable navigation:** support authorized direct Task/Feature URLs, 403/404 states, parent/subtask breadcrumbs, Back to Feature, refresh, focus restoration, and mobile layout.
10. **Developer specialization:** persist Workspace-scoped Frontend/Backend/Mobile/Fullstack capability, enforce assignment integrity in the backend, and expose the data consistently across Workspace Settings, Task Hub, My Tasks, Task detail, and Report.

All slices above are implemented. The consolidated AGY-7.2 gate passed contracts 49/49, API 207/207, and frontend 249/249 with 0 skipped; all typechecks/builds passed. Detailed commands and the existing Vite bundle advisory are recorded in [`docs/reports/AGY_7_2_CLEAN_RELEASE_VALIDATION_2026-08-23.md`](docs/reports/AGY_7_2_CLEAN_RELEASE_VALIDATION_2026-08-23.md).

## 7. Explicit exclusions for this phase

- No ClickUp feature-for-feature recreation.
- No arbitrary-depth folders, custom field builder, dashboards, Gantt/calendar, time tracking, or live collaborative document editing.
- No browser-side database calls, local-only production data, or fake file links.
- No AI action that writes a task, document, test, or bug without explicit authenticated user approval.

## 8. Owner-approved policy baseline

The owner approved the current backend policy on 2026-08-23, as recorded in accepted [`ADR-001`](docs/adr/ADR-001-CORE-DOMAIN-AND-COLLABORATION-DECISIONS.md): explicit parent-Task creation grants may be given to QA or Dev, only planners manage Test Case definitions and Requirement mappings, Requirement remains the canonical coverage target, and persisted authorised attachments remain the evidence direction. The UI must continue to mirror rather than broaden these server policies.
