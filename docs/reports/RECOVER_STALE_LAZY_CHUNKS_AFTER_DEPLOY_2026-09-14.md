## Task

RECOVER-STALE-LAZY-CHUNKS-AFTER-DEPLOY: recover an authenticated browser tab when a new
deployment replaces a lazily loaded route chunk, without creating an automatic reload loop or
changing handling for ordinary application errors.

## Outcome

All lazy route imports now share a recovery helper. When Chrome, Safari, or Vite reports a known
dynamic-import/preload failure, the helper records a route-specific attempt in session storage and
performs one full reload. The marker has a 30-second cooldown to prevent a broken deployment or
network failure from causing a reload loop, and a successful import clears its own marker.

The shared Error Boundary keeps its existing reset behavior for ordinary render failures. For a
recognized stale-chunk failure, its `Coba Lagi` action now performs a full page reload so the
browser obtains the active deployment entry bundle instead of retrying a rejected lazy-import
promise.

## Source of truth and impact

- **Applicable SSoT:** `docs/3_UI_ATOMIC_DESIGN_SYSTEM.md` for the AppLayout, shared Error Boundary,
  route loading, and error-state contract; `docs/4_AGENT_DEV_GUIDELINES.md` for frontend validation
  and reporting.
- **Policy IDs:** `UI-001`, `UI-002`, `TEST-001`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** frontend-only runtime recovery. It adds no API contract, request,
  persisted record, local PII, or production fixture. Session storage contains only a logical route
  key and numeric recovery timestamp.
- **Authorization impact:** none. Authentication, ProtectedRoute, Workspace membership, roles, and
  backend authorization remain unchanged.
- **Migration risk:** none. No schema, Sequelize model, or migration changed.

## Changed files

- `apps/web/src/lib/routeChunkRecovery.ts` — recognizes route-chunk failures, performs a guarded
  reload, prevents rapid reload loops, and clears recovery state after success.
- `apps/web/src/app/App.tsx` — applies the helper to every lazy AppLayout and page import.
- `apps/web/src/components/ui/organisms/ErrorBoundary.tsx` — makes `Coba Lagi` use a full reload only
  for recognized route-chunk failures.
- `apps/web/src/lib/__tests__/routeChunkRecovery.test.ts` — covers error recognition, one-time
  recovery, cooldown, successful cleanup, and unrelated failures.
- `apps/web/src/components/ui/organisms/__tests__/ErrorBoundary.test.tsx` — verifies the chunk-error
  fallback reloads while ordinary errors retain the existing reset callback.
- `TODO.md` and this report — record scope, status, and evidence.

## Validation

- Production artifact diagnosis — the previous Ready deployment referenced
  `/assets/WorkHubPage-CX5CZDGC.js`, while the active deployment references
  `/assets/WorkHubPage-RgyMGA9h.js`. Requesting the old path through the canonical Production alias
  returned HTTP 200 `text/html` containing the SPA entry document rather than JavaScript; the
  active path returned HTTP 200 `application/javascript`. This reproduces the response mismatch
  that causes a dynamic-import rejection and Error Boundary fallback after login from an old tab.
- Focused first-login/onboarding checks before implementation — passed 25/25 tests across auth
  state, ProtectedRoute, RoleOnboardingModal, and Workspace settings; the observed failure was not
  reproduced by fresh-user data or onboarding state.
- Initial regression run before implementation — failed as expected: the recovery module did not
  exist and the new Error Boundary expectation observed zero reload calls.
- `npm --prefix apps/web run test -- src/lib/__tests__/routeChunkRecovery.test.ts src/components/ui/organisms/__tests__/ErrorBoundary.test.tsx src/components/layout/__tests__/AppLayout.test.tsx`
  — passed 3/3 files and 10/10 tests; 0 failed and 0 skipped.
- `npm --prefix apps/web run test` — passed 85/85 files and 445/445 tests; 0 failed and 0 skipped.
  Existing non-failing React `act(...)` warnings remained in unrelated Workspace, QA desk, Task
  timeline, notification, and Header tests.
- `npm --prefix apps/web run typecheck` — passed with no TypeScript errors.
- Targeted ESLint for all affected implementation/test files and the preserved AppLayout change —
  passed with 0 errors and 0 warnings.
- Targeted Prettier check, followed by formatting of the two reported files — passed.
- `npm run build` — passed contracts, API, and web Production builds; Vite transformed 1,708
  modules.
- `npm run validate` — passed documentation governance 5/5 and all contracts/API/web typechecks;
  repository lint reported 0 errors and 22 pre-existing warnings.
- `git diff --check` — passed with no whitespace errors.

## Risks or follow-up

- A browser document loaded before the first deployment containing this recovery code cannot gain
  the new behavior retroactively; that one old tab still needs a manual hard refresh. Tabs loaded
  from this version can self-recover from later chunk-hash replacements.
- The recovery intentionally reloads only recognized dynamic-import, chunk-load, and Vite CSS
  preload errors. Ordinary application errors continue to show the Error Boundary and will not
  unexpectedly reload.
- The worktree already contained a separate, uncommitted `PAGE-CONTENT-ERROR-BOUNDARY` change in
  `AppLayout`, its test, TODO entry, and report. It was preserved and included in regression
  validation but is not claimed as part of this task.
- This fix is verified locally but not committed, pushed, or deployed to Production in this task.

## TODO update

- `RECOVER-STALE-LAZY-CHUNKS-AFTER-DEPLOY` → `Done` locally; Production release remains pending.
