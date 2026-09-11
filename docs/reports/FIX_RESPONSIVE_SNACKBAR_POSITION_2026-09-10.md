## Task

FIX-RESPONSIVE-SNACKBAR-POSITION

## Outcome

Global snackbar notifications are horizontally centered and remain fully inside mobile and
tablet viewports. Long unbroken messages now wrap inside the snackbar instead of forcing its
content beyond the available width.

## Source of truth and impact

- **Applicable SSoT:** `docs/3_UI_ATOMIC_DESIGN_SYSTEM.md` and
  `docs/4_AGENT_DEV_GUIDELINES.md`
- **Policy IDs:** `UI-001`, `UI-002`, `DOC-003`, `DOC-004`
- **Data/interface impact:** None
- **Authorization impact:** None
- **Migration risk:** None

## Changed files

- `apps/web/src/components/ui/molecules/GlobalSnackbarHost.tsx` — replaces the right-offset,
  viewport-width host with symmetric responsive insets, automatic horizontal margins, and the
  existing maximum snackbar width.
- `apps/web/src/components/ui/molecules/Snackbar.tsx` — lets the message flex item shrink and wrap
  long unbroken content.
- `apps/web/src/components/ui/molecules/__tests__/GlobalSnackbarHost.test.tsx` — adds the mobile and
  tablet containment regression contract.
- `TODO.md` — records task completion and evidence.

## Validation

- Regression test before the fix — reproduced the issue because the host had `right-5 w-full`
  instead of symmetric centered bounds; 1/3 tests failed as expected.
- `npm --prefix apps/web test -- src/components/ui/molecules/__tests__/GlobalSnackbarHost.test.tsx`
  — passed 3/3 tests in 1 file, with 0 skipped.
- `npm --prefix apps/web test` — passed 365/365 tests across 73/73 files, with 0 skipped.
  The run emitted React `act(...)` warnings from existing tests for
  `MyTaskDetailWorkspaceDrawer`, `WorkspaceSettingsPage`, `TaskTimelineView`, and `Header`, plus
  an existing nested-button DOM warning from `ComponentGalleryPage`; none involved the changed
  snackbar files and there were no test failures.
- `npm --prefix apps/web run typecheck` — passed with 0 TypeScript errors.
- `npm --prefix apps/web run build` — passed; 1,699 modules transformed and the production bundle
  completed without warnings.
- `npx eslint apps/web/src/components/ui/molecules/GlobalSnackbarHost.tsx apps/web/src/components/ui/molecules/Snackbar.tsx apps/web/src/components/ui/molecules/__tests__/GlobalSnackbarHost.test.tsx`
  — passed with 0 errors and 0 warnings.
- Local visual layout review at 320 × 568 — snackbar bounds were 16–304 px (288 px wide), center
  delta 0 px, with no viewport overflow; the long message, status code, and dismiss control were
  all visible.
- Local visual layout review at 768 × 1,024 — snackbar bounds were 192–576 px (384 px wide), center
  delta 0 px, with no viewport overflow; stacked notifications remained centered.
- `git diff --check` for the touched implementation, test, report, and TODO files — passed.
- PostgreSQL validation was not applicable because this change does not touch persisted data,
  backend interfaces, schema, or migrations.

## Risks or follow-up

- None. The snackbar remains bottom-positioned and uses the existing animation, colors, z-index,
  dismissal behavior, and 384 px maximum width.

## TODO update

- `FIX-RESPONSIVE-SNACKBAR-POSITION` → `Done`
