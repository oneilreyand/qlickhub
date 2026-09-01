# Fix Member Addition 404 for Unregistered Users — 2026-09-01

## Task

FIX-MEMBER-ADDITION-404: Auto-provision unregistered user accounts with default credentials and restore soft-deleted users when adding or inviting team members to Workspaces.

## Outcome

1. **Auto-provisioning**: When an Owner or Admin invites an unregistered email (e.g. `reyand.oneil@assist.id`), `addWorkspaceMember` now automatically provisions the user in `UserModel` with default hashed credentials (`Password123!`), derived name from the email prefix, and invited role, resolving the `404 Not Found: User with this email does not exist.` blocker.
2. **Account Restoration**: If an invited email corresponds to a soft-deleted `UserModel` record, the user account is restored (`user.restore()`) alongside the workspace membership.
3. **Developer Specialties & Invariants**: Persists Developer specialties for `dev` roles, enforces at least one specialty for new developers, prevents specialties on non-dev roles, and rejects forbidden owner assignments outside ownership transfers.
4. **Multi-Workspace Addition**: Successfully links the newly provisioned or existing user to all specified target workspaces in a single batch operation while verifying caller admin/owner authorization for each workspace.
5. **Invitation Dispatch**: `sendWorkspaceInvitationEmail` includes initial temporary credentials guidance and login link when inviting a newly provisioned user.
6. **Conflict Handling**: Correctly returns `409 Conflict` when a user is already an active member across all selected workspaces.

## Changed files

- `apps/api/src/modules/workspaces/workspaceService.ts` — auto-provisions non-existent users with bcrypt-hashed default password, restores soft-deleted users, passes `isNewUser` to invitation email, and fixes the all-active workspace conflict check.
- `apps/api/src/services/emailService.ts` — adds `isNewUser` parameter to `sendWorkspaceInvitationEmail` and renders initial temporary credentials notice in the invitation email HTML.
- `apps/api/src/modules/workspaces/__tests__/workspaceMemberAdditionApiIntegration.test.ts` — new integration test suite against PostgreSQL covering new QA user invitation, new Dev user invitation with specialties, multi-workspace additions, soft-deleted user restoration, admin invitations, 409 Conflict, and RBAC / owner rejection guards.
- `TODO.md` — tracks FIX-MEMBER-ADDITION-404 status.

## Validation

- `npm --prefix apps/api run build && NODE_ENV=test node --test apps/api/dist/modules/workspaces/__tests__/workspaceMemberAdditionApiIntegration.test.js` — passed (8/8 tests passed against PostgreSQL test database).
- `NODE_ENV=test node --test apps/api/dist/modules/workspaces/__tests__/*.test.js` — passed (30/30 tests passed across all 10 workspace test suites).
- `npm --prefix packages/contracts run test` — passed (56/56 tests passed).
- `npm --prefix apps/web run test` — passed (296/296 tests passed across 61 test files).
- `npm run typecheck` — passed (contracts, api, web 0 errors).
- `npm run build` — passed (contracts, api, web production builds).
- `npm run lint` — passed (0 errors).
- `git diff --check` — clean (0 whitespace/formatting issues).

## Risks or follow-up

- None. Existing database schema and migrations support nullable `password_hash` and standard `users` attributes; newly provisioned users can change their password at any time via Profile Settings or password reset links.

## TODO update

- `FIX-MEMBER-ADDITION-404: Auto-provision unregistered user accounts with default credentials and restore soft-deleted users when adding or inviting team members to Workspaces` → `Done`
