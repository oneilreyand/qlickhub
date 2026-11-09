# Mermaid Studio — P1–P2 local evidence, 9 November 2026

## Task

FEAT-PRD-MERMAID-STUDIO. [Feature](../features/FEAT-PRD-MERMAID-STUDIO/README.md),
[approved breakdown/window](../features/FEAT-PRD-MERMAID-STUDIO/breakdown.md).
Branch `codex/prd-mermaid-studio`; baseline `94134da1`.

## Outcome

Studio now accepts a title and Mermaid source, previews with the actual Mermaid engine, and
inserts or updates a managed Markdown block. Editing retains the block ID, increases its revision,
and preserves surrounding content. New documents begin empty. Node palette/canvas and chart builder
were removed from Studio; legacy Mermaid and chart viewers remain available.

Spec PRD, Product Brief and description entrypoints use the shared editor. Product Brief/description
retain their existing save workflow; insertion updates a draft and does not claim server persistence.
The gallery provides an explicitly isolated interaction demo. No MCP, OAuth, dependency, migration,
RBAC policy, Production write, push, PR, merge or deployment was performed.

## Work assurance

- **SDLC:** Standard, stages 0–3 approved by Owner on 2026-11-09 through `ok` after the concrete
  P1–P2 plan/window was presented. Stage 4 is a tested local candidate. Stage 5 independent
  verification and stage 6 publication/release remain pending.
- **WRA:** 6/16 before format approval, 5/16 after resolving that choice. Initial Ready after
  split; PostgreSQL capability was then demonstrated. It does not imply a Production release.
- **Approval Window:** task/baseline above; shared diagram contract, frontend editor/viewers/consumers,
  existing Spec/Brief services and tests, gallery, Feature/UI/catalog/TODO/report documentation.
  P1 → P2 → same-scope fixes → local checks/report; valid through this implementation session or
  2026-11-16 23:59 WIB. The approved scope includes local fixture servers and disposable PostgreSQL.
- **Capability/access:** repository and browser available; PostgreSQL 16 installed. A new disposable
  cluster was initialized for this task on loopback port 55439. Database
  `qlick_mermaid_94134_test` used canonical migrations: **81 up, 0 down**. No existing database was
  reset. No credentials or connection strings are included in this report.
- **Verifier:** Codex executed/reviewed primary evidence. There is no separate agent/CI acceptance;
  do not interpret this report as independent G5 approval.

### AC-to-evidence matrix

| AC     | Required / achieved | Primary local evidence                                                                                                                         | Status                                                  |
| ------ | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| MMD-01 | E2/E4 / E2/E4       | Component tests and actual app Mermaid preview from pasted source                                                                              | Executed; independent review pending                    |
| MMD-02 | E2 / E2/E4          | Contract replacement/no-op/legacy tests; browser second edit retained one block, revision 2                                                    | Executed                                                |
| MMD-03 | E3/E4 / E3/E4       | Authenticated HTTP PostgreSQL round-trip Spec → Apply → Brief → update; actual app save/reload/edit/save/reload                                | Executed on disposable DB                               |
| MMD-04 | E3 / E3             | 409 stale Spec, 403 Dev/QA, 404 cross-Workspace, 400 malformed/applied; persisted version unchanged on rejection                               | Executed                                                |
| MMD-05 | E2/E3 / E2/E3       | Legacy conversion/preservation contracts, Mermaid/chart renderer tests, persisted source/metadata equality                                     | Executed                                                |
| MMD-06 | E2/E4 / E2/E4       | Invalid source, retry, dirty cancel/switch, permission/limit/stale document/target component tests; actual Mermaid syntax error blocked action | Executed                                                |
| MMD-07 | E4 / E4             | 390×844, 820×1180, 1440×1000, Light/Dark; no horizontal overflow, footer action visible with 44px height, keyboard Tab from source to viewer   | Executed in desktop browser; native devices not claimed |
| MMD-08 | E1/E2 / E1/E2       | Feature docs, catalog, TODO, UI catalog, local quality review and governance checks                                                            | Independent G5 pending                                  |

### Validation commands and counts

| Command                                                                                                                                                                                                                                                              | Environment                                       | Outcome                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------ |
| `npm --prefix packages/contracts run test`                                                                                                                                                                                                                           | Local Node 24 / tsx                               | Exit 0, **117 passed, 0 failed, 0 skipped**; includes 8 managed-block tests    |
| `npm --prefix packages/contracts run build`                                                                                                                                                                                                                          | Local                                             | Exit 0                                                                         |
| `npm --prefix apps/api run build`                                                                                                                                                                                                                                    | Local                                             | Exit 0                                                                         |
| `node /private/tmp/qlick-mermaid-db-runner.cjs migrate`                                                                                                                                                                                                              | New disposable PostgreSQL 16                      | Exit 0; canonical migrations applied cleanly                                   |
| `node /private/tmp/qlick-mermaid-db-runner.cjs status`                                                                                                                                                                                                               | Same disposable DB                                | Exit 0; **81 up, 0 down**                                                      |
| `node /private/tmp/qlick-mermaid-db-runner.cjs dist/modules/featureSpecs/__tests__/featureSpecApplyApiIntegration.test.js dist/modules/featureSpecs/__tests__/featureSpecApiIntegration.test.js dist/modules/qaDocuments/__tests__/qaDocumentApiIntegration.test.js` | Authenticated HTTP + disposable PostgreSQL        | Exit 0; **47 passed, 0 failed, 0 skipped**                                     |
| `npm --prefix apps/web run test`                                                                                                                                                                                                                                     | Local jsdom                                       | Exit 0; **864 passed, 0 failed, 0 skipped**, 144 files                         |
| `npm --prefix apps/web run test -- PrdDiagramStudioModal.test.tsx TaskDetailProductBriefTab.test.tsx TaskDetailOverviewTab.test.tsx FeatureSpecDraftPanel.test.tsx`                                                                                                  | Final component/consumer changes                  | Exit 0; **35 passed, 0 failed, 0 skipped**, 4 files                            |
| `npm --prefix apps/web run build`                                                                                                                                                                                                                                    | Local production bundle                           | Exit 0; known >500 kB chunk warning, also present in baseline                  |
| `npm run validate`                                                                                                                                                                                                                                                   | Local, server capability enabled for portal tests | Exit 0; all checks passed, lint **0 errors / 15 warnings**, no new docsys gaps |
| `git diff --check`                                                                                                                                                                                                                                                   | Local                                             | Exit 0                                                                         |

The temporary DB runner passes the disposable test environment to Node/Sequelize without printing
connection strings. It is not application runtime code. The PostgreSQL suite intentionally triggers
one real storage failure to prove transaction rollback; its expected sanitized 500 log is not a test
failure. This suite does not exercise the live Production database or a third-party AI provider.

### Actual application browser path

A contract-valid browser fixture was created and persisted in the disposable DB. The unmodified
application shell ran through Vite on loopback port 4317, proxying `/v1` to the real Express app on 4318. Login used the ordinary authenticated login API; no browser API routes, models or internal
services were mocked. The source renderer loaded the actual Mermaid CDN engine.

Observed path:

1. Login as fixture Owner; open the persisted Feature's PRD stage.
2. Add a title and flowchart with a review decision and revision branch. Actual SVG preview appears.
3. Insert into draft, save draft PRD, observe Spec version 4, then reload.
4. Open **Edit Diagram**: title and source match persisted content.
5. Replace the flow, update the same block, save Spec version 5, then reload.
6. Authenticated GET confirms exactly one managed block, revision 2, updated source, original
   surrounding business context retained.
7. Enter invalid Mermaid in the actual editor: error is visible and Update is disabled. Restore source,
   then exercise dirty cancellation without changing persisted content.

Screenshots are local review artifacts under
`/Users/mac/.codex/visualizations/2026/11/09/01a1c095-6ce3-7993-a321-43eec27c6a02/`,
named `mermaid-studio-1440-light.png`, `mermaid-studio-1440-dark.png`,
`mermaid-studio-820-light.png`, `mermaid-studio-820-dark.png`,
`mermaid-studio-390-light.png`, and `mermaid-studio-390-dark.png`.
The final screenshots include the shared Modal footer visible on all six layouts.

### Failure outcomes and remediation

- First branch creation was denied by filesystem sandbox permissions; the authorized branch command
  succeeded with reviewed escalation. No protected branch was written.
- Initial PostgreSQL initdb and tsx test attempts were blocked by sandbox shared-memory/IPC limits;
  reruns with reviewed local capability succeeded. No mocks replaced PostgreSQL evidence.
- First disposable migration runner referenced a package-local CLI path that did not exist; corrected
  to the installed workspace CLI, then clean migrations succeeded.
- One renderer regression expected the legacy default title. Restored that default for unmanaged
  blocks; retained the assertion. Managed blocks display their stored title.
- `npm run validate` initially could not start four portal tests under sandbox. With local-server
  capability all 29 docsys tests passed. Catalog completeness then identified the new entry outside
  a continuous Markdown table; moved the row into the existing table. **No baseline/enforcement
  exception was added.**
- One browser automation selector matched both document and modal SVGs; scoped the selector to the
  dialog and completed all six viewport/theme checks. No product change was needed for this issue.
- Old Studio mode/export tests were replaced because the Owner explicitly approved removing its
  canvas/chart-building workflow. New tests exercise pasted source, actual draft replacement,
  invalid/retry and dirty/stale/read-only states. Legacy chart rendering tests remain unchanged.

### Change Impact Map and decisions

- **Function/module:** one shared descriptor/parser/serializer and exact-target update helper;
  the UI does not implement parallel parse or revision logic.
- **Feature:** Studio, Mermaid viewer, formatted document rendering, rich text preview, PRD/Brief/
  description consumers and gallery. Child editors reset on Feature identity changes to prevent
  carrying an open draft to another Feature.
- **Data/interface:** metadata and source occupy the existing Markdown strings. Existing field
  limits remain 5,000/100,000 characters; no truncation, migration, backfill or new endpoint/table.
- **Authorization:** existing Workspace and Planner service guards unchanged. Read-only props also
  disable already-open editors; UI visibility is not the backend authorization mechanism.
- **Operations/release:** local-only candidate, Tier 1 paths; no Tier 2 match and no PR. Recompute tier
  from any later diff before publication. Main's auto-deploy is not triggered.
- **Decision Snapshot:** managed blocks chosen over plain unidentifiable fences (simpler but poor
  edit targeting) or a new diagram table (independent CRUD but unnecessary schema/lifecycle).
  Legacy documents remain read-compatible and gain identity only on explicit edit.

### Quality review

| Concern                        | Evidence-backed finding                                                                                                                                                                                                                                                    |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reuse                          | Modal's fixed footer, Input, Textarea, Select, Alert, Button and MermaidViewer reused. Shared `PrdDiagramList` presents actual document blocks across consumers. Existing Spec/Brief service and audit/version paths reused.                                               |
| Duplicate/overlapping behavior | Parser/serializer/revision logic lives only in `packages/contracts/src/prdDiagram.ts`. Searched all `PrdDiagramStudioModal` and `onApplyToPrd` consumers; each accepts a complete updated document. No remaining snippet append callback found.                            |
| Obsolete/unused code           | Palette/canvas node/edge state, drag handlers and metric builder removed. Search for `generateMermaidCode`, `CanvasNode`, `Palette Node` and old mode label in production Studio found none. Chart viewer is retained and still used by FormattedText; it is not obsolete. |
| Boundary/maintainability       | Parser in contracts, preview in viewer, draft/selection in Studio, persistence in existing authenticated services. Modal closes/resets across task identity; callback source validation prevents applying an outdated preview.                                             |
| Tests                          | 8 contract cases; 8 Studio cases; existing consumer/renderer regressions; real PostgreSQL/API round-trip plus existing persistence/role/concurrency tests. No test skipped or weakened to hide an error.                                                                   |
| Documentation                  | Feature scaffold created with `sdlc:new`; stage approval, shared contract, roles, tests, release gaps, UI catalog, feature catalog and TODO updated. New docsys gaps zero after catalog repair.                                                                            |
| Relations/query performance    | No relation, schema, index or ORM query added. Existing transactions/Workspace integrity/audit tested. EXPLAIN/N+1 query changes are not applicable; parsing is bounded by existing document limits.                                                                       |
| AI technology                  | No provider/model/prompt, autonomous action or external MCP transport introduced. Mermaid source is data; renderer uses strict security configuration.                                                                                                                     |

### Build/performance evidence

Baseline was built from a `git archive 94134da1` copy in a temporary directory, with installed
workspace dependencies reused. The candidate used the same Node/Vite environment and build command.
Raw asset bytes and Python `gzip.compress` bytes (same method both builds) were compared:

| Asset                          | Baseline raw / gzip | Candidate raw / gzip | Interpretation                                                    |
| ------------------------------ | ------------------- | -------------------- | ----------------------------------------------------------------- |
| Main index JS                  | 523,217 / 140,030   | 526,159 / 141,298    | +2,942 raw, +1,268 gzip (~0.9% gzip) for shared contract usage    |
| `useReleaseReadinessMap` chunk | 379,176 / 87,622    | 365,053 / 84,305     | Smaller relevant lazy chunk after Studio simplification           |
| FormattedText chunk            | 41,459 / 10,625     | 36,805 / 9,786       | Renderer split changes distribution; not an overall latency claim |

Mermaid remains runtime-loaded; no diagram engine library was added to the initial bundle. The

> 500 kB warning occurs in both builds and is reported rather than hidden. These build figures and
> local HTTP fixture timings are not a production-scale performance benchmark.

## Source of truth and impact

- [Architecture](../1_ARCHITECTURE.md) §§5–6; [Workflow](../2_WORKFLOW_AND_ROLES.md).
- [UI SSoT](../3_UI_ATOMIC_DESIGN_SYSTEM.md); [Developer guidelines](../4_AGENT_DEV_GUIDELINES.md).
- Policies: UI-001–UI-005, DATA-001, CONTRACT-001, TEST-001, DOC-005, DOC-006, SDLC-001, SDLC-002,
  AUTH-001, AUTH-002, AI-001, AI-020.
- Data/interface impact: compatible managed Markdown representation; no endpoint or schema shape change.
- Authorization impact: none; server policies remain canonical.
- Migration risk: none; old records are not rewritten.

## Changed files

- `packages/contracts/src/prdDiagram.ts`, export and contract tests — canonical representation and replacement.
- Studio, `PrdDiagramList`, `MermaidViewer`, `FormattedText`, `RichTextEditor` — editor, safe preview and editing actions.
- Feature Spec/Brief/Overview/Stage components plus gallery — integration and Feature identity reset.
- Spec/Brief services and persistence tests — structure validation at existing write seams and real DB evidence.
- Feature folder, UI/catalog indexes, TODO and this report — decisions and bounded evidence.

## Risks or follow-up

- Mermaid still depends on the existing major-11 CDN URL. Retry and readable source errors are available;
  dependency pinning/self-hosting was outside this approved window.
- Backend validates block structure/metadata and existing input limits; Mermaid syntax validation occurs
  in the preview. A future MCP validation endpoint must define server-side syntax validation explicitly.
- Product Brief's existing whole-document upsert has no caller expectedVersion. Block revision is not
  a replacement for that guard; future MCP writes should use the versioned Spec seam or add a separately
  designed conflict-safe operation.
- Chart/KPI builder no longer appears in Studio; existing charts remain readable. A new chart authoring
  workflow, OAuth/MCP and publishing remain separate work.
- No independent G5 acceptance or Production verification is claimed.

## Human decision summary

The approved local feature behavior is implemented with persisted evidence and responsive browser
checks. It is ready for independent review. Further publication or MCP setup is outside this window.

## TODO update

FEAT-PRD-MERMAID-STUDIO remains **In progress**, with PRD/BE/FE implementation layers complete locally;
independent review and publication are pending. It is not marked Done or Production-ready.

## Final check results

- Final full frontend: **144 files, 864 passed, 0 failed, 0 skipped**; 31 React act warning occurrences across the suite, including WorkspaceSettingsPage, TaskTimelineView, SubtaskAccordionItem, Header, NotificationBell, FeaturePrdSummary, OverviewStoreDashboard and RoleAwareWorkQueuePanel. No failures or skips were hidden.
- Final `npm run validate`: exit 0. Governance/docsys/env/SDLC/migration-policy/agent-policy/tier/theme checks, lint and all three typechecks passed. Lint: **0 errors, 15 warnings** in existing files; no new docsys gap (83 baseline gaps remain).
- Final build: exit 0; baseline and candidate both warn about a main chunk above 500 kB.
- `git diff --check`: exit 0. New source/document files also checked separately for unintended trailing whitespace.
- Temporary fixture servers and disposable cluster are shut down after verification. Database files belong only to this task; no Production data or environment was modified.
- Verdict: **tested local candidate; independent G5 pending**, not a Production completion.
