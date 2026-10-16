# QUICK — AUTH-RECOVERY-RATE-LIMIT Batasi percobaan lupa/reset password

**Status:** Disetujui
**WRA:** 3/16 — lapisan 1 (middleware + route auth), ketersinggungan 1 (endpoint publik), validasi 1 (test baru)

Status yang diizinkan: Draft, Menunggu persetujuan, Disetujui, Selesai, Blocked.

## Problem

- Gejala: `POST /v1/auth/forgot-password` dan `POST /v1/auth/reset-password` tidak punya rate limit
  khusus; hanya limiter umum `/v1` (100 permintaan per 5 menit per IP di Production).
- Bukti: `apps/api/src/modules/auth/auth.routes.ts` baris 105 dan 154 (main `9d99e71`) tidak memakai
  limiter, berbeda dengan `/login` (`loginRateLimiter`). Temuan audit E4.
- Penyebab: limiter khusus hanya dibuat untuk login.
- Risiko: banjir email reset ke satu alamat, biaya SMTP, dan percobaan token reset berulang.

## Perubahan

- File/path: `apps/api/src/http/middleware/rateLimit.ts` (factory + dua limiter),
  `apps/api/src/modules/auth/auth.routes.ts` (dua route), test baru
  `apps/api/src/http/__tests__/credentialRecoveryRateLimit.test.ts`, Quick Card ini.
- Batas: forgot-password 5 per 15 menit per IP; reset-password 10 per 15 menit per IP; aktif di
  Production dan Vercel Preview, tidak aktif di lokal/test.
- Bukan scope: store terdistribusi (limiter memakai memory store per instance, sama seperti login),
  batas per alamat email, perubahan UI.

## Acceptance Criteria → bukti

| AC                                                                | Bukti yang dibutuhkan (E-level) | Perintah / observasi                                    |
| ----------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------- |
| AC-1 Permintaan melebihi batas di Production → 429 `RATE_LIMITED` | E2                              | `credentialRecoveryRateLimit.test.ts` (HTTP nyata)      |
| AC-2 Lokal/test tidak dibatasi                                    | E2                              | test yang sama                                          |
| AC-3 Kedua route memakai limiter                                  | E2                              | test yang sama (stack route `authRouter`)               |
| AC-4 Alur reset password tetap berjalan                           | E3                              | `passwordResetApiIntegration.test.ts` dalam suite penuh |

## Approval Window

- Task / baseline: AUTH-RECOVERY-RATE-LIMIT @ `9d99e71` (rebase ke main terbaru sebelum publish)
- Path yang diizinkan: daftar pada bagian Perubahan
- Urutan aksi: edit → test → commit → patch → Owner publish → PR → merge (tier 2)
- Masa berlaku dan stop condition: sampai PR dibuat; berhenti bila suite API gagal

**Disetujui:** reyand (Owner), 2026-10-16, chat "setuju"

## Hasil

- Perintah — exit code — pass/fail/skip: test baru 3/0/0; `validate` 0; `test:integration` (PostgreSQL 16, migrasi 1–88) 504/0/0.
- PR dan tier: belum dibuat; Tier 2 (`apps/api/src/modules/auth/**`).
- Gap: memory store per instance serverless; batas efektif bisa lebih longgar bila banyak instance aktif.
