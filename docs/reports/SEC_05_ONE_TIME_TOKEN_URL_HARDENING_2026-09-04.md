# Agent Report — SEC-05 One-Time Token URL Hardening

## Task

Keep password-reset and Workspace invitation tokens out of server-visible URLs and remove them from browser history without invalidating already-issued links.

## Outcome

New password-reset and invitation set-password emails now use `/reset-password#token=...`. URL fragments are handled by the browser and are not included in the HTTP request to the web server or proxy.

The reset page captures a fragment token once, removes it from the browser URL during the layout phase, synchronizes React Router with a token-free replacement history entry, and retains the token only in component memory for the existing JSON-body reset request. Legacy `/reset-password?token=...` links remain usable and receive the same immediate sanitization. Unrelated query parameters are preserved.

The reset API, token hashing, one-hour expiry, single-use invalidation, password validation, and user interface remain unchanged.

## Source of truth and impact

- **Applicable SSoT:** `docs/0_PRODUCT_KNOWLEDGE_MAP.md`, `docs/1_ARCHITECTURE.md`, `docs/3_UI_ATOMIC_DESIGN_SYSTEM.md`, and `docs/4_AGENT_DEV_GUIDELINES.md`.
- **Feature Card:** `docs/features/SEC_05_ONE_TIME_TOKEN_URL_HARDENING.md`.
- **Policy IDs:** `AUTH-001`, `AUTH-002`, `DATA-001`, `TEST-001`, `UI-001`, `DOC-004`.
- **Data/interface impact:** New email-link transport changes from query to fragment. The reset API JSON contract and persisted hashed-token fields are unchanged. Legacy query links remain compatible.
- **Authorization impact:** None. Possession, expiry, hashing, one-time use, user lookup, and Workspace authorization rules are unchanged.
- **Migration risk:** None. No model, schema, migration, database configuration, or persisted record changed.

## Changed files

- `apps/api/src/services/emailService.ts` — generates fragment-based reset and set-password links.
- `apps/api/src/services/__tests__/emailService.test.ts` — proves email HTML contains fragment links and no reset query token.
- `apps/web/src/pages/ResetPasswordPage.tsx` — captures fragment or legacy query tokens and replaces the browser/router location without the token.
- `apps/web/src/pages/__tests__/ResetPasswordPage.test.tsx` — proves URL sanitization, legacy compatibility, and successful submission with the captured token.
- `docs/features/SEC_05_ONE_TIME_TOKEN_URL_HARDENING.md` — records cross-layer requirements and traceability.
- `TODO.md` — records scope and completion evidence.
- `docs/reports/SEC_05_ONE_TIME_TOKEN_URL_HARDENING_2026-09-04.md` — records this report.

## Validation

- Pre-fix focused backend test — `NODE_ENV=test npx tsx --test apps/api/src/services/__tests__/emailService.test.ts`: expected red result, 0 passed and 2 failed because links still used query tokens.
- Pre-fix focused frontend test — `npm --prefix apps/web run test -- src/pages/__tests__/ResetPasswordPage.test.tsx`: expected red result, 0 passed and 3 failed because fragment tokens were neither captured nor removed.
- Intermediate frontend run — 1/3 passed: captured-token submission worked, while initial layout navigation was held until React Router activation. The implementation was corrected to sanitize native browser history during layout and synchronize router state after activation.
- Final focused backend test — passed 2/2; 0 failed, skipped, or todo.
- Final focused frontend test — passed 3/3 in 1 file; 0 failed or skipped.
- `npm --prefix apps/web run test` — passed 327/327 tests across 67 files. Existing React `act(...)` and nested-button warnings remain unrelated.
- `npm --prefix apps/api run test:integration` — API build passed and 367/367 tests passed across 91 suites against the configured PostgreSQL test/Preview database; 0 failed, cancelled, skipped, or todo. Simulated FCM and unconfigured-test-SMTP notices were expected.
- `npm run build` — passed for contracts, API, and web; Vite transformed 1,694 modules.
- `npm run validate` — documentation checks passed 5/5, lint passed with 0 errors and 27 pre-existing warnings, and contracts/API/web typechecks passed.
- `git diff --check` — passed with no whitespace errors.
- No Production environment, database, deployment, or secret was accessed or changed.

## Risks or follow-up

- Legacy query links remain supported to avoid breaking already-issued one-hour links. They still reach the web server once on initial navigation, but the page removes the token from the current history entry immediately. Newly generated links use fragments and avoid that exposure.
- A future cleanup may remove legacy query compatibility after every previously issued token is guaranteed expired; this is not necessary for current security because new links no longer use the query format.

## TODO update

- `SEC-05-ONE-TIME-TOKEN-URL-HARDENING` → `Done`.
