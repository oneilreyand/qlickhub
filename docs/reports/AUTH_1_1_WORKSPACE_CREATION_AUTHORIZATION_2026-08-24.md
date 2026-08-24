## Task

AUTH-1.1 — Restrict Workspace creation to Owner, Admin, and PO.

## Outcome

Only globally authenticated Owner, Admin, and Product Owner users may create a Workspace. QA, Dev, Viewer, missing, and unknown roles are rejected by the backend policy and service authorization boundaries. The header Workspace switcher, empty-Workspace experience, and onboarding Workspace step mirror that server policy and no longer display creation controls to QA.

## Changed files

- `apps/api/src/policies/workspacePolicy.ts` — defines the canonical backend Workspace-creation role check and applies it to the authenticated route middleware.
- `apps/api/src/modules/workspaces/workspaceService.ts` — applies the same policy to direct service calls.
- `apps/api/src/modules/workspaces/__tests__/workspaceCreationAuthorizationApiIntegration.test.ts` — proves against PostgreSQL that QA is rejected and no Workspace is persisted.
- `apps/api/src/modules/workspaces/__tests__/workspaceApi.test.ts` and `apps/api/src/policies/__tests__/workspacePolicy.test.ts` — cover the allowed and rejected role matrix.
- `apps/web/src/lib/permissions/workspacePermissions.ts` — defines the shared frontend visibility policy.
- `apps/web/src/components/layout/Header.tsx` — hides header Workspace creation from QA.
- `apps/web/src/components/ui/organisms/EmptyWorkspaceOnboarding.tsx` — shows QA the assigned-Workspace waiting state instead of creation.
- `apps/web/src/components/ui/organisms/onboarding/OnboardingWorkspaceStep.tsx` — removes first/additional Workspace creation from QA onboarding.
- Associated frontend tests — cover the shared role matrix and all three UI surfaces.
- `docs/plans/QA_NATIVE_WORK_HUB_DELIVERY_PLAN.md` — records the Owner/Admin/PO-only authorization decision.

## Validation

- Pre-fix frontend reproduction: `npm --prefix apps/web test -- --run src/components/ui/organisms/__tests__/EmptyWorkspaceOnboarding.test.tsx src/components/layout/__tests__/Header.test.tsx src/components/ui/organisms/onboarding/__tests__/OnboardingWorkspaceStep.test.tsx` — failed 3/12 as expected because all three QA creation surfaces were still visible.
- Pre-fix PostgreSQL reproduction: `NODE_ENV=test DATABASE_SSL=false node --test apps/api/dist/modules/workspaces/__tests__/workspaceCreationAuthorizationApiIntegration.test.js` — failed 0/1 with `Missing expected rejection`, proving the service allowed QA and persisted a Workspace before cleanup.
- Targeted frontend: `npm --prefix apps/web test -- --run src/lib/permissions/__tests__/workspacePermissions.test.ts src/components/ui/organisms/__tests__/EmptyWorkspaceOnboarding.test.tsx src/components/layout/__tests__/Header.test.tsx src/components/ui/organisms/onboarding/__tests__/OnboardingWorkspaceStep.test.tsx` — passed 20/20 across 4 files, 0 skipped.
- Targeted backend unit: `npm --prefix apps/api run build && NODE_ENV=test DATABASE_SSL=false node --test apps/api/dist/policies/__tests__/workspacePolicy.test.js apps/api/dist/modules/workspaces/__tests__/workspaceApi.test.js` — build passed; tests passed 9/9, 0 skipped.
- Targeted PostgreSQL integration: `NODE_ENV=test DATABASE_SSL=false node --test apps/api/dist/modules/workspaces/__tests__/workspaceCreationAuthorizationApiIntegration.test.js` — passed 1/1 against the local `qa_management_test` PostgreSQL database, 0 skipped.
- Full API regression: `NODE_ENV=test DATABASE_SSL=false npm --prefix apps/api test` — build passed; tests passed 226/226 across 64 suites, 0 skipped.
- Full frontend regression: `npm --prefix apps/web test` — passed 269/269 across 59 files, 0 skipped.
- Frontend production build: `npm --prefix apps/web run build` — passed; Vite retained the existing advisory for a JavaScript chunk larger than 500 kB.

## Risks or follow-up

- No database migration or API contract change is required.
- The UI is only a presentational mirror; backend policy and service checks remain authoritative.
- Existing unrelated worktree changes were preserved.

## TODO update

- `AUTH-1.1 — Restrict Workspace creation to Owner, Admin, and PO` → `Done` and moved to `docs/archive/TODO_COMPLETED_2026-08-24.md`; active `TODO.md` retains unfinished work only.
