# Release Readiness Actionability — 2026-08-31

## Task

RELEASE-READINESS-ACTIONABILITY

## Confirmed facts

- The authenticated backend already returns the five deterministic readiness gates, each with a persisted label, status, and reason.
- Task Hub previously displayed the count as `Not release ready · N failed`, which could be read as failed test cases, and detailed surfaces only showed the first failed gate.
- A test execution state with no result is not a failed test and remains a neutral progress state.

## Implemented plan

1. Replace the ambiguous release summary with action-oriented wording.
2. Show every failed backend gate and its reason wherever detailed readiness is requested.
3. Clarify compact trace labels without changing backend-derived facts.
4. Protect the behaviour with component and responsive Task Hub regression tests.

## Outcome

- The Task Hub now shows `Release blocked · N gates need action`, rather than treating the gate count as failed tests.
- Feature, My Tasks, and Report detailed readiness summaries show every failed gate and its backend-provided reason.
- `Structure N/M` is now `Trace N/M reqs`; `Tests not run` is now the neutral `No test results yet`.
- Accessibility labels identify the exact number of blocked release gates and the expandable reason list is announced as `Release gates needing action`.

## Files changed

- `apps/web/src/components/ui/molecules/ReleaseReadinessSignal.tsx` — renders action-oriented release status and every failed gate reason.
- `apps/web/src/components/ui/molecules/DeliveryTraceSignal.tsx` — clarifies structural and unexecuted-test labels.
- `apps/web/src/components/ui/organisms/TaskDeliveryTracePanel.tsx` — keeps detailed unexecuted test status aligned with the shared signal.
- `apps/web/src/components/ui/molecules/__tests__/ReleaseReadinessSignal.test.tsx` — verifies multiple gate reasons.
- `apps/web/src/components/ui/molecules/__tests__/DeliveryTraceSignal.test.tsx` — verifies that unexecuted tests are not reported as failed.
- `apps/web/src/components/ui/organisms/__tests__/TaskCollection.test.tsx` — verifies desktop and mobile Task Hub wording.

## Data, interface, authorization, and migration impact

- Data/API contract: none. Existing authenticated `ReadinessSnapshotV2` data is presented unchanged.
- Authorization: none. UI visibility continues to rely on the backend-authenticated snapshot.
- Migration risk: none.
- Explicitly out of scope: configurable gates and `Not applicable`/waiver records. Those change release policy, authorization, audit requirements, and persisted schema, so they require a separate owner-approved decision.

## Validation

- `npm --prefix apps/web test -- src/components/ui/molecules/__tests__/ReleaseReadinessSignal.test.tsx src/components/ui/molecules/__tests__/DeliveryTraceSignal.test.tsx src/components/ui/organisms/__tests__/TaskDeliveryTracePanel.test.tsx src/components/ui/organisms/__tests__/TaskDetailDrawer.test.tsx src/components/ui/organisms/__tests__/TaskCollection.test.tsx` — passed, 38/38 tests across 5 files.
- `npm --prefix apps/web run typecheck` — passed.
- `npm --prefix apps/web run build` — passed; existing Vite large-chunk advisory remains.
- `git diff --check` — passed.

## Risks or follow-up

No data, migration, or authorization risk. A future waiver/configurable-gate feature needs a separate product policy and audit design.
