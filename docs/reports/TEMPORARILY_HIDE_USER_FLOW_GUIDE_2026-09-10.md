## Task

TEMPORARILY-HIDE-USER-FLOW-GUIDE

## Outcome

The User Flow Guide is temporarily absent from the sidebar, the header guide icon, and the
profile menu. Its implementation and protected `/user-flows` route remain intact so the surface
can be restored by changing one UI visibility switch.

## Source of truth and impact

- **Applicable SSoT:** `docs/3_UI_ATOMIC_DESIGN_SYSTEM.md` for application navigation and shared
  layout behavior; `docs/4_AGENT_DEV_GUIDELINES.md` for frontend validation and reporting.
- **Policy IDs:** `UI-001`, `UI-002`, `TEST-001`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** None. No API or persisted contract changed.
- **Authorization impact:** None. The existing protected direct route remains protected.
- **Migration risk:** None.

## Changed files

- `apps/web/src/config/featureVisibility.ts` — defines the temporary User Flow Guide visibility
  switch.
- `apps/web/src/components/layout/Sidebar.tsx` — omits the guide navigation entry while the switch
  is disabled.
- `apps/web/src/components/layout/Header.tsx` — omits the header icon and profile-menu guide item
  while the switch is disabled.
- `apps/web/src/components/layout/__tests__/Sidebar.test.tsx` — verifies the sidebar entry remains
  hidden.
- `apps/web/src/components/layout/__tests__/Header.test.tsx` — verifies both header entry points
  remain hidden.
- `TODO.md` — records the requested UI change and its evidence.

## Validation

- `npm run test --workspace=@qlick/web -- apps/web/src/components/layout/__tests__/Sidebar.test.tsx apps/web/src/components/layout/__tests__/Header.test.tsx`
  — failed before execution because paths were incorrectly root-relative for the workspace runner;
  zero tests ran.
- `npm run test --workspace=@qlick/web -- src/components/layout/__tests__/Sidebar.test.tsx src/components/layout/__tests__/Header.test.tsx`
  — passed: 2 files, 14 tests, 0 skipped. Existing asynchronous React `act(...)` warnings were
  emitted by Header/NotificationBell tests.
- The initial `npm run typecheck:web` and `npm run build --workspace=@qlick/web` attempts stopped on
  the unrelated in-progress `TaskDetailProductBriefTab.test.tsx` while its imported component was
  not yet present. Both canonical checks passed when rerun after that component became available.
- `npx tsc --project tsconfig.hide-guide.json --noEmit` — passed with only the unrelated incomplete
  Product Brief test excluded through a temporary configuration; the temporary file was removed.
- `npm exec --workspace=@qlick/web -- vite build` — passed: 1,698 modules transformed and the
  production bundle generated.
- `npm run typecheck:web` — passed on the complete web tree after the concurrent Product Brief file
  became available.
- `npm run build:web` — passed: TypeScript compilation completed, 1,699 modules transformed, and
  the production bundle generated.
- `npx eslint apps/web/src/config/featureVisibility.ts apps/web/src/components/layout/Sidebar.tsx apps/web/src/components/layout/Header.tsx apps/web/src/components/layout/__tests__/Sidebar.test.tsx apps/web/src/components/layout/__tests__/Header.test.tsx`
  — passed with 0 errors and 0 warnings.
- `npx prettier --check apps/web/src/config/featureVisibility.ts apps/web/src/components/layout/Sidebar.tsx apps/web/src/components/layout/Header.tsx apps/web/src/components/layout/__tests__/Sidebar.test.tsx apps/web/src/components/layout/__tests__/Header.test.tsx`
  — passed.
- `git diff --check -- apps/web/src/config/featureVisibility.ts apps/web/src/components/layout/Sidebar.tsx apps/web/src/components/layout/Header.tsx apps/web/src/components/layout/__tests__/Sidebar.test.tsx apps/web/src/components/layout/__tests__/Header.test.tsx`
  — passed.
- `npm run docs:check` — passed: 5 documentation tests, 0 failures, and documentation governance
  passed.

## Risks or follow-up

- A user who already knows `/user-flows` can still open it directly. This is intentional because the
  requested behavior was to hide the feature, not remove or deny access to it.

## TODO update

- `TEMPORARILY-HIDE-USER-FLOW-GUIDE` → `Done`
