# QA-DESK-SIMPLIFY — Tahap 5: Test & Review

**Status:** Accepted
**Gerbang:** G5 — verifier independen atau CI yang mencakup seluruh AC
**Applicable Policy IDs:** AI-003, AI-004, AI-008, AI-010, TEST-001, DOC-005

Level bukti mengikuti `docs/4_AGENT_DEV_GUIDELINES.md` §2A.C: E0 klaim · E1 inspeksi · E2 dieksekusi ·
E3 persisten (PostgreSQL) · E4 runtime/UAT.

## 1. Matriks AC → bukti

| AC     | Phase | Bukti dibutuhkan | Bukti tercapai | API/PostgreSQL                                                         | UAT/runtime           | Status |
| ------ | ----- | ---------------- | -------------- | ---------------------------------------------------------------------- | --------------------- | ------ |
| AC-1.1 | P1    | E3               | E3             | `featureAutoBaselineIntegration` — baseline dibuat saat AC ditambah    | Smoke test P2         | Pass   |
| AC-1.2 | P1    | E3               | E3             | `featureAutoBaselineIntegration` — 3 alasan blocker                    | —                     | Pass   |
| AC-1.3 | P1    | E3               | E3             | `featureAutoBaselineIntegration` — `isBaselineSuperseded`              | —                     | Pass   |
| AC-2.1 | P1    | E3               | E3             | `featureReadinessBackfillMigration` — 1 baseline, idempoten, atribusi  | Audit Prod: 0 Feature | Pass   |
| AC-2.2 | P1    | E3               | E3             | `featureReadinessBackfillMigration` — Feature tanpa penyetuju dilewati | —                     | Pass   |
| AC-2.3 | P1    | E3               | E3             | `featureReadinessBackfillMigration` — `down()` mempertahankan baseline | —                     | Pass   |
| AC-3.1 | P1    | E3               | E3             | `qaDeskBackendB1Integration` D1 create → active                        | Smoke test P2         | Pass   |
| AC-3.2 | P1    | E3               | E3             | `qaDeskBackendB1Integration` D1 422 (create, PATCH)                    | —                     | Pass   |
| AC-4.1 | P1    | E3               | E3             | `qaDeskBackendB1Integration` D2 hapus + audit                          | Smoke test P2         | Pass   |
| AC-4.2 | P1    | E3               | E3             | `qaDeskBackendB1Integration` D2 409 dan 403                            | —                     | Pass   |
| AC-5.1 | P1    | E3               | E3             | `qaDeskBackendB1Integration` D5 in-place, author tetap                 | —                     | Pass   |
| AC-5.2 | P1    | E3               | E3             | `qaDeskBackendB1Integration` D5 revisi baru + `needsRetest`            | —                     | Pass   |
| AC-5.3 | P1    | E3               | E3             | `qaDeskBackendB1Integration` D5 422 / Dev 403                          | —                     | Pass   |
| AC-6.1 | P1    | E3               | E3             | `qaDeskBackendB1Integration` remind-po outbox + 429                    | —                     | Pass   |

## 2. Outcome pemeriksaan

| Perintah / observasi                         | Environment                     | Exit code | Hasil                               | Outcome |
| -------------------------------------------- | ------------------------------- | --------- | ----------------------------------- | ------- |
| `npm run validate`                           | lokal (cloud), commit `7e69aa8` | 0         | 0 error, 15 warning lama            | sukses  |
| `npm run typecheck`                          | lokal (cloud)                   | 0         | pass                                | sukses  |
| `npm run docs:check`                         | lokal (cloud)                   | 0         | pass                                | sukses  |
| `db:migrate:test` dari database kosong       | PostgreSQL 16 disposable        | 0         | 087 + 088 migrated                  | sukses  |
| `npm --prefix apps/api run test:integration` | PostgreSQL 16 disposable        | 0         | 500 tests, 500 pass, 0 fail         | sukses  |
| Query audit backfill (read-only)             | Production, dijalankan Owner    | —         | content_eligible 0, will_backfill 0 | sukses  |
| CI PR #37                                    | GitHub Actions                  | —         | hijau (Owner; PR di-merge)          | sukses  |

## 3. Bukti UI (bila UI berubah)

N/A — Feature ini tidak mengubah layar. Field kontrak baru opsional; `web build` dan vitest web dijalankan CI.

## 4. Quality review (AI-010)

| Dimensi                     | Metode & scope                              | Temuan                                                                                              | Status     |
| --------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------- |
| Reuse / DRY                 | Baca diff B0/B1                             | `ensureAutoBaseline` mengulang logika `createBaseline` manual (snapshot, activity)                  | follow-up  |
| Duplikasi / tumpang tindih  | Baca diff                                   | Aturan scope QA dipakai bersama lewat `validateQaDirectScope`                                       | none found |
| Kode usang / tidak terpakai | Grep blocker lama                           | Tidak ditemukan                                                                                     | none found |
| Boundary & best practice    | Baca `requirementService.updateRequirement` | Pemicu baseline dipanggil setelah `save()` di luar transaksi; gagal memicu tidak membatalkan update | follow-up  |
| Bukti regresi               | Suite integrasi penuh                       | 500/500                                                                                             | resolved   |

## 5. Hasil verifier

| Phase | Verifier (bukan pelaksana)                    | Bukti primer yang dicek ulang         | Hasil    | AC terdampak / gap |
| ----- | --------------------------------------------- | ------------------------------------- | -------- | ------------------ |
| P1    | Claude (bukan penulis kode B0/B1) + CI PR #37 | Suite integrasi, migration test, diff | Accepted | —                  |

Gap yang diterima harus disetujui eksplisit dan dicatat di [release.md](release.md).
