# Performance Remediation Report: PERF-01-LOCAL-SEQUELIZE-POOL

**Date:** 2026-09-01  
**Author:** Antigravity  
**Task:** PERF-01-LOCAL-SEQUELIZE-POOL — Decouple local development connection pool capacity from NODE_ENV, allowing configurable DATABASE_POOL_MAX (default 10 in dev, default 1 in prod).

---

## Task

PERF-01-LOCAL-SEQUELIZE-POOL: Decouple Sequelize connection pool capacity from `NODE_ENV`, allowing local development environments to leverage multi-connection pooling (`max: 10` by default or configured via `DATABASE_POOL_MAX` 1–50) while strictly maintaining `max: 1` as the production default to protect Supabase Transaction Pooler connection limits in serverless runtimes.

---

## Outcome

1. **Decoupled Pool Sizing:** `getSequelizePoolConfig` now accepts explicit options (`{ nodeEnv, poolMax }` or positional args). It defaults to `max: 1` when `NODE_ENV === 'production'` and `max: 10` when `NODE_ENV === 'development'` or `'test'`.
2. **Validated Environment Configuration:** Added `DATABASE_POOL_MAX` (zod integer range 1–50) to `envSchema` in `apps/api/src/config/env.ts` and `scripts/checkEnv.mjs`.
3. **Environment Templates Updated:** Documented `DATABASE_POOL_MAX` in `.env.example`, `.env.development.example`, and `.env.production.example` without exposing secrets or credentials.
4. **Performance Proven:** Read-only PostgreSQL benchmarks demonstrated an **8.72x throughput improvement** on concurrent simulated query load (73.63 ms vs 642.23 ms across 100 queries) and a **1.71x improvement** on 50 parallel `SELECT 1` queries (5.07 ms vs 8.65 ms).

---

## Changed files

- `apps/api/src/config/env.ts` — Added `DATABASE_POOL_MAX` (zod integer 1..50, preprocessed for empty strings).
- `apps/api/src/db/sequelizePool.ts` — Enhanced `getSequelizePoolConfig` to support `poolMax` overrides while keeping production `max: 1` and development `max: 10` defaults.
- `apps/api/src/db/sequelize.ts` — Passed `env.NODE_ENV` and `env.DATABASE_POOL_MAX` to `getSequelizePoolConfig`.
- `.env.example` — Added documented `DATABASE_POOL_MAX=10`.
- `.env.development.example` — Added `DATABASE_POOL_MAX=10`.
- `.env.production.example` — Added commented `# DATABASE_POOL_MAX=1` explaining serverless pool protection.
- `scripts/checkEnv.mjs` — Added range validation (1–50) for `DATABASE_POOL_MAX`.
- `apps/api/src/db/__tests__/sequelizePool.test.ts` — Added tests for production default, dev default, test default, positional/object poolMax overrides, and invalid fallback.
- `apps/api/src/config/__tests__/env.test.ts` — Added tests for `DATABASE_POOL_MAX` schema validation, parsing, empty string fallback, and bounds checking.
- `TODO.md` — Added and marked `PERF-01-LOCAL-SEQUELIZE-POOL` as `Done`.

---

## Validation Evidence

1. **Focused Unit & Configuration Tests:**
   - Command: `NODE_ENV=test node --test apps/api/dist/db/__tests__/sequelizePool.test.js apps/api/dist/config/__tests__/env.test.js`
   - Result: **13/13 passed** across 2 suites in 65.9ms.
2. **Contracts Validation Suite:**
   - Command: `npm --prefix packages/contracts run test`
   - Result: **56/56 passed** across 16 suites in 290ms.
3. **Web Unit Suite:**
   - Command: `npm --prefix apps/web run test`
   - Result: **296/296 passed** across 61 test files.
4. **Static Typecheck & Compilation:**
   - Command: `npm run typecheck:api && npm run build:api`
   - Result: **0 errors, exit 0**.
5. **Linting Check:**
   - Command: `npm run lint`
   - Result: **0 errors, 28 pre-existing warnings**.
6. **Git Diff Hygiene:**
   - Command: `git diff --check`
   - Result: **Clean, exit 0**.
7. **Read-Only Benchmark against Local PostgreSQL (Port 5432):**
   - Simulated 5ms DB query load (5 batches x 20 concurrent queries = 100 queries):
     - `Pool Max 1` (Production default): 642.23 ms (6.42 ms/query)
     - `Pool Max 5` (Custom override): 134.17 ms (1.34 ms/query)
     - `Pool Max 10` (Development default): 73.63 ms (0.74 ms/query)
     - **Speedup:** 8.72x faster execution under concurrent load.
   - Pure `SELECT 1` parallel queries (50 queries):
     - `Pool Max 1`: 8.65 ms
     - `Pool Max 10`: 5.07 ms (1.71x speedup).

---

## Risks or follow-up

- **P1 Follow-up 1 (Route-level code splitting):** Web bundle analyzer indicates large monolithic vendor chunks that would benefit from route-level `React.lazy` splitting.
- **P1 Follow-up 2 (Deferred Firebase initialization):** Frontend Firebase initialization should remain lazy/deferred so lack of local FCM credentials does not log initialization warnings during test or development startup.

---

## TODO update

- `PERF-01-LOCAL-SEQUELIZE-POOL` → `Done`
