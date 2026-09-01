## Task

Owner-only Workspace archive and restore.

## Outcome

- Only the persisted Workspace Owner can archive or restore a Workspace.
- Archive preserves all records and makes Workspace-scoped mutation requests return `409 WORKSPACE_ARCHIVED`.
- Archive and restore write persisted audit activity. The Workspace Settings page presents an Owner-only archive/restore action and a read-only state.

## Changed files

- `packages/contracts/src/workspace.ts` — exposes `archivedAt` in the Workspace contract.
- `apps/api/src/modules/workspaces/*` — archive/restore service, controller, and routes.
- `apps/api/src/http/middleware/workspaceArchive.ts` — rejects Workspace-scoped mutations while archived.
- `apps/api/src/db/migrations/20260901000063-add-workspace-archive-activity-actions.cjs` — permits archive audit actions.
- `apps/web/src/pages/WorkspaceSettingsPage.tsx` and Workspace API/store files — Owner action and archived read-only presentation.

## Validation

- `npm --prefix packages/contracts run typecheck` — passed.
- `npm --prefix apps/api run typecheck` — passed.
- `npm --prefix apps/web run typecheck` — passed.
- `npm --prefix apps/api run db:migrate:test` — migration 63 passed on the disposable test database.
- `workspaceArchiveApiIntegration.test.js` — 1/1 PostgreSQL integration test passed.
- `npm --prefix apps/api run db:migrate` — development migrations 62 and 63 applied; no data deletion.
- `npm --prefix apps/web run build` — passed.
- `git diff --check` — passed.

## Risks or follow-up

- Archived Workspaces remain selectable so their Owner can restore them; all write actions remain backend-blocked and the settings screen is read-only.

## TODO update

- `WORKSPACE-ARCHIVE-OWNER-ONLY` → `Done`.
