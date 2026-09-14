## Task

PAGE-CONTENT-ERROR-BOUNDARY: Keep the authenticated application menu visible when routed page content crashes.

## Outcome

`AppLayout` now contains routed page children in the shared `ErrorBoundary` inside its main content region. A page render failure therefore replaces only page content with the existing recovery view while the authenticated header, navigation, and global shell remain rendered. The boundary is keyed to the current path and query string so navigating through the surviving menu retries rendering against the destination URL.

## Source of truth and impact

- **Applicable SSoT:** `docs/3_UI_ATOMIC_DESIGN_SYSTEM.md` for the `AppLayout` shell, shared `ErrorBoundary` organism, and error-state behavior; `docs/4_AGENT_DEV_GUIDELINES.md` for frontend verification and reporting.
- **Policy IDs:** `UI-001`, `UI-002`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** None. No API contract, backend interface, persisted data, or production fixture changed.
- **Authorization impact:** None. The existing authenticated route and backend authorization boundaries are unchanged.
- **Migration risk:** None. No schema, Sequelize model, or migration changed.

## Changed files

- `apps/web/src/components/layout/AppLayout.tsx` — places the shared error boundary inside `<main>` and resets it when the route URL changes.
- `apps/web/src/components/layout/__tests__/AppLayout.test.tsx` — proves a crashing page renders the fallback inside main content while application navigation remains visible.
- `TODO.md` — records task lifecycle and verification evidence.
- `docs/reports/PAGE_CONTENT_ERROR_BOUNDARY_2026-09-14.md` — records this handoff evidence.

## Validation

- `npm --prefix apps/web run test -- src/components/layout/__tests__/AppLayout.test.tsx src/components/ui/organisms/__tests__/ErrorBoundary.test.tsx` — passed: 2/2 files, 4/4 tests, 0 skipped.
- `npm --prefix apps/web run test` — passed on the standalone rerun: 84/84 files, 439/439 tests, 0 skipped. Existing React `act(...)` warnings remain in unrelated tests for `MyTaskDetailWorkspaceDrawer`, `WorkspaceSettingsPage`, `TaskTimelineView`, and `Header`.
- `npm --prefix apps/web run typecheck` — passed with no TypeScript errors.
- `npx eslint apps/web/src/components/layout/AppLayout.tsx apps/web/src/components/layout/__tests__/AppLayout.test.tsx` — passed with 0 errors and 0 warnings.
- `npx prettier --check apps/web/src/components/layout/AppLayout.tsx apps/web/src/components/layout/__tests__/AppLayout.test.tsx TODO.md docs/reports/PAGE_CONTENT_ERROR_BOUNDARY_2026-09-14.md` — passed.
- `npm --prefix apps/web run build` — passed: TypeScript compilation and Vite production build completed; 1,707 modules transformed.
- `npm run validate` — passed: documentation checks 5/5, repository lint 0 errors with 22 pre-existing warnings, and type-checks for contracts, API, and web.
- `git diff --check` — passed with no whitespace errors.
- Responsive structure review — passed: the new boundary is a child of the existing responsive `<main>` while header/navigation remain sibling shell elements; no breakpoint-specific layout or styling changed.

The first parallel validation attempt exposed one unused test import and one pre-existing `UserFlowGuide` timeout under concurrent build/test load. The unused import was corrected; the focused checks and standalone complete frontend suite then passed as recorded above.

## Risks or follow-up

- The content boundary intentionally does not catch failures inside `AppLayout` itself (header, navigation, session modals, or global providers); those remain covered by the existing global fallback because the shell cannot be preserved if the shell itself crashes.
- No authenticated browser crash was injected into a production page; regression coverage uses a deliberate crashing test component to verify the exact React containment behavior without adding a runtime-only failure path.

## TODO update

- `PAGE-CONTENT-ERROR-BOUNDARY` → `Done`.
