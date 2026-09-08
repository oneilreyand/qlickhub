## Task

WORKSPACE-PERMANENT-DELETION — Owner permanent deletion of an archived Workspace

## Outcome

Implemented an Owner-only `DELETE /v1/workspaces/:workspaceId` flow. The endpoint requires an
archived Workspace and an exact current-name confirmation, removes Workspace-owned PostgreSQL
records and storage, retains user accounts, and returns a canonical response. Storage cleanup runs
before the database transaction commits; storage errors abort the transaction. Workspace Settings
now exposes the action only to the Owner of an archived Workspace and disables confirmation until
the exact name is entered.

## Source of truth and impact

- **Applicable SSoT:** `docs/1_ARCHITECTURE.md`, `docs/2_WORKFLOW_AND_ROLES.md`,
  `docs/3_UI_ATOMIC_DESIGN_SYSTEM.md`, `docs/4_AGENT_DEV_GUIDELINES.md`, and the permanent-deletion
  decision record in `docs/adr/`.
- **Policy IDs:** `AUTH-002`, `AUTH-007`, `DATA-001`, `DATA-002`, `DATA-003`, `CONTRACT-001`,
  `UI-001`, `UI-002`, `TEST-001`, `DOC-002`, `DOC-004`.
- **Data/interface impact:** Adds the shared confirmation/response contract and DELETE endpoint;
  deletes all Workspace-owned records and storage while retaining users. No schema migration was
  required.
- **Authorization impact:** Backend requires active `owner` membership and verifies `owner_id`.
  Archived state and exact-name confirmation are checked inside a locked transaction.
- **Migration risk:** No new migration. Existing restricted child rows and the legacy migration
  preservation table are deleted explicitly before the Workspace root.

## Changed files

- `apps/api/src/modules/workspaces/*` — route, controller, service, and transactional purge.
- `apps/api/src/services/storageService.ts` — permanent local/Google Drive Workspace cleanup.
- `apps/api/src/http/middleware/workspaceArchive.ts` — permits the guarded archived-Workspace delete
  route to reach its Owner authorization.
- `apps/api/src/modules/workspaces/__tests__/workspacePermanentDeletionApiIntegration.test.ts` —
  PostgreSQL/storage integration coverage.
- `packages/contracts/src/workspace.ts` and `packages/contracts/src/contracts.test.ts` — shared
  delete input/response and validation coverage.
- `apps/web/src/lib/api/workspaceService.ts`, `apps/web/src/store/workspaceSlice.ts`, and
  `apps/web/src/pages/WorkspaceSettingsPage.tsx` — Owner UI, exact-name confirmation, and state
  removal after success.
- `apps/web/src/pages/__tests__/WorkspaceSettingsPage.test.tsx` — confirmation behavior coverage.
- `docs/adr/ADR-008-WORKSPACE-PERMANENT-DELETION.md`, `docs/features/WORKSPACE_PERMANENT_DELETION.md`,
  SSoT/policy registry, and `TODO.md` — policy and traceability updates.

## Validation

- `npm --prefix packages/contracts run typecheck` — passed.
- `npm --prefix apps/api run typecheck` and `npm --prefix apps/api run build` — passed.
- `npm --prefix apps/web run typecheck` and `npm --prefix apps/web run build` — passed.
- `node --test packages/contracts/dist/contracts.test.js` — passed, 62/62 tests, 0 skipped.
- Focused Workspace Settings Vitest — passed, 6/6 tests; existing React `act(...)` warnings remain.
- Permanent-delete confirmation now trims pasted leading/trailing whitespace before enabling the
  action or sending the confirmation name; the focused UI regression remains 6/6.
- Archived-mutation middleware regression — passed; permanent-delete requests with a trailing slash
  reach Owner authorization instead of returning `WORKSPACE_ARCHIVED`.
- Targeted ESLint — 0 errors, 1 pre-existing hook warning in `WorkspaceSettingsPage.tsx`.
- `npm run docs:check` and `git diff --check` — passed.
- `ATTACHMENT_STORAGE_PROVIDER=local NODE_ENV=test node --test apps/api/dist/modules/workspaces/__tests__/workspacePermanentDeletionApiIntegration.test.js`
  — passed, 2/2 tests, 0 skipped; verified Owner/archive/name guards plus persisted database and
  local-storage deletion while retaining user accounts.
- `npm --prefix apps/api run test:integration` — passed, 399/399 tests, 0 skipped.
- `npm --prefix apps/web test` — passed, 346/346 tests, 0 skipped; existing React test warnings
  remain.
- `npm --prefix packages/contracts test` — passed, 62/62 tests, 0 skipped.
- `npm --prefix apps/api run db:verify:clean-migrations` — passed; all 50 canonical migrations
  applied on a disposable PostgreSQL database.
- `npm run validate`, `npm run env:check`, and `npm run build` — passed; lint reported 26 existing
  warnings and 0 errors.

## Risks or follow-up

- The action is irreversible; deleted Workspace records and stored files have no product-level undo.

## TODO update

- WORKSPACE-PERMANENT-DELETION → Done
