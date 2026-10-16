# QUICK — TIER2-HTTP-SECURITY-SURFACE Wiring HTTP dan middleware keamanan menjadi Tier 2

**Status:** Menunggu persetujuan
**WRA:** 2/16 — ketersinggungan 1 (lebih banyak PR butuh label Owner), validasi 1 (pencocokan pola)

Status yang diizinkan: Draft, Menunggu persetujuan, Disetujui, Selesai, Blocked.

## Problem

- Gejala: perubahan rate limit, CORS/origin, proxy trust, dan wiring `app.ts` bisa ter-merge otomatis
  sebagai Tier 1 tanpa label Owner, padahal mengubah permukaan keamanan HTTP.
- Bukti: `quality/tier2-paths.txt` (main `b0bb86f`) hanya memuat `authenticate.ts` dan `authorize.ts`
  dari `apps/api/src/http/middleware/`; `rateLimit.ts`, `origin.ts`, `proxyTrust.ts`, `app.ts`, dan
  `config/env.ts` tidak termasuk. Temuan audit E2. Sejak 1 Sep ada 18 commit yang menyentuh file-file ini.
- Penyebab: daftar Tier 2 awal (ADR-028) hanya menargetkan autentikasi/otorisasi.

## Perubahan

- File/path: `quality/tier2-paths.txt` (tiga pola: `apps/api/src/app.ts`, `apps/api/src/config/env.ts`,
  `apps/api/src/http/middleware/**`), Quick Card ini.
- Bukan scope: mengubah aturan ADR-028/AI-020 (daftar path adalah sumber kanonisnya), mengubah kode aplikasi.

## Acceptance Criteria → bukti

| AC                                                                                      | Bukti yang dibutuhkan (E-level) | Perintah / observasi            |
| --------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------- |
| AC-1 `rateLimit.ts`, `app.ts`, `config/env.ts`, dan test middleware cocok dengan Tier 2 | E2                              | `matchTier2` dengan daftar baru |
| AC-2 File route biasa (`modules/tasks/taskRoutes.ts`) tetap Tier 1                      | E2                              | `matchTier2` yang sama          |
| AC-3 Test checker tier tetap lulus                                                      | E2                              | `npm run tier:test` (5/5)       |

## Approval Window

- Task / baseline: TIER2-HTTP-SECURITY-SURFACE @ `b0bb86f`
- Path yang diizinkan: daftar pada bagian Perubahan
- Urutan aksi: edit → test → commit → patch → Owner publish → PR → merge (tier 2, `quality/**`)
- Masa berlaku dan stop condition: sampai PR dibuat

**Disetujui:** —

## Hasil

- Perintah — exit code — pass/fail/skip: `npm run tier:test` — 0 — 5/0/0; `matchTier2` — 4 file Tier 2,
  `taskRoutes.ts` tidak cocok.
- PR dan tier: belum dibuat; Tier 2 (`quality/**`).
- Gap: Tidak ada.
