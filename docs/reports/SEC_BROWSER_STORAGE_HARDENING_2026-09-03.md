# Security Hardening Report — Browser Storage Hardening (SEC-BROWSER-STORAGE-HARDENING)

## Task

SEC-BROWSER-STORAGE-HARDENING: Eliminate PII, authentication identity, role, and user metadata from browser localStorage.

## Outcome

Hardened browser client security across authentication, session handling, workspace context, and layout components:
- Wiped legacy auth keys (`user_id`, `user_email`, `user_name`, `user_role`, `user_onboarding_completed_at`) from `localStorage` on application startup via `cleanLegacyAuthStorage()`.
- Removed all `localStorage.setItem` and `localStorage.getItem` invocations for user profile, authentication identity, role, and onboarding metadata from production code.
- Changed Redux `authSlice` initial state to unauthenticated memory-only state (`currentUser: null`, `isAuthenticated: false`, `status: 'idle'`). User profile and role are hydrated solely from authenticated backend session (`/v1/auth/session`) in Redux memory.
- Maintained `ProtectedRoute` waiting for backend `/auth/session` without flashing protected content; rejects access and redirects to `/login` if session verification fails regardless of spoofed localStorage contents.
- Replaced direct `localStorage` reads in `AppLayout.tsx`, `UserProfileModal.tsx`, and `EmptyWorkspaceOnboarding.tsx` with Redux selectors and session user data.
- Completely eliminated dummy fallback email `qa.lead@company.com` from production paths.
- Migrated `active_workspace_id` to `sessionStorage` with backend membership validation; automatically cleared on logout and authentication failure (401).
- Simplified onboarding dismissal to a tab-scoped boolean flag in `sessionStorage` without embedding user IDs in storage keys.
- Preserved `theme` in `localStorage` as a non-sensitive user display preference.
- Centralized storage cleanup on logout, 401 unauthenticated, and startup through `browserStorage.ts`.

## Source of truth and impact

- **Applicable SSoT:**
  - `docs/1_ARCHITECTURE.md` (§2 System Architecture & Security Boundaries, §5 RBAC Security Model)
  - `docs/2_WORKFLOW_AND_ROLES.md` (§2 Role Matrix & Boundaries)
  - `docs/3_UI_ATOMIC_DESIGN_SYSTEM.md` (§1 Atomic Design Hierarchy, §3 Navigation Routes)
  - `docs/4_AGENT_DEV_GUIDELINES.md` (§1 SSoT Hierarchy, §3 Database & Test Evidence)
- **Policy IDs:** `AUTH-001`, `AUTH-002`, `DATA-001`
- **Data/interface impact:** None. API contracts (`/v1/auth/session`, `/v1/auth/login`, `/v1/workspaces`, etc.), DTOs, database schema, and Sequelize models remain unchanged.
- **Authorization impact:** Reinforced backend authority. Authorization decisions and member role assertions are driven entirely by backend responses; tampering with browser localStorage can no longer spoof roles, permissions, or authentication state.
- **Migration risk:** Low. Any legacy `user_*` keys left in existing user browsers are cleared automatically on startup via `cleanLegacyAuthStorage()`. `active_workspace_id` now resets upon closing the tab/browser or logging out.

## Changed files

- `apps/web/src/lib/storage/browserStorage.ts` — Centralized browser storage helper managing legacy auth key cleanup, session-scoped active workspace, and onboarding dismissal flag.
- `apps/web/src/lib/storage/__tests__/browserStorage.test.ts` — Unit tests for legacy storage cleanup, session-scoped active workspace, and onboarding dismissal.
- `apps/web/src/main.tsx` — Invokes `cleanLegacyAuthStorage()` on application startup before rendering.
- `apps/web/src/store/authSlice.ts` — Sets unauthenticated initial state in memory only, removes all `localStorage` writes/reads, and uses centralized storage cleanup.
- `apps/web/src/store/__tests__/authSlice.test.ts` — Tests verifying initial state starts unauthenticated, localStorage spoofing is ignored, and Redux actions do not persist to localStorage.
- `apps/web/src/store/workspaceSlice.ts` — Migrates `activeWorkspaceId` to `sessionStorage` and validates against backend memberships.
- `apps/web/src/store/__tests__/workspaceAndUiSlice.test.ts` — Updates test to assert `active_workspace_id` in `sessionStorage` and not `localStorage`.
- `apps/web/src/lib/api/apiClient.ts` — Calls `clearSessionScopedData()` on authentication failure (401).
- `apps/web/src/lib/api/authService.ts` — Removes `localStorage.setItem` in `updateProfile` and centralizes logout cleanup via `clearSessionScopedData()`.
- `apps/web/src/pages/LoginPage.tsx` — Removes PII and role writes to `localStorage` upon login; clears onboarding dismissal flag.
- `apps/web/src/pages/__tests__/LoginPage.test.tsx` — Updates login assertions to verify `localStorage` remains free of PII and role data while Redux state is populated.
- `apps/web/src/components/auth/ProtectedRoute.tsx` — Eliminates `localStorage` writes upon successful session resolution; enforces Redux-only hydration.
- `apps/web/src/components/auth/__tests__/ProtectedRoute.test.tsx` — Integration tests verifying loading spinner without content flash, rejection of spoofed `user_role=owner`, and Redux-only population on valid session.
- `apps/web/src/components/layout/AppLayout.tsx` — Removes `localStorage.getItem('user_email')` and `qa.lead@company.com` fallback; uses Redux email and simplified onboarding dismissal check.
- `apps/web/src/components/layout/Header.tsx` — Removes default `qa.lead@company.com` fallback prop; renders `effectiveEmail`.
- `apps/web/src/components/ui/organisms/UserProfileModal.tsx` — Removes `localStorage` reads for user name and email, relying on Redux user.
- `apps/web/src/components/ui/organisms/EmptyWorkspaceOnboarding.tsx` — Replaces `localStorage.getItem('user_role')` with Redux selector `selectCurrentUserRole`.
- `apps/web/src/components/ui/organisms/__tests__/EmptyWorkspaceOnboarding.test.tsx` — Updates tests to configure Redux auth state and verifies spoofed `user_role` in localStorage is ignored.
- `apps/web/src/components/ui/organisms/RoleOnboardingModal.tsx` — Simplifies onboarding dismissal flag to tab-scoped boolean without storing user ID in key.
- `TODO.md` — Updated active backlog with `SEC-BROWSER-STORAGE-HARDENING`.

## Validation

- `npm --prefix apps/web run test` — Passed. 67/67 test files passed, 325/325 tests passed.
- `npm --prefix apps/web run typecheck` — Passed. TypeScript compilation verified with 0 errors.
- `npm --prefix apps/web run build` — Passed in 2.53s. Production bundle built cleanly.
- `npm run lint` — Passed. ESLint passed with 0 errors (27 pre-existing warnings in unrelated files).
- `npm run docs:check` — Passed. 5/5 tests passed; documentation governance passed.
- `git diff --check` — Passed with 0 whitespace errors.
- `npm --prefix apps/api run test:integration` — Passed. 353/353 integration tests passed across 88 test suites on PostgreSQL test database.

## Risks or follow-up

- None. Existing browser sessions will have legacy `user_*` keys wiped upon initial page load without requiring manual cache invalidation.

## TODO update

- `SEC-BROWSER-STORAGE-HARDENING` → `Done`
