# Agent Report — SEC-03 Dependency Audit Remediation

## Task

Remove the current npm security audit findings without force-upgrading unrelated packages or changing Production.

## Outcome

The dependency graph now reports zero known vulnerabilities in both the complete graph and the Production-only graph. The original baseline contained 11 vulnerable paths (9 moderate, 1 high, and 1 critical); the Production-only baseline contained 7 moderate paths.

The remediation upgrades Vite to 6.4.3, Vitest to 3.2.6, and Firebase Admin to 14.3.0. The regenerated lockfile resolves `qs` to 6.16.0 and the Firebase optional Cloud Storage path to `@google-cloud/storage` 8.0.1, `retry-request` 9.0.1, `teeny-request` 11.0.1, and `uuid` 11.1.1. Root-level exact Firebase Admin and Cloud Storage entries intentionally keep npm workspace hoisting on the audited versions; the API remains the only application consumer and continues to use Firebase Messaging only.

No application behavior, environment secret, Vercel setting, Preview deployment, or Production deployment was changed.

## Source of truth and impact

- **Applicable SSoT:** `docs/0_PRODUCT_KNOWLEDGE_MAP.md`, `docs/1_ARCHITECTURE.md`, and `docs/4_AGENT_DEV_GUIDELINES.md`.
- **Policy IDs:** `DATA-001`, `TEST-001`, `DOC-002`.
- **Data/interface impact:** None. No API contract, persistence behavior, database record, or browser interface changed.
- **Authorization impact:** None. Authentication and RBAC code are unchanged.
- **Migration risk:** None. No schema or migration changed, and no migration was run against Production.

## Changed files

- `package.json` — pins the audited Firebase Admin and optional Cloud Storage dependency path and retains the safe UUID override.
- `package-lock.json` — records the remediated, deduplicated workspace graph.
- `apps/api/package.json` — upgrades Firebase Admin to 14.3.0.
- `apps/web/package.json` — upgrades Vite to 6.4.3 and Vitest to 3.2.6.
- `TODO.md` — records task scope, result, and verification evidence.
- `docs/reports/SEC_03_DEPENDENCY_AUDIT_REMEDIATION_2026-09-03.md` — records this implementation evidence.

## Validation

- `npm audit --json` — passed; 0 info, 0 low, 0 moderate, 0 high, 0 critical.
- `npm audit --omit=dev --json` — passed; Production dependency graph reports 0 vulnerabilities.
- `npm ls @google-cloud/storage firebase-admin gaxios retry-request teeny-request uuid qs vite vitest esbuild --all` — passed; graph is valid and the remediated paths resolve to the intended versions.
- `npx --yes npm@10.5.0 ci --dry-run --ignore-scripts` — passed dependency resolution for the package-manager version declared by the repository. Despite `--dry-run`, npm 10 removed locally installed executables; `npm install` restored the workspace before subsequent validation.
- `npm --prefix packages/contracts run test` — passed 56/56 tests across 16 suites; 0 failed, cancelled, skipped, or todo.
- `npm --prefix apps/web run test` — passed 326/326 tests across 67 files; 0 failures. Existing React `act(...)` warnings and one existing nested-button warning remain.
- `npm --prefix apps/api run test:integration` — passed 363/363 tests across 90 suites against the configured PostgreSQL test/Preview database; 0 failed, cancelled, skipped, or todo. Simulated FCM and unconfigured-test-SMTP notices were expected. An earlier sandboxed attempt could not reach PostgreSQL and was interrupted; it is not counted as passing evidence.
- `npm run build` — passed for contracts, API, and web; Vite 6.4.3 transformed 1,694 modules.
- `npm run validate` — passed documentation checks (5/5), lint (0 errors; 27 pre-existing warnings), and all three workspace typechecks.
- Environment for final verification: Node 24.15.0; installed npm 11.12.1, plus the explicit npm 10.5.0 clean-install resolution check above. No Production environment or deployment was accessed.

## Risks or follow-up

- The root pins for Firebase Admin and its optional Cloud Storage dependency are a workspace resolution guard. Reassess and remove them only after a future Firebase Admin release natively resolves a non-vulnerable Storage chain and the same audit/test gates pass.
- Four deprecated transitive-package notices (`dottie`, `whatwg-encoding`, `node-domexception`, and `glob`) remain during installation. They are not current npm audit findings, but should be revisited during routine dependency maintenance.
- The repository declares npm 10.5.0 while the current development runtime provides npm 11.12.1. Both resolved the lockfile successfully; standardizing the toolchain is a separate decision and was not silently included in this security task.

## TODO update

- `SEC-03-DEPENDENCY-AUDIT-REMEDIATION` → `Done`.
