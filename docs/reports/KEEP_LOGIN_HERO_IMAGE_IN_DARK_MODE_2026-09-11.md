# Keep Login Hero Image in Dark Mode — 2026-09-11

## Task

Keep the responsive Login hero image visible in dark mode instead of replacing it with a contextual
shield icon.

## Outcome

The desktop and mobile Login hero surfaces now render the same responsive Cloudinary image in light
and dark themes. The existing responsive layout, dark contrast overlays, branding, and accessible
image names remain unchanged.

## Source of truth and impact

- **Applicable SSoT:** `docs/3_UI_ATOMIC_DESIGN_SYSTEM.md` and
  `docs/4_AGENT_DEV_GUIDELINES.md`.
- **Policy IDs:** `UI-001`, `UI-002`, `TEST-001`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** None. No API, shared contract, or persisted data changed.
- **Authorization impact:** None.
- **Migration risk:** None. No schema or migration changed.

## Changed files

- `apps/web/src/pages/LoginPage.tsx` — removed theme-conditioned image hiding and the desktop/mobile
  dark-mode icon replacements.
- `apps/web/src/pages/__tests__/LoginPage.test.tsx` — locks in the invariant that both responsive
  Login images have no dark-mode hiding class and no icon replacement is rendered.
- `TODO.md` — records task status and validation evidence.
- `docs/reports/KEEP_LOGIN_HERO_IMAGE_IN_DARK_MODE_2026-09-11.md` — records this handoff.

## Validation

- Regression baseline: `npm test --workspace apps/web -- --run src/pages/__tests__/LoginPage.test.tsx`
  failed before the implementation with 1 failed and 5 passed tests because the desktop image still
  had `dark:hidden`.
- Focused regression: `npm test --workspace apps/web -- --run src/pages/__tests__/LoginPage.test.tsx`
  passed 6/6 tests after the implementation; 0 skipped.
- Complete frontend: `npm test --workspace apps/web -- --run` passed 392/392 tests across 76/76
  files; 0 failed and 0 skipped. Existing React `act(...)` warnings and one existing nested-button
  warning were emitted outside the Login test.
- Typecheck: `npm run typecheck --workspace apps/web` passed with exit code 0.
- Production build: `npm run build --workspace apps/web` passed with 1,700 transformed modules and
  exit code 0.
- Targeted lint: `npx eslint apps/web/src/pages/LoginPage.tsx apps/web/src/pages/__tests__/LoginPage.test.tsx`
  passed with 0 errors and 0 warnings.
- Static and whitespace check: the Login implementation contains no `login-dark-mode-icon` or
  `dark:hidden` match; `git diff --check` passed for the changed Login files and TODO entry.
- Documentation governance: `npm run docs:check` passed 5/5 checks and the structural documentation
  validation; 0 failed and 0 skipped.
- Visual review: local dark-mode desktop review showed the image in the left hero panel; local
  dark-mode mobile review at 390 by 844 pixels showed the same image in the responsive banner. The
  form, contrast overlays, and accessible image names remained intact.

## Risks or follow-up

- The remote Cloudinary asset remains an existing runtime dependency; this change does not alter its
  URL or fallback behavior.
- No Production deployment was requested or performed.

## TODO update

- `KEEP-LOGIN-HERO-IMAGE-IN-DARK-MODE` → `Done`.
