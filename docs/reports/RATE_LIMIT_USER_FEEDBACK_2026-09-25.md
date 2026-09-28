## Task

RATE-LIMIT-USER-FEEDBACK — shorten the visible wait, show quota details, and show a server-timed countdown when Qlick Hub rate-limits a request.

## Outcome

Production API and login rate-limit windows are now five minutes rather than fifteen, preserving the former average protection rate (API: 100/5 min; failed login: 3/5 min). The browser reads the existing IETF RateLimit headers, shows `remaining/limit`, and counts down from the server reset time. Login remains enabled while attempts remain; an exhausted limit disables it until the countdown expires. Authenticated pages show an equivalent dismissible 429 notification. Link-preview remains 30 requests per rolling 60 seconds.

## Work assurance

- **Work Readiness Assessment:** 3/16, `Ready`. Requirement clarity 1 (the user asked for a shorter wait without a number); affected layers 1 (API and UI); touch points 1 (shared API client and its UI consumers); all other dimensions 0. The initial 7/16 estimate was reduced after inspection confirmed the header contract already existed and no persistence, authorization, shared DTO, migration, or external service changed.
- **Agent capability and access:** The executor read the applicable SSoT and implementation, changed the required files, ran TypeScript, focused UI/API tests, production frontend build, and docs checks. A local ephemeral-port API test initially failed inside the filesystem sandbox (`EPERM`) and then passed in the approved local test environment. No PostgreSQL or deployed browser session was needed for this header/UI-only slice.
- **AC-to-evidence matrix:**

| Acceptance Criterion                        | Required / achieved evidence level (E0–E4) | Primary evidence and environment                              | Verification status |
| ------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------- | ------------------- |
| RLF-AC-1: show server quota and countdown   | E2 / E2                                    | `apiClient.test.ts`, `RateLimitCountdown.test.tsx`            | Accepted            |
| RLF-AC-2: login disables only at exhaustion | E2 / E2                                    | `LoginPage.test.tsx`, 7 tests                                 | Accepted            |
| RLF-AC-3: global 429 notice                 | E2 / E2                                    | `GlobalSnackbarHost.test.tsx`, 4 tests                        | Accepted            |
| RLF-AC-4: retain link-preview enforcement   | E2 / E2                                    | compiled API tests for distributed limiter and proxy, 7 tests | Accepted            |

- **Change Impact Map:** Module change. `rateLimit.ts` labels and shortens API/login limiters; `apiClient.ts` parses standard response metadata and emits a browser-only 429 event; `LoginPage`, `GlobalSnackbarHost`, `Snackbar`, and the new `RateLimitCountdown` render it. No database, migration, persisted contract DTO, authorization, deployment configuration, or release gate changes.
- **Decision Snapshot:** The prior 15-minute windows were accurate but imposed a long user wait. Keeping their per-minute throughput while using five-minute windows was selected so the maximum wait is shorter without loosening the average defense. A server-estimated browser-only timer was rejected because clock drift could mislead users; the implementation instead uses `Retry-After`/RateLimit reset values. The 30/60-second link-preview policy was retained. Rollback restores the four API/login constants and removes the UI metadata consumption; no data recovery is needed.
- **Agent handoff and independent verification:** Working tree baseline contained unrelated user documentation edits. Focused deterministic checks cover every acceptance criterion and are `Accepted`. The full web suite has two unrelated TaskTimeline test failures (see Validation), so overall repository verification is `Accepted with gaps`; no independent deployed UAT was performed.

## Source of truth and impact

- **Applicable SSoT:** [Architecture link-preview protection](../1_ARCHITECTURE.md#perlindungan-link-preview-terdistribusi), [UI Atomic Design System](../3_UI_ATOMIC_DESIGN_SYSTEM.md), [Agent Guidelines §2A](../4_AGENT_DEV_GUIDELINES.md#2a-protokol-assurance-kerja-ai-ai-work-assurance-protocol), and [Feature Card](../features/RATE_LIMIT_USER_FEEDBACK.md).
- **Policy IDs:** `AUTH-002`, `SEC-001`, `CONTRACT-001`, `UI-001`, `UI-002`, `TEST-001`, `AI-002`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** Existing standard HTTP headers gain endpoint identifiers and are consumed by the web client. No JSON contract or `packages/contracts` change.
- **Authorization impact:** None; backend enforcement remains authoritative.
- **Migration risk:** None.

## Changed files

- `apps/api/src/http/middleware/rateLimit.ts` — five-minute API/login windows and named rate-limit headers.
- `apps/api/src/http/__tests__/rateLimitConfig.test.ts` — production window/rate regression test.
- `apps/web/src/lib/api/apiClient.ts` — safe RateLimit/Retry-After parsing and 429 event metadata.
- `apps/web/src/components/ui/molecules/RateLimitCountdown.tsx` — accessible remaining quota and countdown UI.
- `apps/web/src/components/ui/molecules/GlobalSnackbarHost.tsx` and `Snackbar.tsx` — global 429 rendering.
- `apps/web/src/pages/LoginPage.tsx` — login quota and disabled-state feedback.
- focused web test files — header parsing, countdown, global notice, and login behavior.
- `docs/features/RATE_LIMIT_USER_FEEDBACK.md` — feature scope and acceptance criteria.

## Validation

- `npm --workspace @qlick/web run test -- src/lib/api/__tests__/apiClient.test.ts src/components/ui/molecules/__tests__/RateLimitCountdown.test.tsx src/components/ui/molecules/__tests__/GlobalSnackbarHost.test.tsx src/pages/__tests__/LoginPage.test.tsx` — passed: 4 files, 20 tests; 0 failures, 0 skipped.
- `npm --workspace @qlick/api run typecheck` — passed: 0 TypeScript errors.
- `npm --workspace @qlick/web run typecheck` — passed: 0 TypeScript errors.
- `npm --workspace @qlick/api run build` — passed.
- `NODE_ENV=test node --test apps/api/dist/http/__tests__/rateLimitConfig.test.js apps/api/dist/http/__tests__/distributedRateLimit.test.js apps/api/dist/http/__tests__/proxyTrust.test.js` — passed in approved local-port environment: 7 tests, 0 failed, 0 skipped.
- `npm --workspace @qlick/web run build` — passed: Vite transformed 1,715 modules.
- `npm --workspace @qlick/web run test` — 532/534 passed; 2 failures in unrelated `TaskTimelineView.test.tsx` late-state assertions, plus existing React `act(...)` warnings. Neither the test nor timeline files were changed.
- `git diff --check` — passed with final documentation files.
- `npm run docs:check` — passed: 5/5 helper tests and documentation governance.
- `npm run lint` — passed: 0 errors and 36 pre-existing warnings outside this slice.

## Risks or follow-up

Perform an authenticated browser UAT after deployment at desktop and mobile widths: deliberately exhaust a login quota and a non-login endpoint, then confirm the server-provided countdown clears the disabled state. Resolve the unrelated full-suite TaskTimeline failures before treating the entire repository suite as green.

## Human decision summary

The requested rate-limit feedback and shorter maximum wait are implemented and covered by focused tests. Link-preview’s security policy is unchanged. The only outstanding repository-quality gap is the unrelated full web-suite failure; no user data, authorization, migration, or deployment action remains.

## TODO update

- `RATE-LIMIT-USER-FEEDBACK` → `In progress` pending final docs check and resolution or explicit acceptance of the unrelated full-suite failures.
