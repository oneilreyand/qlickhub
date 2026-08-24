## Task

MEM-8.3 — Make Workspace member offboarding role-safe and history-preserving.

## Outcome

Workspace offboarding now enforces the approved hierarchy in the backend: Owner may remove Admin, PO, QA, or Dev; Admin may remove only PO, QA, or Dev. PO, QA, Dev, non-members, and inactive memberships cannot remove anyone. The UI mirrors this hierarchy on mobile and desktop without being treated as authorization.

Removal is rejected with HTTP 409 while the target owns an active Task or an open, in-progress, resolved-awaiting-verification, or reopened Bug. A successful removal runs in one transaction: it soft-deletes the membership, revokes any Task-creation permission, and appends a Workspace membership activity with the actor and removed role. Historical Task/Bug/release references remain intact. Database triggers reject new Task or Bug assignments to inactive memberships, and re-adding the same user restores the historical membership row with a restoration audit.

## Changed files

- `apps/api/src/db/migrations/20260824000055-soft-delete-workspace-memberships.cjs` — adds soft deletion, membership activity, indexes, constraints, and active-assignee database guards.
- `apps/api/src/db/models/workspaceMember.ts` — enables Sequelize paranoid membership queries.
- `apps/api/src/db/models/workspaceMembershipActivity.ts` — models append-only removal/restoration audit records.
- `apps/api/src/db/models/index.ts` and `apps/api/src/db/models/associations.ts` — export and associate membership activity.
- `apps/api/src/modules/workspaces/workspaceService.ts` — enforces role hierarchy and assignment blockers, revokes permissions, audits removal, and restores re-added members transactionally.
- `apps/api/src/modules/workspaces/workspaceController.ts` — passes the authenticated actor to the removal service.
- `apps/api/src/modules/workspaces/__tests__/workspaceMemberOffboardingApiIntegration.test.ts` — proves role boundaries, blockers, atomic persistence, access revocation, database assignment guards, restoration, and audit through authenticated HTTP.
- `apps/api/src/modules/tasks/__tests__/taskApiIntegration.test.ts` — aligns the historical-assignee regression with soft-deleted membership semantics.
- `apps/api/scripts/verifyWorkspaceMemberOffboarding.cjs` and `apps/api/package.json` — add repeatable validation on a disposable PostgreSQL database.
- `apps/web/src/components/ui/organisms/WorkspaceMembersTable.tsx` and `apps/web/src/pages/WorkspaceSettingsPage.tsx` — hide removal actions according to the signed-in Workspace role and target role.
- `apps/web/src/components/ui/organisms/__tests__/WorkspaceMembersTable.test.tsx` — covers Owner, Admin, and non-manager visibility on both responsive surfaces.
- `docs/plans/QA_NATIVE_WORK_HUB_DELIVERY_PLAN.md` — records the authoritative offboarding matrix and lifecycle behavior.
- `TODO.md` and `docs/archive/TODO_COMPLETED_2026-08-24.md` — claim and archive the completed item.

## Validation

- `npm run typecheck --workspace apps/api` — passed.
- `npm run typecheck --workspace apps/web` — passed.
- `npm run db:verify:clean-migrations --workspace apps/api` — passed all 39 canonical migrations from 17 through 55 on disposable PostgreSQL; 0 skipped.
- `npm run db:verify:workspace-member-offboarding --workspace apps/api` — passed 7/7 targeted HTTP/PostgreSQL scenarios in 1 suite, 0 skipped; API build passed; disposable database removed afterward.
- `OFFBOARDING_VERIFY_FULL_SUITE=true npm run db:verify:workspace-member-offboarding --workspace apps/api` — passed 221/221 tests in 62 suites, 0 skipped, on a fresh disposable PostgreSQL database; API build passed; database removed afterward.
- `npm test --workspace apps/web -- --run src/components/ui/organisms/__tests__/WorkspaceMembersTable.test.tsx` — passed 3/3, 0 skipped.
- `npm test --workspace apps/web` — passed 255/255 in 57 files, 0 skipped.
- `npm run build --workspace apps/web` — passed; retained the existing Vite advisory for a minified main chunk larger than 500 kB.
- `git diff --check -- <MEM-8.3 files>` — passed.

## Risks or follow-up

- Soft-deleted membership rows intentionally remain in PostgreSQL so historical foreign keys and audit records are preserved; operational retention/anonymization for deleted user accounts is a separate policy decision.
- No visual browser session was run. The changed UI reuses the existing responsive member table/card surfaces, and its permission visibility is covered by component regression tests.

## TODO update

- MEM-8.3 — Make Workspace member offboarding role-safe and history-preserving → `Done` and archived.
