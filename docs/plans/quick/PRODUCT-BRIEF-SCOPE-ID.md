# QUICK — PRODUCT-BRIEF-SCOPE-ID Brief Produk dari AI tidak bisa disimpan ulang

**Status:** Selesai
**WRA:** 4/16 — lapisan 1 (backend service), ketersinggungan 2 (generator AI + pembacaan Brief), validasi 1

Status yang diizinkan: Draft, Menunggu persetujuan, Disetujui, Selesai, Blocked.

## Problem

- Gejala: Brief Produk dari Feature yang dibuat lewat generator AI tidak bisa disimpan sebagai versi baru —
  termasuk untuk menyetujuinya. `PUT /tasks/:taskId/product-brief` selalu ditolak 400
  (`inScope.0.id: Invalid uuid …`), UI menampilkan "Data yang diisi belum valid". Akibatnya Baseline
  Kesiapan tidak pernah terbentuk dan seluruh alur QA Feature itu terhenti.
- Bukti (smoke test lokal 2026-10-17, Feature 817e3fca, login Owner):
  - Request body memuat `inScope[].id = "scope-1".."scope-4"`, `outScope[].id = "outscope-1".."outscope-3"`.
  - `apps/api/src/modules/ai/aiTaskGeneratorService.ts` menulis id `scope-${n}` / `outscope-${n}` langsung
    ke `upsertProductBrief`, melewati `ProductBriefScopeItemInputSchema` (`id: uuid().optional()`).
  - Pembacaan versi (`qaDocumentService.ts` formatter) mengembalikan id itu apa adanya, UI mengirimnya
    kembali, validasi menolaknya.
- Semua Feature hasil generator AI — lokal maupun Production — terdampak.

## Perubahan

- File/path: `apps/api/src/modules/ai/aiTaskGeneratorService.ts`,
  `apps/api/src/modules/qaDocuments/qaDocumentService.ts`, test integrasi
  `apps/api/src/modules/ai/__tests__/aiTaskGeneratorIntegration.test.ts` dan
  `apps/api/src/modules/qaDocuments/__tests__/productBriefLegacyScopeIds.test.ts` (baru), Quick Card ini.
- Perilaku:
  - Generator AI tidak lagi mengarang id; `normalizeScopeItems` memberi UUID nyata.
  - Saat membaca versi Brief, item scope/AC dengan id yang bukan UUID diberi UUID deterministik
    (diturunkan dari id versi + daftar + posisi), sehingga respons sesuai kontrak dan stabil di setiap baca.
    Versi lama tidak diubah (riwayat tetap utuh); versi berikutnya yang disimpan memakai UUID valid.
  - Penomoran `position` generator AI disamakan dengan editor (mulai 0).
- Bukan scope: migrasi data, perubahan kontrak/validasi, UI.

## Acceptance Criteria → bukti

| AC                                                                         | Bukti (E-level) | Perintah / observasi                                              |
| -------------------------------------------------------------------------- | --------------- | ----------------------------------------------------------------- |
| AC-1 Feature baru dari generator AI menyimpan scope id berupa UUID         | E2              | `aiTaskGeneratorIntegration.test.ts` (PG)                         |
| AC-2 Brief lama dengan id non-UUID terbaca dengan UUID valid dan stabil    | E2              | `productBriefLegacyScopeIds.test.ts` (PG)                         |
| AC-3 Brief lama itu bisa disimpan sebagai versi baru berstatus Disetujui   | E2              | test yang sama (validasi `UpsertProductBriefSchema` + PostgreSQL) |
| AC-4 Versi lama tidak berubah di database                                  | E2              | test yang sama                                                    |
| AC-5 Feature 817e3fca lokal bisa disetujui dan Baseline Kesiapan terbentuk | E3              | Playwright lokal                                                  |
| AC-6 Tidak ada regresi API                                                 | E3              | `test:integration` penuh                                          |

## Approval Window

- Task / baseline: PRODUCT-BRIEF-SCOPE-ID @ `b385891`
- Path yang diizinkan: daftar pada bagian Perubahan
- Urutan aksi: edit → test → commit → patch → Owner publish → PR → merge (Tier 1; tidak ada path Tier 2)
- Masa berlaku dan stop condition: sampai PR dibuat; berhenti bila perlu migrasi data, perubahan kontrak,
  atau suite API gagal

**Disetujui:** reyand (Owner), 2026-10-17, chat "setuju"

## Hasil

- Perintah — exit code — pass/fail/skip:
  - `productBriefLegacyScopeIds.test.ts` + `aiTaskGeneratorIntegration.test.ts` (PostgreSQL 16) — 0 — 10/0/0
  - test baru pada service lama (tanpa perbaikan) — 1 — 0/2/0 (membuktikan test menangkap bug)
  - `npm --prefix apps/api run test:integration` (PostgreSQL 16, migrasi 1–88) — 0 — 517/0/0
  - `npm run validate` — 0
- PR dan tier: #52 (merged); Tier 1.
  - AC-5 (Playwright lokal, 2026-10-19): Brief 817e3fca tersimpan v2 `approved`, baseline terbentuk — Pass
- Gap: AC-3 memakai validasi kontrak yang sama dengan controller, bukan request HTTP; AC-5 lulus
  setelah merge ([report smoke test lokal](../../reports/LOCAL_SMOKE_TEST_2026-10-19.md)). Data lama di Production tidak diubah; Brief lama baru memakai UUID setelah
  disimpan ulang.
