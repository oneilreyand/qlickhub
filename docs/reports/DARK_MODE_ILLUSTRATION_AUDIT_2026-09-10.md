## Task

DARK-MODE-ILLUSTRATION-AUDIT

## Outcome

Decorative illustrations now switch to contextual icons in dark mode while remaining visible in
light mode. The shared `EmptyState`, Overview banner carousel, and Login hero were the remaining
gaps. User-provided media (QA evidence, discussion images, avatars, and lightbox previews) remains
unchanged because it is content rather than decorative illustration.

## Source of truth and impact

- **Applicable SSoT:** `docs/3_UI_ATOMIC_DESIGN_SYSTEM.md` and `docs/4_AGENT_DEV_GUIDELINES.md`
- **Policy IDs:** `UI-001`, `UI-002`, `TEST-001`, `DOC-003`, `DOC-004`
- **Data/interface impact:** None
- **Authorization impact:** None
- **Migration risk:** None

## Changed files

- `apps/web/src/components/ui/molecules/EmptyState.tsx` — keeps the supplied illustration for
  light mode and renders the supplied empty-state icon for dark mode.
- `apps/web/src/components/ui/organisms/OverviewBannerCarousel.tsx` — hides decorative banners in
  dark mode and shows a contextual slide icon.
- `apps/web/src/pages/LoginPage.tsx` — replaces desktop and mobile hero illustrations with a
  shield icon in dark mode.
- `apps/web/src/components/ui/molecules/__tests__/EmptyState.test.tsx` — covers illustration/icon
  mode switching and icon-only empty states.
- `apps/web/src/components/ui/organisms/__tests__/OverviewBannerCarousel.test.tsx` — covers the
  dark-mode contextual icon contract.
- `apps/web/src/pages/__tests__/LoginPage.test.tsx` — covers desktop/mobile hero mode classes.
- `TODO.md` — records completion and evidence.

## Validation

- `npm --prefix apps/web run test -- src/components/ui/molecules/__tests__/EmptyState.test.tsx src/components/ui/organisms/__tests__/OverviewBannerCarousel.test.tsx src/pages/__tests__/LoginPage.test.tsx` — passed 11/11 tests across 3/3 files, 0 skipped.
- `npm --prefix apps/web run test` — passed 373/373 tests across 74/74 files, 0 skipped. Existing React `act(...)` and nested-button warnings remain in unrelated tests.
- `npx eslint` on all changed implementation and test files — passed with 0 errors and 0 warnings.
- `npm --prefix apps/web run build` — passed; TypeScript compilation and Vite production bundle completed successfully.
- Static `<img>` audit — all decorative illustration usages have `dark:hidden` plus an icon fallback; user media usages are intentionally excluded.
- Local desktop dark-mode preview — Login hero rendered the shield icon while branding and form layout remained intact. Mobile behavior is covered by responsive classes and automated assertions; no separate device-emulation surface was available in this runner.
- `git diff --check` — passed.

## Risks or follow-up

- None. Future decorative illustrations should follow the same light-image/dark-icon contract.

## TODO update

- `DARK-MODE-ILLUSTRATION-AUDIT` → `Done`
