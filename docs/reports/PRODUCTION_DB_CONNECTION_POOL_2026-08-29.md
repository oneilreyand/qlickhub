# PRODUCTION-DB-CONNECTION-POOL Laporan Eksekusi Fitur — 2026-08-29

- **Pelaksana:** Codex
- **Tanggal:** 2026-08-29
- **Status:** Done
- **Referensi Task:** TODO.md — PRODUCTION-DB-CONNECTION-POOL

## 1. Ringkasan Perubahan

Production login failed with `INVALID_CREDENTIALS`, but the deterministic reproduction showed the actual condition was database connection exhaustion. The Supabase Session Pooler rejected new clients at its 15-session limit; consequently `/health` returned `503` and the login route's broad error handling obscured the database failure.

Vercel Production `DATABASE_URL` now uses the verified Supabase Transaction Pooler on port `6543`, without disclosing the connection string. The API now constrains Production Sequelize processes to one pooled connection while preserving the existing development capacity of ten connections.

## 2. Berkas yang Diubah / Dibuat

- `[NEW] apps/api/src/db/sequelizePool.ts` — provides environment-specific Sequelize pool settings.
- `[MODIFY] apps/api/src/db/sequelize.ts` — applies the centralized pool configuration.
- `[NEW] apps/api/src/db/__tests__/sequelizePool.test.ts` — locks down Production and development pool limits.
- `[NEW] docs/reports/PRODUCTION_DB_CONNECTION_POOL_2026-08-29.md` — records diagnosis, repair, and validation evidence.
- `[MODIFY] TODO.md` — records completed Production connection recovery.

## 3. Bukti Verifikasi Pengujian (Test Evidence)

- **Original reproduction:** `POST /v1/auth/login` for the PO test account — failed with `400 INVALID_CREDENTIALS` before the repair.
- **Root-cause probes:** direct Session Pooler connection returned `EMAXCONNSESSION`; `/health` returned `503` with `database=disconnected`; a read-only Transaction Pooler connection on port `6543` succeeded.
- **Regression test (red):** `npm --prefix apps/api run typecheck` — failed before implementation because `sequelizePool` did not exist.
- **API typecheck:** `npm --prefix apps/api run typecheck` — passed after implementation.
- **API build:** `npm --prefix apps/api run build` — passed.
- **Focused regression test:** `node --test apps/api/dist/db/__tests__/sequelizePool.test.js` — 2 passed, 0 failed, 0 skipped.
- **Vercel Production:** deployment `dpl_5qrzRCD7MkbdYMHoCbp5r4B8XgSt` — `READY` and aliased to `https://qlickhub.vercel.app`.
- **Original regression loop:** Production `/health` returned `200` with `database=connected`; PO login returned `200` with role `po`.
- **Stability check:** five concurrent Production health checks — 5/5 connected.
- **Static review:** `git diff --check` — passed.

## 4. Catatan Khusus & Handoff

- No database migration, schema change, application data mutation, or role/authorization policy change was made.
- The `INVALID_CREDENTIALS` response is still intentionally generic; a future reliability task can distinguish unavailable infrastructure in server logs or an appropriate client-safe response without exposing authentication details.
- The PO queue empty-state illustration remains separately blocked only on browser credential-entry consent for desktop/mobile visual validation.
