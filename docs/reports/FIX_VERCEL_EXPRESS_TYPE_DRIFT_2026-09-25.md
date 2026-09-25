## Task

FIX-VERCEL-EXPRESS-TYPE-DRIFT — repair the failed Git-integrated Vercel Production build.

## Outcome

The API now declares the exact `@types/express` version already locked and used by its verified
local build. This removes the dependency-resolution drift that made Vercel compile controllers
against incompatible route-parameter types.

## Work assurance

- **Work Readiness Assessment:** 4/16, `Ready`; one API dependency declaration and lockfile are
  affected, with a deterministic local Vercel build available as evidence.
- **User plan approval:** Approved in the user's “ok kita coba” message on 2026-09-25.
- **Agent capability and access:** The executor inspected Vercel deployment logs, ran local builds,
  and can use the linked Vercel project. Production release is explicitly authorized separately.
- **AC-to-evidence matrix:**

| Acceptance Criterion                                                                 | Required / achieved evidence level (E0–E4) | Primary evidence and environment                                                       | Verification status |
| ------------------------------------------------------------------------------------ | ------------------------------------------ | -------------------------------------------------------------------------------------- | ------------------- |
| A clean Vercel Production build resolves the API type declaration deterministically. | E2 / E2                                    | `vercel build --prod --yes` completed successfully in the linked local Vercel project. | Accepted with gaps  |
| Project build remains valid after the dependency declaration change.                 | E2 / E2                                    | `npm run build` completed contracts, API TypeScript, and web Vite build with exit 0.   | Accepted            |

- **Evidence outcomes:** Deployment `qlickhub-7nksd6417-oneilreyands-projects.vercel.app`
  failed while compiling commit `e44c6e4` on `string | string[]` route parameters. After pinning
  the API type declaration, the Production-target local Vercel build passed.
- **Change Impact Map:** Dependency declaration and API compilation only; no runtime controller,
  browser, shared contract, data, authorization, migration, or release-policy change.
- **Decision Snapshot:** Pin the API declaration to the exact, already locked and verified type
  version. It prevents a divergent Vercel install. A future Express v5 type migration must be a
  separate controller-validation task.
- **Agent handoff and independent verification:** Cloud Git deployment remains to be observed.

## Source of truth and impact

- **Applicable SSoT:** `docs/DEPLOYMENT_AND_ENVIRONMENTS.md`; `docs/4_AGENT_DEV_GUIDELINES.md` §2A.
- **Policy IDs:** `AI-002`, `AI-003`, `AI-005`, `AI-007`, `AI-008`, `TEST-001`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** None.
- **Authorization impact:** None.
- **Migration risk:** None.

## Changed files

- `apps/api/package.json` — pins API Express type declaration to `4.17.25`.
- `package-lock.json` — records the exact workspace declaration.
- `TODO.md` — records the completed task.

## Validation

- `npm run build` — passed; contracts, API TypeScript, and Vite Production build completed with 0 errors.
- `vercel build --prod --yes` — passed; dependency install and local Production-target Vercel build completed.
- `git diff --check` — passed; no whitespace errors.
- `npm run docs:check` — passed; 5/5 tests, 0 failed, 0 skipped.

## Risks or follow-up

Observe the cloud Git build and Production smoke checks. Do not use `--prebuilt` as proof that the
Git build has compiled.

## Human decision summary

The known build blocker has a deterministic local fix and no product/data impact.

## TODO update

- FIX-VERCEL-EXPRESS-TYPE-DRIFT → `Done`
