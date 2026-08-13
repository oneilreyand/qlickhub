# QA-native Work Hub — Product and Delivery Plan

**Status:** ready for agent execution  
**Created:** 2026-08-12  
**Scope:** evolve the existing QA Management System into a folder-based delivery workspace with requirement, document, and QA traceability.

## 1. Outcome

Users can organise each Workspace into folders and subfolders, create and manage tasks within that structure, and open a task to see the exact requirements, documents, tests, evidence, bugs, and activity connected to it.

The experience must answer three questions without changing pages:

1. What are we delivering?
2. Which requirement and document define it?
3. Has QA proved it is ready?

## 1.1 System foundations and security constraints

- Keep React + Vite + React Router + Redux Toolkit/Thunk in `apps/web`; keep Express + TypeScript + Sequelize + PostgreSQL in `apps/api`.
- `packages/contracts` is the only API contract boundary. The browser never imports database models or receives database, JWT, Google Drive, or AI credentials.
- The API authenticates every request and enforces Workspace membership/role policy for every read and mutation. UI visibility is never authorization.
- Persisted schema changes require canonical Sequelize migrations. Multi-record writes use a Sequelize transaction and record project-scoped activity where visible to users.
- Files are stored through an authorised server-side connector and are previewed/downloaded through an authorised application endpoint or short-lived application URL.
- Any future AI capability returns cited drafts only. It may not mutate production records without a separate authenticated user Apply action.

## 2. Scope decisions

| Decision | Chosen approach | Reason |
|---|---|---|
| Hierarchy | Workspace → Folder → Subfolder → Parent Task → Subtask | A parent task may have one direct subtask level for FE, BE, and QA delivery work; arbitrary task nesting is not supported. |
| Folder depth | Maximum two persisted levels | Avoids recursive UI, permissions, and migration complexity. Revisit only with a real third-level use case. |
| Requirement ownership | Project-scoped, linked many-to-many with tasks | A requirement can affect several tasks and must remain traceable to tests/bugs. |
| Documentation | Versioned project documents linked to tasks/requirements | Strengthens QA context without promising rich collaborative editing. |
| File evidence | Persisted and authorised attachment records | Files remain distinct from document text and must use the secure Drive flow. |
| Existing test and bug data | Preserve and link it; do not replace it | Test runs, results, bugs, and activity already form the QA evidence trail. |

## 3. What is removed or retired

Deletion happens only after a working replacement has been deployed and its route compatibility has been verified.

| Item | Action | Timing |
|---|---|---|
| `ComponentShowcasePage` and `/projects/:projectId/components` | Keep isolated as an admin-only transition tool, then remove it from product routing and delete the demo page. | WH-6, after Work Hub is live. |
| `GenericPage.tsx` | Delete after confirming it has no import or route. | Safe cleanup slice. |
| `sampleTableData` and `sampleColumns` in `DataTable.tsx` | Delete demo exports; retain the reusable table component. | With Component Gallery removal. |
| Current local-state `RequirementsPage` and `TasksPage` | Replace their routes with Work Hub redirects; delete the pages only after persisted equivalents exist. | Traceability/retirement slice. |
| In-memory attachment adapter | Do not expose it in Work Hub. Replace it in `WH-Pre`. | Storage prerequisite; never migrate mock records. |

Do **not** remove the shared UI atoms/molecules, API-backed Test Management, project membership/authorization policies, test-run results, bugs, or activity events. They are necessary foundations.

## 4. Data and traceability design

### New records

```text
work_folders
  id, project_id, parent_folder_id?, name, position, created_by, archived_at?, timestamps

task_requirements
  task_id, requirement_id, linked_by, linked_at

documents
  id, project_id, title, document_type, status, current_version, created_by, archived_at?, timestamps

document_versions
  id, document_id, version, body_markdown, created_by, created_at

task_documents
  task_id, document_id, linked_by, linked_at

requirement_documents
  requirement_id, document_id, linked_by, linked_at
```

### Existing records to extend

```text
qa_tasks.folder_id → work_folders.id (nullable while existing tasks are unfiled)
test_cases ↔ requirements (many-to-many; delivery slice 5)
bugs.task_id? and bugs.requirement_id? (optional direct traceability; retain existing test-run/test-case links)
attachments → generic persisted owner metadata only as part of the secure storage implementation
```

### Integrity rules

- Every relationship is scoped to one Workspace. Services validate that task, requirement, document, test, bug, and folder records share a `project_id` before creating a link.
- A folder may have no parent or a top-level parent only. The service rejects a third level, self-parenting, cross-project parents, and archive operations that would orphan active children.
- Use unique composite indexes for join tables and `(project_id, parent_folder_id, position)` for ordered folder traversal.
- Keep existing `qa_tasks` and display IDs. This is an additive migration; no table rename or destructive data migration is authorised.
- Documents hold metadata and versioned Markdown. Binary files are attachment records and are authorised/streamed by the API; their Drive identifiers never reach the browser as credentials.

## 5. API contract additions

All routes remain below `/v1/projects/:projectId`, require authenticated project membership, validate input with contracts, and return existing RFC 9457-style errors.

| Area | Endpoint responsibilities |
|---|---|
| Work folders | list tree, create, rename, reorder, archive; query tasks by selected folder. |
| Tasks | create/move task with `folderId`; fetch detail with counts/links; link and unlink requirements/documents. |
| Requirements | list detail and linked-task summary; retain existing create/list endpoints during migration. |
| Documents | list/create, create a version, link/unlink to task/requirement, archive, read latest version. |
| Traceability | return requirement → task → test case/run → bug graph/counts for the detail UI. |

Mutations must use Sequelize transactions where they create a record plus links/activity events. Every user-visible change writes a project-scoped activity event, such as `FOLDER_CREATED`, `TASK_MOVED`, `REQUIREMENT_LINKED`, `DOCUMENT_VERSION_CREATED`, or `DOCUMENT_LINKED`.

## 6. Authorization defaults

The API policy layer—not UI visibility—is the source of authority. Implement and test explicit permissions before the routes.

| Operation | Owner/Admin/Lead QA | Product | QA | Dev/Viewer |
|---|---:|---:|---:|---:|
| Read Work Hub | yes | yes | yes | yes |
| Create/rename/archive folder | yes | yes | no | no |
| Create/assign/move QA task | yes | view only | own or unassigned task, per existing policy | view only |
| Create/edit requirement | yes | yes | view only | view only |
| Link requirement to task | yes | yes for requirements they can edit | own or unassigned task only | no |
| Create document/version | yes | requirements/documents they own | QA documents for own work | view only |
| Link test/bug evidence | yes | view only | permitted test/bug scope | assigned bug scope only |

If the existing role vocabulary differs from this table, preserve the more restrictive behavior until a product owner explicitly approves the policy change. All tests must cover cross-project access and forbidden mutations.

## 7. Agent delivery sequence

Agents must take one numbered item at a time, set it `In progress` in `TODO.md`, and complete it with the repository report template. Do not work slices in parallel when they touch the same contracts, migrations, or routes.

### WH-Pre — Secure evidence storage

Implement `WH-Pre` first. It replaces the in-memory attachment adapter with persisted records and makes document evidence safe to surface in Work Hub.

**Acceptance:** an authorised project member can upload, list, preview/download, and remove permitted evidence; a non-member cannot access it; activity is recorded; no mock URL/storage path remains.

### WH-0 — Cleanup inventory and route protection

- Confirm Component Gallery and GenericPage are not required by a production workflow.
- Add route compatibility tests/redirect expectations before removing legacy task/requirement pages.
- Do not delete the old pages yet; no user route may lead to an empty destination.

**Acceptance:** a written inventory is checked against imports/routes, and the demo navigation entry is isolated with no broken production route before its scheduled retirement in WH-6.

### WH-1 — Folder persistence and policy foundation

- Add Zod contracts, migration, Sequelize model, associations, indexes, policy helpers, services, routes, and API integration tests for folders/subfolders.
- Create activity events within the same transaction.

**Acceptance:** permitted users can manage only folders in their Workspace; depth, parent, and project boundary rules are enforced.

### WH-2 — Work Hub read experience and task placement

- Add `WorkHubPage`, API client/service, Redux/thunks as needed, sidebar route, tree/list loading/empty/error states, and selected-folder URL state.
- Add nullable `folder_id` to `qa_tasks`; extend task create/list/move endpoints without changing existing display IDs.

**Acceptance:** tasks persist in the selected folder, unfiled legacy tasks remain visible in an Inbox/Unfiled view, and no task data is local-only.

### WH-3 — Task detail and requirement links

- Add `task_requirements` contract/migration/associations/services/routes and activity audit.
- Build Overview and Requirements task tabs with permission-aware linking, unlinking, coverage warning, and requirement detail preview.

**Acceptance:** one requirement can be linked to multiple tasks; cross-Workspace linking is rejected; a task with no requirement clearly reports its state.

### WH-4 — QA documents and authorised evidence

- Add documents, versions, task/requirement links, policy, activity, and API tests.
- Build Documents tab using persisted metadata and the completed attachment flow. Use Markdown with version history, not rich concurrent editing.

**Acceptance:** an approved user can version and link a document; previous versions remain readable; unauthorised users cannot edit or fetch protected evidence.

### WH-5 — QA traceability

- Add requirement-to-test-case links and optional task/requirement bug links without removing the current test-run/test-case relationships.
- Build QA and Bugs tabs and a compact traceability summary.

**Acceptance:** a user can navigate from a requirement to linked tasks, tests, latest results, and bugs; counts are API-derived and correctly scoped.

### WH-6 — Retire mocks and consolidate navigation

- Redirect `/requirements` and `/tasks` to filtered Work Hub routes.
- Remove the Component Gallery route/page, unused GenericPage, and sample DataTable exports after a no-import check.
- Delete legacy local-state requirement/task pages only after their persisted replacements pass validation.

**Acceptance:** no product route renders fixture/local task or requirement data; old deep links still lead to useful Work Hub content.

### WH-7 — Quality gate and release handoff

- Add API authorization/relationship integration tests and frontend critical-path tests.
- Run typecheck/build for affected packages; test desktop and mobile layouts, loading/error/empty/permission states, and audit events.
- Update docs, TODO, and agent report with commands actually run.

**Acceptance:** the traceability flow works from folder to QA evidence in a clean Workspace, and all changed paths have documented validation.

## 8. Migration and release safeguards

- Deploy schema and API support before enabling the Work Hub UI.
- Existing tasks default to the Unfiled view; never infer a folder or drop tasks.
- Do not delete routes/pages until redirect compatibility tests pass.
- Release document versions independently of Google Drive files; attachment storage failure must show a recoverable error, not fabricate a file link.
- Keep old task and requirement endpoints during the transition. Deprecate only after Work Hub consumes the new detail/read contracts.

## 9. Verification matrix

| Concern | Minimum evidence |
|---|---|
| Data integrity | Migration succeeds; project/depth/unique-link constraints are integration-tested. |
| Authorization | Role matrix and cross-Workspace API tests; hidden UI alone is never accepted. |
| Traceability | Requirement ↔ task ↔ test case/run ↔ bug API fixtures and detail UI test. |
| Documentation/files | Version history test; authorised preview/download; missing/failed upload state. |
| UX | Desktop + mobile, keyboard tree navigation, focus handling, loading/empty/error/disabled states. |
| Regression | Affected package typechecks/builds plus existing relevant API tests. |

## 10. Definition of done for Work Hub

Work Hub is complete only when persisted folders/subfolders, task placement, requirement links, QA documents, evidence, tests, bugs, and activity are visible in one task flow; authorization is enforced server-side; legacy mock screens are retired safely; and the checks in the verification matrix are recorded.

## 11. First agent brief

Claim **WH-Pre — Secure evidence storage** first. It is a prerequisite because Work Hub must not show mock attachment data. Once it is complete, claim **WH-0 — Cleanup inventory and route protection**, then proceed strictly in numeric order. Before editing, read `AGENTS.md`, this plan, `DESIGN_IMPLEMENTATION_PLAN.md`, `TODO.md`, and `AGENT_REPORT_TEMPLATE.md` in that order.
