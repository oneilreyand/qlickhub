## Task

MULTI-WORKSPACE-MEMBER-ACCESS-UX

## Outcome

Qlick Hub now supports one account being invited or added to multiple authorized Workspaces in a
three-step `Pengguna → Akses → Periksa` wizard. Owner/Admin can select Workspace-specific roles
and Developer specialties, review the batch, and open `Kelola akses Workspace` for an existing
member. Existing memberships are shown and excluded from new assignment payloads. The backend
persists the entire batch atomically and reports `added`, `restored`, or `already_member` results.

## Source of truth and impact

- **Applicable SSoT:** [Architecture](../1_ARCHITECTURE.md), [UI Design System](../3_UI_ATOMIC_DESIGN_SYSTEM.md), [Agent Guidelines](../4_AGENT_DEV_GUIDELINES.md)
- **Policy IDs:** `AUTH-001`, `AUTH-002`, `DATA-001`, `DATA-002`, `CONTRACT-001`, `UI-001`, `UI-002`, `TEST-001`, `DOC-002`, `DOC-003`, `DOC-004`
- **Data/interface impact:** `AddWorkspaceMemberSchema` accepts `assignments[]` and the response includes `assignmentResults[]`. One additive migration updates the activity action constraint; no existing membership data is deleted.
- **Authorization impact:** No expansion. Each target Workspace is checked for active Owner/Admin membership in the backend; PO remains read-only for membership management.
- **Migration risk:** Migration 67 is additive and reversible; it adds `member_added` to `ck_workspace_membership_activity_action`.

## Changed files

- `packages/contracts/src/workspace.ts` — Workspace-specific assignment and batch result contracts.
- `apps/api/src/modules/workspaces/internal/workspaceMembership.ts` — atomic multi-Workspace provisioning, restore, result statuses, and audit writes.
- `apps/api/src/db/models/workspaceMembershipActivity.ts` — `member_added` action type.
- `apps/api/src/db/migrations/20260911000067-add-member-added-activity-action.cjs` — canonical activity constraint migration.
- `apps/web/src/components/ui/organisms/InviteMemberModal.tsx` — responsive three-step invite/manage access wizard.
- `apps/web/src/components/ui/organisms/WorkspaceMembersTable.tsx` — `Kelola akses Workspace` action.
- `apps/web/src/pages/WorkspaceSettingsPage.tsx` — manageable Workspace filtering and wizard integration.
- `apps/web/src/store/workspaceSlice.ts` and `apps/web/src/lib/api/workspaceService.ts` — batch response handling without duplicate active members.
- `packages/contracts/src/contracts.test.ts`, `apps/api/src/modules/workspaces/__tests__/workspaceMemberAdditionApiIntegration.test.ts`, `apps/web/src/components/ui/organisms/__tests__/InviteMemberModal.test.tsx` — contract, PostgreSQL, and component coverage.
- `docs/features/MULTI_WORKSPACE_MEMBER_ACCESS_UX.md` — active Feature Knowledge Card.

## Validation

- `npm --prefix packages/contracts test` — 65/65 passed.
- `npm --prefix apps/api run db:migrate:test` — migration 67 applied successfully to the PostgreSQL test database.
- `npm --prefix apps/api run test:integration` — exit 0; 406 API test declarations passed with no failures observed. Focused member suite: 10/10 passed.
- `npm --prefix apps/web run test` — 77 test files, 395/395 passed. Focused wizard suite: 3/3 passed.
- `npm run build` — contracts, API, and production web build passed; Vite transformed 1,701 modules.
- `npm run validate` — docs check 5/5, lint 0 errors, typecheck contracts/API/web passed. Lint retained 23 pre-existing warnings.
- `git diff --check` — passed.

## Risks or follow-up

- This slice keeps the existing immediate-membership invitation semantics; a pending invitation entity
  and acceptance workflow remain a separate product decision.
- The existing settings effect retains one pre-existing exhaustive-deps warning; no new lint errors
  were introduced.

## TODO update

- `MULTI-WORKSPACE-MEMBER-ACCESS-UX` → `Done`
