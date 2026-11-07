# SUBTASK-SCHEDULE-WITHIN-FEATURE — Phase 1 local candidate, 2026-11-07

## Task

F1 only from [follow-up plan](../plans/QLICKHUB_FOLLOWUP_F1_F4_PLAN.md), under
[Feature G0–G3](../features/SUBTASK-SCHEDULE-WITHIN-FEATURE/README.md).

## Outcome

Local implementation rejects root schedule edits that leave active scheduled children outside
its inclusive range (409 with child names/dates) and invalid child date edits/create/reopen (400
with the allowed range). Terminal children are ignored. Optional paired dates remain supported.
Legacy records are flagged by the backend without a rewrite; non-date edits remain allowed.

The lifecycle and Feature Spec Plan synchronization share the guard and root lock; children are
reloaded after waiting for the root. Failed writes roll back related changes. Read metadata uses
one batch of parents per page. UI shows backend flags/ranges, retains draft input on range errors,
and refreshes stale parent bounds through an authenticated GET without replacing user input.
Dedicated shared error codes distinguish schedule errors from stale Spec versions.

This is a local candidate. No commit, push, PR, merge, deployment or Production mutation occurred.
F2–F4 were not implemented. K2–K7 are unchanged in the parent plan.

## Work assurance

- **Baseline:** `a717ba76` on `codex/f1-subtask-schedule-plan`, originally branched from fetched main.
  Only this Feature's uncommitted work is present; no history rewrite in this phase.
- **Approval:** Owner's `ok`, 2026-11-07, explicitly accepted G0–G3, K1 reject/no auto-shift,
  L1 strict valid date edits with metadata edits allowed, L2 reject out-of-range reopen, and
  ADR/SSoT before build. The later `lanjutkan` resumed remaining checks within this same window.
- **Window:** ADR/SSoT → local code/test → candidate/report. No commit/push/merge/deploy.
- **WRA:** 6/16 Ready for local execution: requirement 0, layers 2, data/migration 0,
  authorization 0, shared contract 1, consumers 1, PostgreSQL/runtime validation 2, external 0.
- **Capability:** source, Node 24.15.0, PostgreSQL 16 disposable, Chromium local and deterministic
  repository checks available. RTK.md was not found in the repository, current workspace or
  common parent/global locations inspected; no contents were inferred. No env values were copied.
- **Change Impact Map:** Feature planning → Task/Feature Spec writes and Task reads → additive
  shared metadata/error constants → date forms/legacy badge → PostgreSQL/UI/E2E evidence.
  Existing RBAC, persisted schema, dependencies, AI provider/model and release policy unchanged.
- **Decision Snapshot:** shared server guard selected over auto-shift/UI-only/status quo.
  It avoids silent child rescheduling and closes caller/race bypasses, at the cost of one batch
  parent read and serialized writes on a Feature. Policy decisions are in ADR-042 and DOMAIN-005.
- **Recovery:** revert only this bounded patch before release; no data or migration recovery needed.
  PostgreSQL/E2E test data is disposable. Production rollout/recovery is a separate future decision.
- **Independent verification:** no independent-human/agent review or remote CI acceptance is
  claimed. Local primary evidence is available for review; G5 acceptance and G6 remain open.

## AC-to-evidence

The complete matrix, UI state evidence and quality review are in
[testing.md](../features/SUBTASK-SCHEDULE-WITHIN-FEATURE/testing.md). Local assertions cover
AC-F1.1–AC-F1.12 at E2/E3 and the affected browser surfaces at E4. They establish local persisted
behavior, not Production/UAT approval or a sealed QA Test Result in the application.

## Source of truth and impact

- ADR-042 Accepted and Workflow DOMAIN-005 were recorded before runtime implementation. Architecture
  links the canonical Workflow rule; Policy Registry indexes it rather than copying policy prose.
- Policies: `DOMAIN-002`, `DOMAIN-005`, `AUTH-002`, `CONTRACT-001`, `DATA-001`, `FLOW-007`,
  `TEST-001`, `DOC-002`, `DOC-003`, `DOC-004`, `DOC-005`, `DOC-006`, `SDLC-001`, `SDLC-002`, `AI-020`.
- No new endpoint/model, migration/index/backfill, role capability, scheduler, credential or dependency.
- Task response metadata and two known error codes are additive; mutation rejection is the
  intentional behavior change. Schema source is packages/contracts/src/task.ts, not copied here.
- Parent/child FK ownership and soft-delete behavior remain Workspace scoped.

## Changed files

Backend: new tasks/internal/taskFeatureSchedule.ts, lifecycle/query integration, Task controller
error mapping, Feature Spec Plan sync/controller. Contracts: Task range schema and error constants.
Frontend: range/flag molecule, context-refresh hook, date forms/summary and Plan conflict handling.
Tests: HTTP/PostgreSQL F1, hook/presenter/form/error unit coverage, F1 browser spec.
Docs: Feature folder, ADR-042/index, Architecture/Workflow/registry, F1 decision/status/navigation,
preparation continuation and this report. The final worktree manifest and Tier evaluation are in
`/private/tmp/qlickhub-f1-final-worktree-review.json`; it includes untracked files.

## Validation

Environment: Node **24.15.0**, PostgreSQL **16**, a newly initialized disposable local cluster;
`npm --prefix apps/api run db:migrate:test` applied **80/80 canonical migrations**, exit 0.
Test database selected only through runtime test environment variables; no connection value is
included here. Browser harness created and removed its own canonical-migrated database.

| Command / observation                                                                                                 | Scope                                              | Outcome                                                                         |
| --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------- |
| `node --import tsx --test apps/api/src/modules/tasks/__tests__/taskFeatureScheduleApiIntegration.test.ts` before code | Red regression                                     | 1 pass / 5 fail / 0 skip; containment not implemented                           |
| Same command on latest candidate                                                                                      | F1 real HTTP/PostgreSQL                            | 14 pass / 0 fail / 0 skip, exit 0, 2,645 ms                                     |
| `npm --prefix apps/web run test`                                                                                      | Full frontend, latest run                          | 837 pass / 0 fail / 0 skip, 142 files, exit 0, 27.13 s                          |
| `npm --prefix packages/contracts run test`                                                                            | Shared contracts                                   | 109 pass / 0 fail / 0 skip, 27 suites, exit 0                                   |
| `npm --prefix apps/web run test:e2e -- subtask-feature-schedule.spec.ts --project=desktop-chromium`                   | Six viewport/theme cases, real API/Vite/PostgreSQL | 6 pass / 0 fail / 0 skip, exit 0, 25.1 s                                        |
| `npm run build`                                                                                                       | Contracts/API/web after final UI code              | Exit 0, Vite 8.50 s; existing >500 kB chunk warning                             |
| `npm --prefix apps/api run test:integration`                                                                          | Full API, initial green version                    | 667 pass / 0 fail / 0 skip, exit 0; later test strengthening/race case followed |
| Same full command on resumed candidate                                                                                | Full API runner                                    | 661 pass / 1 suite-process fail / 0 skip; serialization error, details below    |
| `node --test apps/api/dist/modules/tasks/__tests__/e2eDemonstration.test.js`                                          | Affected suite unchanged                           | 7 pass / 0 fail / 0 skip, exit 0                                                |

Final same-command full API rerun: **668 pass / 0 fail / 0 skip**, 132 suites, exit 0,
118,701 ms. Repository-gate final result is appended below. No pending check is counted as passing. Full validate includes docs, docsys, completeness, env examples,
SDLC/migration/agent/tier test suites, theme, lint and typechecks; it is not a substitute for API
and browser execution. There is no new migration; migration tests in validate do not mutate Production.

### Concurrency, relation and performance evidence

F1 tests observe the blocked writer through pg_stat_activity on the target root, then commit the
barrier transaction. Three interleavings cover child create first, root shrink first, and existing
child update waiting behind shrink. Failed child/root mutations are read back and audit counts checked.

Parent metadata query count is constant at **23/23** internal queries for HTTP pages of 1 and 5
children in this harness (including existing authentication/read work); no parent query per child.
Canonical migration 25 provides composite FK and index `idx_tasks_workspace_parent_created`.

On 50 root / 5,000 child persisted performance factories, page size 50 and 20 samples:
baseline read median **0.70 ms**, p95 **1.18 ms**; read plus metadata median **1.26 ms**, p95
**3.70 ms**. EXPLAIN shows existing bitmap index scan, 100 candidates/50 conflicts, query execution
**0.049 ms**, planning **0.452 ms**. No new index/migration justified. Evidence:
`/private/tmp/qlickhub-f1-query-evidence.json`. This is local measurement, not cloud latency;
same-Feature write contention under production load remains unmeasured.

### Browser and visual evidence

`/work/features/:featureId` Plan/Task surfaces and CreateSubtaskModal checked at 390×844,
768×1024 and 1440×900, each Light/Dark. Assertions include keyboard Plan submit, retained draft
on 409, legacy text+icon, no horizontal overflow, child 400 after parent changes, new bounds
loaded through GET, and date touch-target height >=44px. 18 screenshots preserved privately at
`/private/tmp/qlickhub-f1-browser-evidence-20261107`.

Executor visually inspected phone Plan conflict, tablet dark legacy and phone dark child-error
screenshots. New controls reuse existing atoms, wrap text, and remain legible without new styling
systems. Other loading/empty/read-only/error states are covered by component regression and existing
surfaces; not every per-role journey has been manually replayed. No Production screenshots or
actual user data are used as factories.

### Failed checks and remediation

- First draft HTTP test used the wrong response envelope; corrected to contract-parsed `data`
  before recording the meaningful red run. No application assertion was weakened.
- Initial browser run: **0 pass / 6 fail**. Existing Plan caller reloaded on all 409s and generic
  apiClient mapping erased schedule detail. Dedicated known error codes and caller handling fixed
  the implementation; the same assertions then passed. Context refresh was added for concurrent
  parent changes without resetting user input.
- First sandboxed contracts test failed on tsx IPC socket permissions (EPERM). Same command rerun
  with local execution permissions passed 109/109. No test source changed for that issue.
- One resumed validate attempt stopped at docs governance: raw ADR identifier in the Feature
  overview was parsed as an unknown Policy ID. The overview now points to the solution document
  for the decision; canonical policy ID is DOMAIN-005. No checker was changed or weakened.
- A resumed full API run failed one suite process with `Unable to deserialize cloned data due
to invalid or unsupported version` in the Node runner. All 7 tests in that unchanged suite
  passed standalone. Full same-command rerun is recorded below; the failure is not hidden.
- Before continuation, automatic approval review could not complete one local test call because
  of an account usage limit. That call did not execute. After the user's `lanjutkan`, the local
  test approval succeeded; no bypass or replacement of the approval mechanism was used.
- Existing pg concurrent-client deprecation warnings and browser NO_COLOR/FORCE_COLOR warnings
  remain. Integration fixtures can intentionally log errors to prove rollback; those logs are
  not counted as failed assertions. No secret values are reproduced in repository evidence.

## Quality review

- **Reuse / DRY:** existing pair/order checks, Workspace/task policies, audit and UI atoms reused;
  one containment helper serves Task/Plan, one read batch serves responses, no parallel browser
  business rule. One small hook separates asynchronous context refresh from form presentation.
- **Duplicates / overlap:** caller/import search confirms overdue scheduleHealth and advisory
  workload remain distinct. Known schedule codes alone retain server detail; generic errors keep
  their prior behavior. Task controller special mapping is limited to schedule mutation paths.
- **Unused / obsolete:** helper/schema/hook/presenter references inspected; typecheck/lint and
  tests cover use. No obsolete export/dependency/framework identified in the changed scope.
- **Boundary:** role check precedes conflict details, Workspace filters and root-first lock protect
  updates, rejected transactions preserve relevant data/history/audit/outbox. No data backfill,
  auth policy change, Production access or F2–F4 implementation.
- **Regression:** full/targeted PostgreSQL, contracts, web, browser and structural gate outputs
  are primary evidence. Independent review/CI and Production remain explicit limitations.

## Risks or follow-up

Local implementation is ready for an independent diff/evidence review once final checks pass.
G5 independent acceptance and G6 release are not complete. The TODO stays In progress.
No claim of remote CI, live Gemini, Production rollout, or sealed app Test Result is made.
Root locks serialize related Task writes and add local overhead; production throughput is unmeasured.
An authorized future PR is Tier 2 due to canonical policy/ADR paths and requires the Owner label;
agent does not add/remove it. No instruction to create that PR is inferred here.

## Human decision summary

K1/L1/L2 and local build are approved and implemented. The reviewed invariant is a rejection,
not an automatic schedule rewrite. Remaining authority is independent acceptance and a future
commit/release path. Current window ends with verified local candidate/report.

## TODO update

SUBTASK-SCHEDULE-WITHIN-FEATURE remains In progress: PRD approved; BE/FE local candidate verified;
independent G5 and release pending. F2–F4 remain untouched and blocked on their relevant decisions.

## Final candidate verification

- Full API rerun log: `/private/tmp/qlickhub-f1-api-continued-rerun.log`, exit 0, 668/668.
- Stronger F1 audit assertions and third concurrency interleaving: 13/13, exit 0,
  `/private/tmp/qlickhub-f1-focused-accepted-candidate.log`.
- Full frontend after added hook/layout tests: 837/837 across 142 files, exit 0,
  `/private/tmp/qlickhub-f1-web-continued.log`. A later lint cleanup captured the generation value
  in the hook effect; targeted hook suite rerun passed 3/3 and targeted ESLint returned 0 warnings.
- One complete validate passed with 16 warnings (15 existing plus one new hook cleanup warning).
  The new warning was fixed in code, without disabling ESLint; final validation is recorded below.
- Postman CLI `postman status` returned `unknown command 'status'` (exit 1). No Postman workspace
  was initialized or published; the verification relied on the repository's typed contracts,
  real HTTP/PostgreSQL test suites, and browser harness, not on Postman results.
- Final diff is Tier 2 because these five paths match quality/tier2-paths.txt:
  `docs/1_ARCHITECTURE.md`, `docs/2_WORKFLOW_AND_ROLES.md`, `docs/POLICY_REGISTRY.md`,
  `docs/adr/README.md`, `docs/adr/ADR-042-SUBTASK-SCHEDULE-WITHIN-FEATURE.md`.
  No Owner label, remote branch or PR was changed.

### Embedded child response review

Review akhir pada read path `includeSubtasks` menemukan metadata belum ditempel ke child di dalam
respons parent. Regression HTTP memperlihatkan bug serializer existing: hasil Sequelize toJSON
child sudah plain record tetapi dipanggil toJSON lagi, sehingga 500. Perbaikan formatTaskJson
memproses model root dan JSON child dengan tipe yang jelas; metadata pada semua child embedded
menggunakan batch parent yang sama, tanpa per-child query.

Suite F1 khusus setelah fix: **14 pass / 0 fail / 0 skip**, exit 0, 2,645 ms,
`/private/tmp/qlickhub-f1-embedded-green.log`. Red memperlihatkan 13 pass/1 fail sebelum fix;
tes dan assertion tidak dilemahkan. Ini bagian read/query scope F1 yang sudah disetujui,
bukan implementasi F2–F4 atau endpoint baru. Final full API/typecheck/gate diulang sesudahnya.

### Repository gate after final serializer change

`npm run validate`: exit 0; **88 pass / 0 fail / 0 skip** across docs (12), docsys (29),
env-example tests (5), SDLC (10), migration policy (5), agent policy (22), tier (5).
Documentation governance, completeness (85 baseline / 0 new gaps), env-example shape, theme,
full lint and all three package typechecks passed. Lint: **0 errors / 15 existing warnings**;
no new F1 warning. Log: `/private/tmp/qlickhub-f1-validate-candidate.log`.

### Final close of the local execution window

- `npm --prefix apps/api run test:integration` on the final serializer candidate: exit 0,
  **669 pass / 0 fail / 0 skip**, 132 suites, **123,510 ms**.
  Log: `/private/tmp/qlickhub-f1-api-final-candidate.log`.
- `npm run build` after the API suite completed: exit 0, contracts/API/web. Existing Vite chunk
  size warning remains; no dependency/build configuration changed.
  Log: `/private/tmp/qlickhub-f1-build-final-candidate.log`.
- Final documentation gate after recording these outcomes: docs:check 12/12 and completeness
  checked again; detailed command output remains in private temporary logs.
- Worktree SDLC evaluation includes tracked and untracked files, passes with the approved F1
  Feature record; 50 changed paths (25 under runtime/test prefixes), no new commit.
  High-signal secret-pattern scan found 0 matches. It is a bounded check, not a full security audit.
- K2–K7 and every TODO entry other than F1 are byte-for-byte unchanged from origin/main.
  K1, L1/L2 and policy docs are the approved F1 changes. No F2–F4 code/docs implementation added.
- Disposable PostgreSQL server shut down with `pg_ctl ... stop -m fast`, exit 0; only the verified
  task-specific cluster was stopped. Cluster files and logs/evidence retained in private temporary
  storage; nothing was deleted from Production or a shared development database.
- Local window ends here. Independent G5 acceptance and G6 remain pending; no commit/push/PR/
  merge/deployment is performed or inferred from local green results.
