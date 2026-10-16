# QUICK — STRUCTURED-ERROR-LOG Log terstruktur untuk error server

**Status:** Disetujui
**WRA:** 4/16 — lapisan 1 (middleware + handler), ketersinggungan 2 (semua respons 5xx dan semua request), validasi 1

Status yang diizinkan: Draft, Menunggu persetujuan, Disetujui, Selesai, Blocked.

## Problem

- Gejala: error 500 yang dikembalikan lewat `sendProblemDetails` (168 pemakaian) tidak meninggalkan log apa
  pun; hanya handler global yang memanggil `console.error` bebas. Respons 500 di Production juga membawa
  `err.message` mentah (bisa berisi detail SQL). Tidak ada request id untuk menghubungkan laporan user
  dengan log.
- Bukti: `apps/api/src/http/problemDetails.ts` `sendProblemDetails` dan fallback `detail: err.message`;
  `apps/api/src/app.ts` handler global (main `b0bb86f`). Temuan audit F2.
- Keputusan Owner 2026-10-16: log terstruktur saja, tanpa layanan pihak ketiga.

## Perubahan

- File/path: `apps/api/src/http/errorLog.ts` (baru), `apps/api/src/http/problemDetails.ts`,
  `apps/api/src/app.ts`, test `apps/api/src/http/__tests__/errorLog.test.ts`,
  `docs/DEPLOYMENT_AND_ENVIRONMENTS.md` §8, Quick Card ini.
- Perilaku: header `x-request-id` di setiap respons (memakai id masuk yang valid); setiap 5xx menulis satu
  baris JSON `api.error` (request id, `x-vercel-id`, method, pola route, status, kode, nama error, pesan
  dan 8 frame stack yang disamarkan, user id, workspace id). Di Production `detail` 5xx menjadi
  `Internal server error`.
- Bukan scope: notifikasi/alert, error frontend, retensi log di luar Vercel, mengganti `console.error` lain.

## Acceptance Criteria → bukti

| AC                                                                         | Bukti yang dibutuhkan (E-level) | Perintah / observasi             |
| -------------------------------------------------------------------------- | ------------------------------- | -------------------------------- |
| AC-1 5xx menulis tepat satu baris JSON dengan request id, route, workspace | E2                              | `errorLog.test.ts` (HTTP nyata)  |
| AC-2 Password, body, query, dan connection string tidak muncul di log      | E2                              | test yang sama                   |
| AC-3 4xx tidak dicatat                                                     | E2                              | test yang sama                   |
| AC-4 Production menyembunyikan pesan internal 5xx                          | E2                              | test yang sama                   |
| AC-5 Request id masuk yang valid dipakai ulang; yang tidak valid diganti   | E2                              | test yang sama (via `createApp`) |
| AC-6 Tidak ada regresi API                                                 | E3                              | `test:integration` penuh         |

## Approval Window

- Task / baseline: STRUCTURED-ERROR-LOG @ `b0bb86f`
- Path yang diizinkan: daftar pada bagian Perubahan
- Urutan aksi: edit → test → commit → patch → Owner publish → PR → merge (tier 2: `app.ts`,
  `docs/DEPLOYMENT_AND_ENVIRONMENTS.md`)
- Masa berlaku dan stop condition: sampai PR dibuat; berhenti bila suite API gagal

**Disetujui:** reyand (Owner), 2026-10-16, chat "setuju F2"

## Hasil

- Perintah — exit code — pass/fail/skip: `errorLog.test.ts` 6/0/0; `validate` 0; `test:integration` (PostgreSQL 16, migrasi 1–88) 510/0/0.
- PR dan tier: belum dibuat; Tier 2.
- Gap: log Vercel Free tersimpan singkat; tidak ada notifikasi otomatis.
