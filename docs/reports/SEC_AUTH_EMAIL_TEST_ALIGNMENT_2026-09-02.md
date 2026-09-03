## Task

SEC-AUTH-EMAIL-TEST-ALIGNMENT: align the stale Workspace invitation email test with the approved one-time set-password token behavior.

## Outcome

The invitation-email unit test now exercises the current security contract: it supplies a fixture token, verifies the one-time set-password URL and CTA, and asserts that the retired shared password `Password123!` is absent. Production implementation and behavior were not changed.

## Source of truth and impact

- **Applicable SSoT:** `docs/1_ARCHITECTURE.md`, `docs/4_AGENT_DEV_GUIDELINES.md`, and the existing security evidence in `docs/reports/LOCAL_PERFORMANCE_AND_SECURITY_HARDENING_2026-09-01.md`.
- **Policy IDs:** `AUTH-002`, `DATA-001`, `TEST-001`.
- **Data/interface impact:** None; this is a test/evidence correction only.
- **Authorization impact:** None; backend authorization remains unchanged.
- **Migration risk:** None; no model, schema, data, or migration change.

## Changed files

- `apps/api/src/services/__tests__/emailService.test.ts` — replaces the obsolete boolean/new-user fixture and shared-password assertion with the one-time token contract.
- `docs/reports/SEC_01_SSRF_PREVENTION_2026-09-01.md` — records that the previously blocked API typecheck/build now pass.
- `TODO.md` — records the corrective task and removes the resolved SEC-01 build caveat.
- `docs/reports/SEC_AUTH_EMAIL_TEST_ALIGNMENT_2026-09-02.md` — records observed evidence.

## Validation

- Before fix: `npm --prefix apps/api run typecheck` — failed at `apps/api/src/services/__tests__/emailService.test.ts:21`, boolean was not assignable to string.
- Before fix: `NODE_ENV=test npx tsx --test apps/api/src/services/__tests__/emailService.test.ts` — 1 passed, 1 failed, 0 skipped; the obsolete `Password123!` assertion failed.
- After fix: `NODE_ENV=test npx tsx --test apps/api/src/services/__tests__/emailService.test.ts` — 2 passed, 0 failed, 0 skipped, 1 suite.
- `npm --prefix apps/api run typecheck` — passed, exit code 0.
- `npm --prefix apps/api run build` — passed, exit code 0.
- `npm run docs:check` — 5 passed, 0 failed, 0 skipped; documentation governance passed.
- `npx eslint apps/api/src/services/__tests__/emailService.test.ts` — passed, 0 error/warning.
- Targeted Prettier and `git diff --check` — passed.
- First complete API regression after this focused fix — build passed; **333 passed, 7 failed, 0 skipped** across 87 suites. The seven unrelated failures were subsequently resolved under the separately scoped QA lifecycle and Requirement bulk-correction tasks below.
- Isolated Test Management suite — 2 passed, 5 failed, 0 skipped. Test Cases created as drafts are still used by legacy tests as though active, conflicting with the current `QA-001` publication boundary.
- Isolated Release Lifecycle suite — 0 passed, 1 failed, 0 skipped for the same draft-versus-active Test Case setup.
- Isolated Requirement suite — 8 passed, 1 failed, 0 skipped; bulk deprecation returns 500 instead of 200 and requires a separate diagnosis.
- Final `npm --prefix apps/api run test` after the separately scoped corrections — build passed; **342 passed, 0 failed, 0 skipped** across 87 suites, PostgreSQL test environment. A non-fatal asynchronous notification foreign-key warning occurred during concurrent fixture cleanup and is recorded as follow-up rather than hidden.

## Risks or follow-up

- The seven unrelated integration failures discovered by the first complete regression were resolved and verified in separately scoped work.
- The asynchronous assignment-notification cleanup warning observed in this run was resolved and verified under `TASK-ASSIGNMENT-NOTIFICATION-AWAIT` on 2026-09-03.
- No debug instrumentation or throwaway files were added.

## TODO update

- `SEC-AUTH-EMAIL-TEST-ALIGNMENT` → `Done` after the complete API regression passed 342/342.
