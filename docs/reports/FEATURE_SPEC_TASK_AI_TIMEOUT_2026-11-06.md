# Feature Spec Task AI Timeout — 2026-11-06

## Task

`FEATURE-SPEC-TASK-AI-TIMEOUT`: give Task draft generation a 90-second Gemini request budget
while retaining the 30-second default for other Feature Spec AI operations.

## Outcome

The local candidate passes a server-selected `timeoutMs: 90_000` only from `generateTasks`.
The adapter uses the override or its existing 30,000 ms default. The option is internal and is
not taken from HTTP request bodies or sent to Gemini. Provider/model, prompt, structured-output
schema, response/error contract, version/replace guards, authorization, and Apply are unchanged.

The initial local implementation window performed no commit, push, PR, merge, or deployment.
The user subsequently authorized Production release; the release record below supersedes the
earlier local-only scope for this bounded release. No secret change or Production draft mutation
is part of either window.

## Work assurance

- **Stage/path:** Quick (`SDLC-001`, `SDLC-002`), approved through
  [Quick Card](../plans/quick/FEATURE-SPEC-TASK-AI-TIMEOUT.md); local Build/Test candidate.
- **Baseline:** `eba09a5099480844935ca74ab3e6bf7d00964c96`, existing branch
  `chore/post-p5-tidy`. The earlier reset report and its TODO entry were preserved.
- **WRA:** **4/16 — Ready** for the approved local scope: internal consumers 1, persisted/runtime
  validation 2, mockable external dependency 1; requirement/layers/data/authorization/public
  contract dimensions 0. No schema/migration or role decision is involved.
- **Approval:** user `ok naikkan`, 2026-11-06, following the concrete task-specific 90-second plan.
  Bounded window covers the listed adapter/service/tests/Quick Card/report/TODO, disposable
  PostgreSQL, local external-seam verification, and fixes within these acceptance criteria.
  It ends with the verified local candidate and this response. Release actions are excluded.
- **Capabilities:** source/SSoT, Node 24.15.0, TypeScript, local PostgreSQL 16, authenticated
  read-only Vercel request logs, and Postman CLI 1.76.0 were available. No live Gemini key or
  Production draft mutation was used. Context7 was unavailable; official platform documentation
  was used as fallback. No agent-to-agent delegation was used or required at WRA 4.

### AC-to-evidence matrix

| AC                                                           | Required / achieved | Primary evidence                                                                                                                                | Status                                                          |
| ------------------------------------------------------------ | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Task output after the old 30-second cutoff is accepted       | E2 / E2             | Adapter regression reproduces failure before patch; succeeds at simulated 31 seconds after patch; direct local HTTP verification recorded below | Local candidate verified; real provider latency remains unknown |
| Task remains bounded at 90 seconds with no retry             | E2 / E2             | At 89,999 virtual milliseconds request is pending; at 90,000 it returns the existing unavailable error, provider called once                    | Accepted for adapter behavior                                   |
| Default operations retain the 30-second deadline             | E2 / E2             | Default accepts 25-second fixture, rejects at 30 seconds; only generateTasks supplies an override                                               | Accepted                                                        |
| AI failure preserves persisted draft/history/audit           | E3 / E3             | Disposable PostgreSQL tests assert unchanged version, tasks JSON, version count, activity count, and zero applied subtasks                      | Accepted                                                        |
| Existing API authorization/validation/replace behavior holds | E3 / E3             | Focused Plan/PRD/Task integration suites on 80 clean-applied canonical migrations                                                               | Accepted                                                        |
| Repository checks and quality review pass                    | E2 / E2             | Typecheck/build/targeted lint, docs, completeness, worktree SDLC evaluator and diff review                                                      | Results below                                                   |

**Change Impact Map:** Module change on Feature Spec service → Gemini adapter → external HTTP.
No browser, API input/output, persistence design, migration, authorization, AI model/config,
dependency, or deployment change. PostgreSQL tests protect the existing persistence boundary.

**Decision Snapshot:** a task-specific longer deadline fixes the proven early cancellation
without altering generated content. The downside is a longer bounded wait during provider
failure. Changing every operation broadens behavior; changing model/thinking requires quality
evaluation; asynchronous jobs introduce architecture and data scope. Those alternatives were
not selected. Revert only these scoped source edits to restore the former behavior.

**Separate verification / handoff:** no external verifier or Production acceptance is claimed.
The existing API suites use persisted factories and an external AI fake; the new adapter suite
exercises the actual adapter with a virtual external provider and clock. A real native-HTTP
comparison uses only a local provider fixture. These evidence levels are not interchangeable.
The approved candidate remains pending release and real-provider verification.

## Source of truth and impact

- [Architecture](../1_ARCHITECTURE.md) §6 AI governance;
  [Workflow](../2_WORKFLOW_AND_ROLES.md);
  [Agent Guidelines](../4_AGENT_DEV_GUIDELINES.md) §2A/§2B;
  [SIMPLE-UI-DELIVERY-FLOW](../features/SIMPLE-UI-DELIVERY-FLOW/README.md) P5d.
- Policies: `AI-001`, `AI-002`, `AI-003`, `AI-005`, `AI-006`, `AI-008`, `AI-009`, `AI-010`,
  `AI-013`, `AUTH-001`, `AUTH-002`, `CONTRACT-001`, `DATA-001`, `TEST-001`,
  `DOC-003`, `DOC-004`, `SDLC-001`, `SDLC-002`.
- Data/interface and authorization impact: none; only an internal optional timeout budget.
- Migration risk: none; canonical migrations were run only on a fresh disposable test cluster.

## Changed files

- `apps/api/src/modules/featureSpecs/featureSpecAiClient.ts` — internal optional request timeout;
  default stays 30 seconds.
- `apps/api/src/modules/featureSpecs/featureSpecAiService.ts` — Task generation selects 90 seconds.
- `apps/api/src/modules/featureSpecs/__tests__/featureSpecAiClient.test.ts` — contract-valid external
  fixtures and deterministic deadline/error regressions; no database/provider credentials.
- `apps/api/src/modules/featureSpecs/__tests__/featureSpecTasksAiApiIntegration.test.ts` — verifies
  the budget reaches the adapter port and strengthens persisted failure invariants.
- Quick Card, this report, and one related `TODO.md` entry — authority, evidence, remaining release.

## Validation

### Primary diagnosis

The user's failing response detail is thrown only when adapter fetch rejects before an HTTP
response. Read-only Production logs showed three Task-generation 502 responses, with Plan and
PRD generation succeeding. Vercel request `69bpc-1793979472592-6dfbbdb93387` at
**2026-11-06 22:37:52 WIB** showed **30.06 s execution**, **30.2 s total response**, and a
**5-minute function maximum**, with Gemini 2.5 Flash as the external call. The adapter hard-coded
30 seconds. No Production POST was replayed. Why upstream was slow remains unverified.

### Executed checks

- `npm run sdlc:new -- quick FEATURE-SPEC-TASK-AI-TIMEOUT`: exit 0; generated record then filled
  from the Owner-approved plan. No unrelated skill-setup or workspace scaffolding was added.
- `NODE_ENV=test node --import tsx --test apps/api/src/modules/featureSpecs/__tests__/featureSpecAiClient.test.ts`
  with a fixture-only key: **red 3 pass / 2 fail**, then **green 5 pass / 0 fail / 0 skip**.
  The pre-patch 31-second response failed with the same unavailable detail; the pending-until-90
  assertion also detected the old cutoff. Failures were fixed in production code, not skipped.
- Fresh isolated PostgreSQL 16 cluster on local port 55440, database `postgres`, with
  `TEST_DATABASE_URL` injected only into test processes; canonical
  `sequelize-cli db:migrate --env test`: **80/80 migrations applied**, exit 0.
- `NODE_ENV=test node --import tsx --test --test-concurrency=1` with the four files under
  `apps/api/src/modules/featureSpecs/__tests__/`: `featureSpecAiClient.test.ts`,
  `featureSpecAiApiIntegration.test.ts`, `featureSpecPrdAiApiIntegration.test.ts`,
  `featureSpecTasksAiApiIntegration.test.ts`: **49 pass / 0 fail / 0 skip**, 4 suites, exit 0,
  duration 36,891 ms. Database behavior, authorization, audit, and draft persistence are real;
  only the unavailable external AI seam is faked. Firebase ADC initialization was logged by the
  existing test setup; no device/provider delivery is claimed.
- `npm --prefix apps/api run typecheck`: exit 0.
- `npm --prefix apps/api run build`: exit 0.
- Targeted `node_modules/.bin/eslint` for the four touched TypeScript files: exit 0.
- `node_modules/.bin/prettier --write` for the same four files: exit 0; no unrelated file formatted.
- `npm run docs:check`: **12 pass / 0 fail / 0 skip**, documentation governance passed.
- `npm run docs:completeness`: exit 0; **85 existing baseline gaps**, **0 new gaps**.
- `npm run sdlc:check`: exited 0 but **skipped** because no base commit was supplied; not claimed
  as change authorization. Separately executed exported `evaluateChanges` over actual modified
  and untracked worktree paths: **0 errors**, 4 runtime files authorized by this approved Quick Card.
- `git diff --check`: passed.

### External HTTP fixture

Local Postman artifacts and fixture-only verification are retained under
`/private/tmp/qlickhub-ai-timeout-20261106-dcxSyS` outside Git. No cloud workspace, published
mock, dependency installation in the repository, or real-provider request was performed.
The fixture envelope follows the client's Generate Content response contract; its 3 generated
subtasks are validated by `AiFeatureSpecTasksOutputSchema`.

Observed tooling limitations were not treated as passes: `postman status` is unrecognized;
mock generation wrote local files then stalled on a keychain error; proxy doctor skipped its
Node probes. The initial configured latency was ignored and returned immediately. An explicit
31-second handler delay then exposed a separate **30-second Postman proxy timeout**, returning
504 for the longer-budget request. That establishes a simulation-proxy limitation, not an
application regression or live Gemini outage. The final comparison targets the generated mock
server directly and remaps only the external URL in the private harness; production code is not
rewired. Native Node fetch, serialization, body parsing, and real AbortSignal deadlines remain in use.

Final native-HTTP comparison, `node --import tsx check-http-deadline.mjs` with fixture-only
environment injected: **default rejected at 30,008 ms** with the original unavailable error;
**Task accepted at 31,040 ms**, 3 contract-valid subtasks; exit 0. No real Gemini or Production
request was made. The 90-second upper boundary is covered by deterministic virtual-clock tests,
not a 90-second live-provider run.

Temporary Postman simulation and PostgreSQL services were stopped after verification; their
private evidence files were retained. Proxy CA trust was scoped to diagnostic child processes,
not installed globally. No diagnostic helper was added to production paths.

## Quality review

| Dimension                        | Finding / evidence                                                                                                                                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Reuse / DRY                      | Existing adapter, service port, validation and save path reused. One optional internal budget avoids a duplicate Gemini client or forked generation workflow.                                    |
| Duplicate / overlapping behavior | One Task-only override; default stays in the same adapter. No second endpoint, fallback, retry, or browser-side deadline logic added.                                                            |
| Obsolete / unused code           | Both the new option and Task override are used and covered. No dependency, obsolete export, debug log, unused helper, or framework introduced in runtime code.                                   |
| Boundaries / best practice       | No new HTTP input; server selects the budget. External seam only is mocked; Sequelize, membership, audit and versioning use disposable PostgreSQL. No secrets or Production mutations used.      |
| Regression coverage              | Red/green covers old cutoff and new bounded behavior; existing persisted suites retain guards and strengthened failure assertions. Real Gemini and Production release are explicitly unverified. |

Responsive/Atomic UI and AI model-selection gates are N/A: no UI, prompt, provider, model,
thinking strategy, or schema changed. Query/relation/performance implementation is unchanged;
the observable behavior change is the bounded external wait.

## Risks or follow-up

- Responses slower than 90 seconds still fail safely; this does not guarantee provider availability.
- No latency claim about real Gemini beyond the observed Production 30-second cutoff is made.
- The longer budget is a tested local candidate; release, commit/push/PR and Production retry
  require separate authorization. Production has not received this change.
- The private HTTP harness and external fixture are diagnostics, not production data or adapters.

## Human decision summary

Task generation receives 90 seconds while other Feature Spec operations keep 30 seconds.
Local deadline, persisted API and repository checks support the candidate. Existing drafts and
Apply boundaries remain protected. The remaining decision is an authorized release path.

## TODO update

`FEATURE-SPEC-TASK-AI-TIMEOUT` remains **In progress** overall: local implementation/test
candidate ready; release and Production confirmation are outside this approval window.

## Authorized Production release

- **User authority:** `naikkan ke prod`, followed by `lanjut`, 2026-11-06. Release window and AC
  are in the Quick Card's continuation window. No new feature or product decision is introduced.
- **Release baseline:** `800cc2c708c545f7adb86ed499ca2f26489be784` (`origin/main`), isolated branch
  `codex/feature-spec-task-ai-timeout`. The original branch's two MCP documentation commits,
  reset evidence/TODO entry, and all unrelated work remain outside this PR.
- **Tier:** 1; no matched Tier 2 paths. Required `verify`/`owner-gate`, tiered auto-merge, and
  Git-integrated main deployment are used. No direct push to main or Owner-label mutation.
- **Operational WRA:** 5/16, Ready: internal consumers 1, runtime validation 2, real cloud
  account 2; all other dimensions 0. Existing tests supply candidate evidence; CI independently
  verifies the PR. Persistent workflow test scope remains the disposable PostgreSQL evidence above.
- **Recovery:** prior Ready Production deployment `dpl_8yiRBiBvVjPewoNz873mU6B8LnCM`.
  No schema/migration/data change is required for this release.
- **Validation scope:** clean locked install under Node 24, repository validation, build,
  environment check in the isolated workspace, required CI, then Production deployment provenance,
  health/database/migration status and authentication guard. No user draft is generated or overwritten
  solely for release verification; real-provider success remains a reported limitation.
- **Environment limitations observed:** the first clean install used the host's default Node
  20.12.2 and emitted engine warnings; it is repeated with Node 24.15.0. The original workspace's
  local environment check failed six database-URI format checks. Those existing values were neither
  changed nor exported. The isolated worktree uses ignored canonical local templates and passes
  `env:check`; that checks local configuration shape, not Production secrets. Production is checked
  through its existing authenticated/public interfaces. Locked dependency audit warnings are recorded
  without unsolicited dependency changes.

Release checks, PR/merge and deployment outcome will be appended as observed; no pending step is
claimed complete.

### Release preflight evidence

- `npm ci` under Node **24.15.0**, npm **11.12.1**: exit 0, 744 packages installed from the
  existing lockfile; no dependency manifest/lockfile change. Existing audit output: **38 findings**
  (24 moderate, 11 high, 3 critical), plus four deprecated-package warnings. No dependency repair
  was attempted in this bounded timeout release. The initial Node 20 install is superseded by
  this compatible clean install; its engine warnings are not claimed as a successful Node 24 check.
- `npm run env:setup:local` then `npm run env:check` in the isolated worktree: exit 0, **0 warnings**,
  ignored local template files only. No Production environment values were downloaded or changed.
- `npm --prefix packages/contracts run build`: exit 0.
- First sandboxed `npm run validate` stopped with **25/29 docsys tests passing, 4 startup
  timeouts** because local portal servers could not start. The exact suite was repeated with
  local server/browser permissions; **29/29 passed, 0 skipped**. No test or application logic
  was weakened to get green output.
- Authorized `npm run validate`: exit 0, including documentation, docsys, completeness, environment
  examples, SDLC, migration-policy, agent-policy, tier, theme, full lint and all typechecks.
  Full lint has **0 errors / 15 existing warnings** in unrelated frontend files; none of the
  changed TypeScript files adds a warning. Completeness remains **85 baseline / 0 new gaps**.
- `npm run build`: exit 0, contracts/API/web; Vite built 1,772 modules successfully.
- Targeted Prettier check, diff whitespace check, worktree SDLC evaluation: passed.
- Tier evaluation over all seven candidate paths: **Tier 1, 0 matched Tier 2 paths**.
- `npm run quality:test`: **19 pass / 0 fail / 0 skip**, exit 0.
- `npm run migrations:prod:check`: exit 0; Production is up to date at migration 096.
- Pre-release `postman request GET https://qlickhub.vercel.app/v1/health --timeout 15000`
  with a post-request HTTP-200 assertion: exit 0; service `ok`, database connected,
  **80 applied migrations**, latest `20261105000096-add-notification-bug-id.cjs`.
- Current Production deployment before this release:
  `dpl_8yiRBiBvVjPewoNz873mU6B8LnCM`, Ready, function in `hnd1`, Node 24.x,
  maximum duration 300 seconds. This is the recorded rollback target, not the new deployment.
