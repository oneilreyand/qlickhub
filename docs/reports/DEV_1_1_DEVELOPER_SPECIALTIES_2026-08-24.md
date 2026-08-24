## Task

DEV-1.1 — Persisted Developer specialties and delivery-area assignment integrity.

## Outcome

Workspace authorization still uses one `dev` role, while each Developer membership can now persist one or more `frontend`, `backend`, `mobile`, or `fullstack` specialties. New and edited Developer memberships require classification. Existing unclassified Developers are not guessed from historical data: they remain readable, are labelled **Unclassified Developer**, and retain temporary backend assignment compatibility until an administrator classifies them.

Authenticated Workspace member interfaces return the classification. Configured Developers can be assigned only to matching delivery areas during Task creation, reassignment, or delivery-area changes. Active development Tasks block removal of a required specialty. Only Workspace Owner may override a mismatch, with a required reason recorded in Task activity. Workspace role/specialty changes create membership activity, batch member addition validates Owner/Admin access in every target Workspace, and PostgreSQL guards reject specialties attached to an inactive, cross-Workspace, or non-Developer membership.

Workspace Settings supports adding and editing specialties on responsive member surfaces. Task planning filters Developer candidates by persisted capability. Task Hub, Task detail, My Tasks, and Report keep Frontend, Backend, Mobile, Fullstack, and QA data visible; Report also shows each active Developer's specialties. The full seed now contains distinct Backend, Frontend, Mobile, and Fullstack members and delivery subtasks. QA completion now waits for all four development areas.

ADR-002 records the accepted data, authorization, compatibility, override, and rollback decisions.

## Changed files

- `packages/contracts/src/workspace.ts`, `packages/contracts/src/task.ts`, and `packages/contracts/src/contracts.test.ts` — add specialty and mismatch-reason contracts with validation coverage.
- `apps/api/src/db/migrations/20260824000057-create-workspace-member-specialties.cjs` — creates the normalized table, constraints, trigger, index, and membership audit actions.
- `apps/api/src/db/models/workspaceMemberSpecialty.ts`, `workspaceMembershipActivity.ts`, `index.ts`, and `associations.ts` — model and associate persisted classification and audit records.
- `apps/api/src/modules/workspaces/workspaceService.ts` and `workspaceController.ts` — return, add, edit, protect, authorize, and audit Workspace classifications.
- `apps/api/src/modules/tasks/taskService.ts` — enforce specialty-compatible assignment, Owner-only reasoned overrides, reassignment/area-change checks, and QA dependency across every development area.
- `apps/api/src/modules/workspaces/__tests__/workspaceDeveloperSpecialtyApiIntegration.test.ts` and updated Task tests — prove HTTP/PostgreSQL persistence and assignment guardrails.
- `apps/api/scripts/seedFullTestData.ts` — adds classified Backend, Frontend, Mobile, and Fullstack members plus Mobile/Fullstack Tasks.
- `apps/api/scripts/verifyCleanMigrations.cjs` — verifies migration 57, the specialty table, value constraint, and integrity trigger on a disposable database.
- `apps/web/src/lib/api/workspaceService.ts`, `apps/web/src/store/workspaceSlice.ts`, and `apps/web/src/pages/WorkspaceSettingsPage.tsx` — carry specialties through authenticated API and Redux flows.
- `InviteMemberModal.tsx` and `WorkspaceMembersTable.tsx` — add accessible classification controls and explicit legacy state using shared UI components/tokens.
- `CreateSubtaskModal.tsx` and `SubtaskAccordionItem.tsx` — filter planning and editing candidates by persisted specialty.
- `SubtaskList.tsx`, `TaskCollection.tsx`, `TaskDetailDrawer.tsx`, `TaskReportDashboard.tsx`, and `CreateTaskModal.tsx` — expose complete delivery-area data and Developer classification across execution/reporting surfaces.
- Related frontend component tests — cover specialty editing, all delivery choices, Report classification, and revised copy.
- `docs/adr/ADR-002-DEVELOPER-SPECIALTIES-AND-DELIVERY-ASSIGNMENT.md`, delivery/design plans, `TODO.md`, and the completed-work archive — record the decision and completion evidence.

## Validation

- `npm --prefix packages/contracts test` — passed 51/51 tests in 15 suites, 0 skipped.
- `npm --prefix packages/contracts run build` — passed.
- `npm --prefix apps/api run typecheck` — passed.
- `npm --prefix apps/web run typecheck` — passed.
- `npm --prefix apps/api run db:verify:clean-migrations` — passed every canonical migration from 17 through 57 on a disposable PostgreSQL database; explicitly verified the specialty table, value constraint, and integrity trigger; database removed afterward.
- `npm --prefix apps/api run db:migrate:test` — applied migrations 55–57 to the configured PostgreSQL test database.
- Targeted `workspaceDeveloperSpecialtyApiIntegration.test.js` — passed 2/2 authenticated HTTP/PostgreSQL scenarios: classification persistence/list visibility, mismatch rejection, active-work protection, classification expansion, supported Mobile assignment, and audit.
- `npm --prefix apps/api test` — passed 225/225 tests in 63 suites, 0 skipped.
- `npm --prefix apps/web test` — passed 257/257 tests in 57 files, 0 skipped.
- `npm --prefix apps/web run build` — passed; 1,671 modules transformed. Existing Vite advisory remains for a 1,247.13 kB minified main chunk (288.87 kB gzip) exceeding 500 kB.
- `git diff --check -- <DEV-1.1 files>` — passed.

## Risks or follow-up

- Legacy Developers intentionally have no inferred specialties. The planning UI requires classification, but the backend retains temporary assignment compatibility for unclassified memberships to avoid breaking existing work. Removing that compatibility requires a later explicit migration task after every active Developer is classified.
- Rolling migration 57 back drops classification rows; production rollback must export `workspace_member_specialties` first.
- No manual browser session was run. Responsive and accessibility behavior is covered through the existing shared components and frontend regression suite; visual acceptance can be performed against the seeded Backend/Frontend/Mobile/Fullstack dataset.
- The existing Vite bundle-size advisory remains unrelated to specialty correctness.

## TODO update

- DEV-1.1 — Persisted Developer specialties and delivery-area assignment integrity → `Done` and archived.
