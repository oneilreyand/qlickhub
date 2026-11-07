# SUBTASK-SCHEDULE-WITHIN-FEATURE — G5 review, 2026-11-07

## Task

F1 only: [SUBTASK-SCHEDULE-WITHIN-FEATURE](../features/SUBTASK-SCHEDULE-WITHIN-FEATURE/README.md).
Continuation after [Phase 1](SUBTASK_SCHEDULE_WITHIN_FEATURE_P1_2026-11-07.md).

## Outcome

Two independent reviews found and resolved two gaps. Feature Save now submits changed folder
and dates in the existing single update transaction. A range rejection leaves the folder, child
folders, schedule and audit intact. Claim/release/reassign responses now reuse the backend schedule
metadata so replacing a child in React preserves the legacy warning and Feature bounds.

Standards and Spec reviewers both returned **Accepted for the local G5 candidate**, with zero
unresolved actionable findings. Production/UAT, remote CI and G6 remain separate. This report
records local acceptance and PR preparation, not a completed release.

## Work assurance

- **Stage/path:** Full path, stages 4–5 complete; G6 awaiting Owner gate and target verification.
- **Baseline:** a717ba767f1d8df78ca8d221d04fbd90c3d30758, branch
  `codex/f1-subtask-schedule-plan`. GitHub main read-only SHA check matched the baseline.
- **WRA:** Ready **6/16 for local review/remediation**: requirement 0, layers 2, data 0,
  authorization 0, contract 1, consumers 1, validation 2, external 0. Every local AC retains
  its objective evidence path. Target release readiness is not inferred from this local result.
- **Approval:** Owner `ok kerjakan`, 2026-11-07, following the proposed F1 sequence: independent
  G5, same-scope fixes, validation, then PR/release gates. Original local-only approval remains
  historical; this continuation is separately recorded in breakdown.
- **Window:** Same F1 identity/baseline, current runtime/test/doc paths plus assignment response
  metadata and Drawer regression. Review → fix → tests → re-review → docs → commit → non-protected
  branch push → PR + squash auto-merge. Ends at Owner Tier 2 gate or canonical stop condition.
  No direct main push, label manipulation, manual deployment or Production data mutation.
- **Capability:** Node 24.15.0, PostgreSQL 16.10 disposable, Chromium, source/logs/screenshots,
  GitHub read access available. Sandbox-local socket/shared-memory restrictions required the
  normal execution approval mechanism. No secret values were copied. RTK.md remains absent as
  recorded in Phase 1; no instruction contents were inferred.
- **Impact map:** Feature planning Save → existing Task update transaction; assignment Task
  responses → shared metadata → existing UI child replacement; contract-valid tests → review/docs.
  No new endpoint, request contract, schema, migration, index, permission, dependency or AI change.
- **Decision snapshot:** Reuse transactional updateTask (one atomic Save) over separate move/update
  requests (partial success); reuse server metadata over copying stale flags in React. These are
  routine implementation choices within the approved invariant, not new product decisions.
- **Recovery:** Revert bounded F1 code through the normal PR gate or restore the previous Ready
  deployment after recording its ID; no schema undo/backfill needed. Target rollout is pending.

### AC-to-evidence

The complete canonical matrix is [testing.md](../features/SUBTASK-SCHEDULE-WITHIN-FEATURE/testing.md).
All AC-F1.1–AC-F1.12 received local G5 acceptance; this is not a sealed app QA Test Result.

| AC                        | Required / achieved                 | Primary evidence                                                                                                                                      | Local verifier result |
| ------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| F1.1–.5, .7, .9, .10, .12 | E3 (plus E2 where specified) / same | Authenticated HTTP/PostgreSQL assertions, persisted readback, audit/outbox preservation, pair/order, terminal and lock races                          | Accepted              |
| F1.6, .11                 | E3/E2/E4 / same                     | Legacy GET and all three assignment response assertions; UI error/draft regression; browser badge/range after release at three widths and both themes | Accepted              |
| F1.8                      | E3 / E3                             | Transactional Plan conflict plus existing Apply rollback/idempotency suite in full API execution                                                      | Accepted              |

### Independent review

Review skill split Standards and Spec into separate read-only agents. Both inspected tracked and
new files, actual test assertions and primary logs; model summaries alone were not accepted as proof.
The pre-review 50-file manifest matched before fixes; the amended 52-file manifest matched after
fixes (`/private/tmp/qlickhub-f1-g5-review-manifest.json`). Documentation was then updated separately;
no further runtime change followed acceptance.

| Axis      | Initial verdict and finding                                                 | Resolution                                                                                                            | Final verdict                  |
| --------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Standards | Rejected, P1: sequential folder move before schedule Save violates rollback | One existing updateTask transaction; UI one-request/draft checks and persisted rejected/successful folder propagation | Accepted, 0 remaining findings |
| Spec      | Rejected, P2: assignment replaces child without legacy metadata             | Shared backend metadata on release/claim/reassign; persisted response/audit tests and real browser release assertion  | Accepted, 0 remaining findings |

Reviewers inspected execution logs, not newly executed tests of their own. They did not operate
browser UI or inspect screenshots; executor visual inspection is separately attributed below.
Neither review grants Owner Tier 2 approval or Production release acceptance.

### Quality review

- **Reuse/DRY:** Existing updateTask supports folderId and propagates child folders within its
  transaction. Assignment uses the same metadata helper as Task create/update/read; no parallel
  containment calculation or stale React metadata copy.
- **Duplicate/overlap:** No competing schedule rule found; workload advisory and overdue health
  remain distinct. Three assignment callers share one helper; error handling stays F1-specific.
- **Obsolete/unused:** Removed obsolete moveTask import/call from Drawer Save. Helper/schema/hook
  references remain used. Lint/typecheck finds no new unused code or dependency.
- **Boundaries:** Workspace scope and authorization unchanged. Assignment adds a bounded read
  within its existing transaction, without new root lock ordering. Root schedule locking remains
  root-before-child. Failed Save cannot partially move the root/children.
- **Tests:** New regressions first reproduced UI atomicity and missing assignment metadata.
  Assertions were retained; fixes changed implementation, not product expectations.
- **Documentation:** Feature tracker/testing/contracts/window/release/catalog and only the F1 TODO
  updated. SSoT DOMAIN-005 remains canonical. F2–F4 decisions and implementation untouched.

## Source of truth and impact

Sources: Workflow DOMAIN-005, Architecture, UI Atomic Design System §7, Agent Guidelines §2A,
ADR-042 and ADR-028. Policies: `DOMAIN-005`, `AUTH-002`, `CONTRACT-001`, `DATA-001`, `TEST-001`,
`UI-001`, `UI-002`, `DOC-002`, `DOC-003`, `DOC-004`, `SDLC-001`, `SDLC-002`, `AI-003`, `AI-004`, `AI-020`.
Data/request/auth/migration impact: no new persistence, input field, role capability or migration;
existing Task response metadata is consistently present after assignment mutations.

## Changed files

Changes after the initial Phase 1 candidate:

- `apps/web/src/components/ui/organisms/TaskDetailDrawer.tsx` and its regression — atomic Save.
- `apps/api/src/modules/tasks/internal/taskAssignment.ts` — shared metadata on assignment responses.
- `apps/api/src/modules/tasks/__tests__/taskFeatureScheduleApiIntegration.test.ts` — combined
  folder/range rollback and success, all assignment metadata/readback/audit assertions.
- `apps/web/e2e/specs/subtask-feature-schedule.spec.ts` — release through Kelola Subtask retains badge/range.
- Feature documentation, catalog, TODO and this report — G5 evidence and pending release boundary.

The whole F1 patch includes the Phase 1 paths; no unrelated user change was overwritten.

## Validation

Database settings were supplied only through runtime test environment variables. Commands below
omit connection values. Full API used a new disposable database, 80/80 canonical migrations;
browser harness created and dropped its own canonical-migrated disposable database.

| Exact command                                                                                                            | Result                                                                                 | Primary log under /private/tmp/                          |
| ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `npm --prefix apps/api run db:migrate:test`                                                                              | Exit 0, 80 canonical migrations clean-applied                                          | qlickhub-f1-g5-migrations.log                            |
| `NODE_ENV=test node --import tsx --test apps/api/src/modules/tasks/__tests__/taskFeatureScheduleApiIntegration.test.ts`  | Red 15 pass / 1 fail / 0 skip (missing release metadata); green **16/16**, 0 fail/skip | qlickhub-f1-g5-api-red.log; qlickhub-f1-g5-api-green.log |
| `npm --prefix apps/web run test -- src/components/ui/organisms/__tests__/TaskDetailDrawer.test.tsx -t 'F1 saves folder'` | Red 0 pass / 1 fail / 42 excluded by name filter                                       | qlickhub-f1-g5-ui-red.log                                |
| `npm --prefix apps/web run test -- src/components/ui/organisms/__tests__/TaskDetailDrawer.test.tsx`                      | **43/43**, 0 fail/skip, exit 0                                                         | qlickhub-f1-g5-ui-green.log                              |
| `npm --prefix apps/api run test:integration`                                                                             | **671/671**, 132 suites, 0 fail/skip, 129,135 ms, exit 0                               | qlickhub-f1-g5-api-full.log                              |
| `npm --prefix apps/web run test`                                                                                         | **838/838**, 142 files, 0 fail/skip, exit 0                                            | qlickhub-f1-g5-web.log                                   |
| `npm --prefix apps/web run test:e2e -- subtask-feature-schedule.spec.ts --project=desktop-chromium`                      | **6/6**, 0 fail/skip, 44.1 s, exit 0                                                   | qlickhub-f1-g5-e2e-fixed.log                             |
| `npm run validate`                                                                                                       | **88/88**, 0 fail/skip, docs/completeness/theme/lint/typecheck pass, exit 0            | qlickhub-f1-g5-validate-full.log                         |
| `npm run build`                                                                                                          | Contracts/API/web exit 0, Vite 7.94 s                                                  | qlickhub-f1-g5-build.log                                 |
| `git diff --check`                                                                                                       | Exit 0                                                                                 | Observed directly                                        |

The unchanged shared contract suite **109/109** is reused from Phase 1, with matching source hash;
it was not rerun merely to refresh a timestamp. Final documentation checks after the documentation updates: `npm run docs:check`
12/12 pass, 0 fail/skip, exit 0; `npm run docs:completeness` exit 0, 85 baseline gaps,
0 new gaps. Logs: `/private/tmp/qlickhub-f1-g5-docs-final.log` and
`/private/tmp/qlickhub-f1-g5-completeness-final.log`. Lint has 0 errors and 15 pre-existing warnings; Vite retains its >500 kB chunk warning.
Existing pg concurrent-client and NO_COLOR/FORCE_COLOR warnings remain. Intentional PostgreSQL
failure fixtures emit expected rollback error logs, not failed assertions.

Failures and corrections preserved: sandbox PG shared memory and local sockets were denied;
normal approved execution succeeded. Initial PG restart omitted its prior port flags and encountered
the occupied default port; retry explicitly used only the task cluster and port. Initial sandboxed
validate had 25/29 docsys pass and 4 portal-start failures; approved full rerun passed all 29.
First extended E2E had 0/6 because test navigation opened the subtask work page rather than the
management accordion; adding the existing Kelola navigation corrected the test and retained every
release assertion. No application assertion or gate was weakened.

### Cross-layer evidence

Browser routes/surfaces: Plan conflict, Task legacy summary and management release, create-child
stale-parent rejection; 390×844, 768×1024, 1440×900, Light/Dark. Keyboard submit, retained draft,
backend flags, refreshed bounds, horizontal overflow and touch targets are asserted. Executor
visually inspected phone Plan conflict, tablet dark legacy and desktop create conflict. 18 images
retained at `/private/tmp/qlickhub-f1-g5-browser-evidence-20261107`.

Atomic review: existing page composition and shared Alert/Badge/range molecule/hook reused.
No new layout responsibility or styling system added. Relation/FK/ownership/root-lock/index and
EXPLAIN/performance evidence from Phase 1 was inspected and remains applicable; assignment adds one
bounded parent metadata read. The F1 HTTP pagination test again reports constant 23/23 query counts
for 1/5 children. No new production performance claim; AI technology gate N/A.

Read-only target health (`curl --fail --silent --show-error https://qlickhub.vercel.app/v1/health`)
reported connected and 80 applied migrations, latest `20261105000096-add-notification-bug-id.cjs`.
This is not F1 Production evidence, only pre-merge migration audit.

## Risks or follow-up

PR is **Tier 2**: `docs/1_ARCHITECTURE.md`, `docs/2_WORKFLOW_AND_ROLES.md`,
`docs/POLICY_REGISTRY.md`, `docs/adr/README.md`, and
`docs/adr/ADR-042-SUBTASK-SCHEDULE-WITHIN-FEATURE.md` match `quality/tier2-paths.txt`.
Enable squash auto-merge; only Owner may apply `owner-approved`. No migration is needed.
Remote CI/Preview, deployment source/recovery ID and authenticated target smoke remain unverified.
No Production records, credentials, QA sign-off or sealed evidence were fabricated.

## Human decision summary

G5 local candidate Accepted on both review axes. The final diff is prepared for Owner Tier 2
approval through GitHub; live release acceptance follows actual deployment and target verification.

## TODO update

F1 remains **In progress**, PRD/BE/FE Done locally, G5 Accepted; merge/target verification pending.
F2–F4 unchanged.
