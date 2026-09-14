## Task

PRODUCTION-RELEASE-ROUTED-PAGE-RECOVERY: release the routed-page error containment and stale
lazy-chunk recovery from exact application source commit `a8458f4` to Vercel Production.

## Outcome

Application source commit `a8458f4` was pushed to `origin/main` and manually deployed to Vercel
Production as `dpl_Eoj1j4s628PjVUaLTdJK5KegeFbd`. The deployment is `READY`, targets Production,
and owns the canonical `https://qlickhub.vercel.app` alias.

Production now keeps the authenticated application shell available when routed page content
crashes. Tabs loaded from this release can also perform one guarded full reload when a later
deployment replaces a lazy route chunk. No database migration, persisted business-data mutation,
environment-variable change, authentication change, or authorization change was performed.

## Source of truth and impact

- **Applicable SSoT:** `docs/DEPLOYMENT_AND_ENVIRONMENTS.md` for the Production release and smoke
  sequence; `docs/3_UI_ATOMIC_DESIGN_SYSTEM.md` for the shared application layout and error state;
  `docs/4_AGENT_DEV_GUIDELINES.md` for verification and evidence requirements.
- **Policy IDs:** `AUTH-001`, `DATA-001`, `UI-001`, `UI-002`, `TEST-001`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** None. API contracts and persisted records are unchanged. The frontend
  stores only a route-specific recovery timestamp in browser session storage.
- **Authorization impact:** None. Existing authenticated routes and backend authorization remain
  authoritative.
- **Migration risk:** None. The release contains no schema or migration change; all existing
  Production migrations were audited read-only before deployment.

## Changed files

- `TODO.md` — records the release lifecycle and final evidence.
- `docs/reports/PRODUCTION_RELEASE_ROUTED_PAGE_RECOVERY_2026-09-14.md` — records this release.
- Runtime implementation and tests are the exact application contents of commit `a8458f4`, as
  recorded in `docs/reports/PAGE_CONTENT_ERROR_BOUNDARY_2026-09-14.md` and
  `docs/reports/RECOVER_STALE_LAZY_CHUNKS_AFTER_DEPLOY_2026-09-14.md`.

## Validation

- Source-control audit — local `main` was exactly one commit ahead of `origin/main`; `git push
origin main` pushed `cac31c9..a8458f4` successfully.
- Source test evidence — focused recovery and layout regression tests passed 10/10; the complete
  frontend suite passed 445/445 before commit, with 0 failures and 0 skipped tests.
- `npm run validate` — passed documentation checks 5/5 and all contracts/API/web typechecks;
  repository lint reported 0 errors and 22 pre-existing warnings.
- `npm run env:check` — passed with 0 warnings and printed no values.
- `npm run build` — passed contracts, API, and web Production builds; Vite transformed 1,708
  modules.
- Production migration audit through the linked Vercel Production environment — all 53 canonical
  migrations reported `up`. No migration command or schema mutation was run.
- `vercel --prod --yes` — cloud build passed contracts, API, and web with 1,708 modules;
  deployment `dpl_Eoj1j4s628PjVUaLTdJK5KegeFbd` became `READY` and received the canonical alias.
  The build emitted non-failing notices that `.git` is absent in the build container and that four
  dependency install scripts are not covered by npm `allowScripts`.
- Production public smoke — `/`, `/login`, and `/v1` returned 200. `/v1/health` returned 200 with
  service status `ok` and database status `connected`.
- Authorization guard — unauthenticated `/v1/workspaces` returned 401.
- CORS — a Production-origin preflight returned 204 with exact
  `access-control-allow-origin: https://qlickhub.vercel.app`; an unauthorized origin returned 401
  without an allow-origin header.
- PWA artifacts — `/firebase-messaging-sw.js` returned 200 JavaScript and
  `/manifest.webmanifest` returned 200 manifest JSON.
- Active artifact inspection — entry `/assets/index-4xqhvoCO.js` and all 47 actual referenced
  hashed JavaScript chunks returned 200 JavaScript. The active code contains the
  `qlickhub:route-chunk-reload:` marker, all seven protected lazy-route keys, and the shared
  `Terjadi Kesalahan` fallback.
- Stale-chunk runtime condition — the previously active
  `/assets/WorkHubPage-RgyMGA9h.js` now returns 200 HTML from the SPA fallback, while current
  `/assets/WorkHubPage-6ALclQRg.js` returns 200 JavaScript. This confirms the deployed recovery
  code covers the observed post-deployment mismatch.
- `git diff --check` — passed before the application commit and will be repeated for this report
  commit.

## Risks or follow-up

- A tab whose document predates this first recovery-enabled deployment cannot acquire the new
  recovery helper retroactively and may still need one manual hard refresh. Tabs loaded from this
  deployment can self-recover from later chunk-hash replacement.
- No authenticated Production role journey was run because no Production credentials were used
  and this frontend-only release did not justify creating or mutating business records.
- Rollback target is the preceding verified Ready deployment
  `dpl_DfTr9xgTYCu7hjsfd2QdDCSPs67y`; no database rollback is required.

## TODO update

- `PRODUCTION-RELEASE-ROUTED-PAGE-RECOVERY` → `Done`.
