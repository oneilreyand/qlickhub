# QUICK — PRODUCTION-MIGRATION-GATE Gate migrasi Production lewat health publik

**Status:** Disetujui
**WRA:** 4/16 — lapisan 2 (API health + CI script), validasi 1 (test baru: PostgreSQL health + script), ketersinggungan 1 (`verify` dipakai semua PR ke `main`). Tanpa migrasi, kontrak bersama, atau perubahan izin.

Status yang diizinkan: Draft, Menunggu persetujuan, Disetujui, Selesai, Blocked.

## Problem

- Gejala: migrasi Production tertinggal dua kali (085/086 dan 089–093); kode sudah ter-deploy sebelum schema-nya ada.
- Bukti: [rilis QA-DESK-SIMPLIFY](../../reports/QA_DESK_SIMPLIFY_RELEASE_2026-10-14.md), [rilis P5e–P5g](../../reports/SIMPLE_UI_P5EFG_RELEASE_2026-11-03.md).
- Penyebab: terkonfirmasi. Merge ke `main` otomatis deploy; langkah CI lama hanya peringatan dan tidak tahu status Production.

## Perubahan

- File/path: `apps/api/src/db/migrationStatus.ts`, `apps/api/src/app.ts` (health), test health PostgreSQL, `scripts/checkProductionMigrations.mjs` + test, `package.json`, `.github/workflows/ci.yml`, ADR-039, `docs/DEPLOYMENT_AND_ENVIRONMENTS.md`, Quick Card ini.
- Bukan scope: kredensial database di CI, menjalankan migrasi otomatis, deteksi migrasi yang dijalankan tidak berurutan.

## Acceptance Criteria → bukti

| AC                                                                                   | Bukti yang dibutuhkan (E-level) | Perintah / observasi                                                         |
| ------------------------------------------------------------------------------------ | ------------------------------- | ---------------------------------------------------------------------------- |
| AC-1: Health memuat `database.migrations.latest/applied` sama dengan `SequelizeMeta` | E3                              | `healthMigrationStatus.test.ts` di PostgreSQL disposable                     |
| AC-2: CI gagal bila tree punya migrasi lebih baru dari Production                    | E2                              | `npm run migrations:prod:test` (kasus 089–094)                               |
| AC-3: Health tak terbaca atau tanpa status → peringatan, bukan gagal                 | E2                              | test "unverified"                                                            |
| AC-4: CI menjalankan cek hanya pada PR ke `main`, sebagai langkah terakhir `verify`  | E2                              | `ci.yml` + run CI PR ini (Production belum melaporkan status → `unverified`) |

## Approval Window

- Task / baseline: PRODUCTION-MIGRATION-GATE @ `fc76ade`
- Path yang diizinkan: daftar pada bagian Perubahan
- Urutan aksi: edit → test → validate → commit → Owner publish branch → PR → Owner memberi label (Tier 2) dan merge.
- Masa berlaku dan stop condition: sampai PR dibuat; berhenti bila health perlu membuka data lain atau CI perlu kredensial.

**Disetujui:** Owner, 2026-11-03, memilih opsi "Health + cek CI tanpa akses DB" di chat.

## Hasil

- `node --import tsx --test apps/api/src/http/__tests__/healthMigrationStatus.test.ts` — PostgreSQL 16 disposable, 78 migrasi — **1/1 pass** (`/health` dan `/v1/health` = `SequelizeMeta`).
- `npm run migrations:prod:test` — **5/5 pass** (pending 089–094, up to date, unreachable/tanpa status/nama tak valid → `unverified`, daftar migrasi nyata terurut).
- `npm run validate` — exit 0 (docs 12/12, 0 gap baru, lint 0 error, typecheck).
- Gap: CI PR ini akan `unverified` karena Production belum melaporkan status sampai PR ini ter-deploy; gate aktif penuh mulai PR berikutnya. Tier 2 (`.github/**`, `apps/api/src/app.ts`, `docs/adr/**`).
