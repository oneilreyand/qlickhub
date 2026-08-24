## Task

AGY-5.2: Implement readiness gates.

## Outcome

The backend now evaluates release readiness from persisted Requirement coverage, the latest Test Run result for every active mapped Test Case, unverified Critical/High Bugs, frontend/backend/mobile/fullstack subtask completion, and the latest QA Sign-off. The evaluator always returns the same five gates in the same order with deterministic reasons.

New assurance records use readiness snapshot schema version 2 and preserve every gate fact, result, reason, and failed-gate code. Existing schema version 1 records remain contract-valid. The release-records read interface also returns a freshly backend-derived readiness snapshot so the Product Owner UI does not calculate readiness in the browser.

A Product Owner approval with any failed gate is now an explicit override: a non-empty reason is required, the immutable Release Decision retains the failed-gate snapshot, and Activity metadata records the override and failed gate codes. Rejected decisions and release-ready approvals cannot carry an override reason. Authorization and independent QA/PO approval rules are unchanged.

The shared Release Assurance panel presents text/icon gate results, explains failed reasons, and requires the override reason before submitting an approval. It continues to support loading, empty, error, permission, immutable-history, and independent-approval states.

## Changed files

- `packages/contracts/src/releaseDecision.ts` — adds readiness gate contracts, snapshot schema v2, v1 compatibility, and the backend-derived current snapshot response.
- `packages/contracts/src/contracts.test.ts` — covers v2 gate records and legacy v1 snapshot compatibility.
- `apps/api/src/modules/releaseDecisions/readinessGateEvaluator.ts` — evaluates the five gates in a stable order with deterministic reasons.
- `apps/api/src/modules/releaseDecisions/__tests__/readinessGateEvaluator.test.ts` — covers ready, failed, and missing-evidence gate facts.
- `apps/api/src/modules/releaseDecisions/releaseDecisionService.ts` — derives current and immutable snapshots from persisted records, filters archived Test Cases, uses latest Test Runs, and enforces reasoned overrides.
- `apps/api/src/modules/releaseDecisions/__tests__/releaseDecisionApiIntegration.test.ts` — proves PostgreSQL-backed gate evaluation, latest-run selection, archived coverage exclusion, override enforcement, snapshot persistence, and Activity metadata.
- `apps/web/src/components/ui/organisms/ReleaseAssurancePanel.tsx` — presents backend-derived gate status/reasons and the general failed-gate override flow.
- `apps/web/src/components/ui/organisms/__tests__/ReleaseAssurancePanel.test.tsx` — covers current readiness rendering and override validation for non-QA gate failures.
- `TODO.md` — records AGY-5.2 completion and verification evidence.

## Validation

- `npm --workspace packages/contracts test` — passed 47/47 tests in 15 suites; 0 failed, 0 skipped.
- `npm --workspace packages/contracts run build` — passed.
- `NODE_ENV=test node --test apps/api/dist/modules/releaseDecisions/__tests__/readinessGateEvaluator.test.js apps/api/dist/modules/releaseDecisions/__tests__/releaseDecisionApiIntegration.test.js` — passed 10/10 tests in 2 suites against the disposable PostgreSQL test database; 0 failed, 0 skipped.
- `npm --workspace apps/api test` — passed 201/201 tests in 58 suites against the PostgreSQL test database; 0 failed, 0 skipped. The command includes the API production build.
- `npm --workspace apps/api run typecheck` — passed.
- `npm --workspace apps/web test -- --run src/components/ui/organisms/__tests__/ReleaseAssurancePanel.test.tsx` — passed 7/7 focused tests.
- `npm --workspace apps/web test` — passed 230/230 tests across 51 files; 0 failed.
- `npm --workspace apps/web run typecheck` — passed.
- `npm --workspace apps/web run build` — passed; retained the existing warning for a JavaScript chunk larger than 500 kB.
- Browser QA at 1280×720 and 390×844 — passed: five labelled/icon gates rendered from the API fixture, failed reasons remained legible, the general override field and validation appeared, modal content fit or scrolled within the viewport, there was no horizontal overflow, Escape closed the modal, and focus returned to `Record Release Decision`. The temporary visual route, fixture server, and Vite proxy were removed after validation.

## Risks or follow-up

- No database migration was required because readiness snapshots are stored in the existing JSONB columns. Snapshot schema version 1 remains readable; all newly captured snapshots use version 2.
- AGY-5.3 still needs to surface this same backend-derived current readiness read model consistently in Task Hub, My Tasks, and Report.
- The existing web bundle-size warning remains unchanged.

## TODO update

- AGY-5.2: Implement readiness gates → Done
