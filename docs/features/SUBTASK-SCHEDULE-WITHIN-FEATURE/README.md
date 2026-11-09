# SUBTASK-SCHEDULE-WITHIN-FEATURE — Feature Overview

**Status:** Active
**Owner:** reyand (Owner); pelaksana Codex
**Last reviewed:** 2026-11-07
**Applicable Policy IDs:** DOC-005, SDLC-001, SDLC-002, AUTH-002, CONTRACT-001, TEST-001

Sumber proposal: [rencana F1–F4](../../plans/QLICKHUB_FOLLOWUP_F1_F4_PLAN.md#f1--jadwal-subtask-harus-di-dalam-rentang-feature).
Baseline inspeksi: `a717ba7` (origin/main). Branch `codex/f1-subtask-schedule-plan`.
Owner menyetujui G0–G3/K1/L1/L2 melalui pesan `ok`, 2026-11-07, setelah meninjau draft.
Keputusan arsitektur pada solution.md dan SSoT dicatat sebelum runtime. Phase 1 dan review independen G5 telah selesai untuk kandidat lokal; kedua verifier menerima
setelah dua temuan diperbaiki. PR Tier 2 disiapkan atas instruksi Owner `ok kerjakan`;
merge/deploy menunggu gate Owner, dan Production belum diverifikasi untuk F1. K2–K7 tetap menunggu Owner dan F2–F4 tidak dikerjakan.

## Stage Tracker

| Tahap             | Dokumen                                                                                | Status               | Gerbang         | Disetujui oleh / tanggal             | Catatan                                                  |
| ----------------- | -------------------------------------------------------------------------------------- | -------------------- | --------------- | ------------------------------------ | -------------------------------------------------------- |
| 0 Problem         | [problem.md](problem.md)                                                               | Disetujui            | G0              | Owner / 2026-11-07                   | Disetujui melalui pesan ok; lihat catatan persetujuan    |
| 1 Opsi Solusi     | [solution.md](solution.md)                                                             | Disetujui            | G1              | Owner / 2026-11-07                   | Disetujui melalui pesan ok; lihat catatan persetujuan    |
| 2 PRD             | [product.md](product.md)                                                               | Disetujui            | G2              | Owner / 2026-11-07                   | Disetujui melalui pesan ok; lihat catatan persetujuan    |
| 3 Breakdown       | [breakdown.md](breakdown.md)                                                           | Disetujui            | G3              | Owner / 2026-11-07                   | Disetujui melalui pesan ok; lihat catatan persetujuan    |
| (shared)          | [contracts.md](contracts.md) · [authorization.md](authorization.md) · [roles/](roles/) | Disetujui            | bagian G2       | Owner / 2026-11-07                   | Disetujui melalui pesan ok; lihat catatan persetujuan    |
| 4 Build           | [phases/PHASE-01.md](phases/PHASE-01.md)                                               | Selesai              | dalam window G3 | Codex / 2026-11-07                   | Kandidat lokal teruji dan direview independen            |
| 5 Test & Review   | [testing.md](testing.md)                                                               | Disetujui            | G5              | Verifier Standards/Spec / 2026-11-07 | Accepted untuk kandidat lokal                            |
| 6 Release & Close | [release.md](release.md)                                                               | Menunggu persetujuan | G6              | —                                    | PR Tier 2; Owner label dan verifikasi Production pending |

## 1. Tujuan dan Pengguna

Planner menjaga jadwal subtask aktif di dalam jadwal Feature. Developer dan QA membaca rentang
serta peringatan legacy tanpa memperoleh izin mengedit planning. Lihat [problem.md](problem.md).

## 2. Requirement dan Acceptance Criteria

[product.md](product.md) menetapkan AC-F1.1–AC-F1.12 beserta bukti lokal dan batas independent acceptance.

## 3. Alur Lintas Peran

Owner memutuskan K1/L1/L2 → Planner menyunting tanggal → server memvalidasi secara transaksional
→ Developer/QA melihat jadwal tersimpan atau peringatan legacy → QA membuktikan AC.
[Owner/Admin](roles/owner-admin.md), [PO](roles/po.md), [Developer](roles/developer.md), [QA](roles/qa.md).

## 4. Data dan Relasi

Task root dan satu tingkat subtask pada Workspace yang sama; tidak ada tabel/migrasi/backfill baru.
Status keluar rentang dihitung backend, bukan disimpan atau dihitung ulang browser.

## 5. API dan Shared Contract

[contracts.md](contracts.md): reuse endpoint Task/Feature Spec; tambahan metadata baca diusulkan.

## 6. Authorization

[authorization.md](authorization.md); backend mempertahankan policy role dan Workspace saat ini.

## 7. UI dan Interaction States

[product.md](product.md) §3–§4 memuat flow dan wireframe seluruh state serta tiga viewport.

## 8. Pengujian dan Evidence

[testing.md](testing.md) memuat bukti lokal E2/E3/E4 dan penerimaan dua verifier independen;
Production/UAT dan G6 tetap terpisah.

## 9. Release dan Readiness

[release.md](release.md). G0–G3 dan G5 lokal sudah diterima; merge Tier 2 tetap menunggu label Owner,
lalu verifikasi deployment target.
F2–F4 tidak termasuk Feature ini dan tetap menunggu keputusan relevan di tabel rencana induk.

## 10. Traceability

Rencana F1 → Problem → K1/L1/L2 → Requirement/AC → F1-BE-1/F1-FE-1/F1-FE-2/F1-QA-1 →
kontrak/kode setelah approval → PostgreSQL/UI/E2E → independent review → keputusan rilis.

### Tahap 0/6 — Problem (G0)

**Feature:** SUBTASK-SCHEDULE-WITHIN-FEATURE · **Jalur:** Penuh (WRA 6/16) · **Status:** Disetujui
**Dokumen:** [problem.md](problem.md)
**Ringkasan:** Celah pair/order vs containment dikonfirmasi melalui inspeksi lalu reproduksi merah.
**Fakta terkonfirmasi:** keputusan Owner `ok`, 2026-11-07; baseline a717ba7 dan primary source pada problem.
**Unknown / unverified:** hasil build/runtime tidak dianggap bagian dari approval produk; evidence ada pada testing.
**Keputusan yang diperlukan:** tidak ada untuk gate ini; persetujuan rilis belum diberikan.
**Balas:** revisi atau stop bila scope perlu berubah.

### Tahap 1/6 — Opsi Solusi (G1)

**Feature:** SUBTASK-SCHEDULE-WITHIN-FEATURE · **Jalur:** Penuh (WRA 6/16) · **Status:** Disetujui
**Dokumen:** [solution.md](solution.md)
**Ringkasan:** K1 tolak tanpa auto-shift, L1=A (tanggal harus valid penuh), L2=A (reopen di luar rentang ditolak). Keputusan arsitektur telah diterima (lihat solution.md).
**Fakta terkonfirmasi:** keputusan Owner `ok`, 2026-11-07; baseline a717ba7 dan primary source pada problem.
**Unknown / unverified:** hasil build/runtime tidak dianggap bagian dari approval produk; evidence ada pada testing.
**Keputusan yang diperlukan:** tidak ada untuk gate ini; persetujuan rilis belum diberikan.
**Balas:** revisi atau stop bila scope perlu berubah.

### Tahap 2/6 — PRD (G2)

**Feature:** SUBTASK-SCHEDULE-WITHIN-FEATURE · **Jalur:** Penuh (WRA 6/16) · **Status:** Disetujui
**Dokumen:** [product.md](product.md)
**Ringkasan:** AC-F1.1–.12, kontrak read/error, authorization dan UI states disetujui.
**Fakta terkonfirmasi:** keputusan Owner `ok`, 2026-11-07; baseline a717ba7 dan primary source pada problem.
**Unknown / unverified:** hasil build/runtime tidak dianggap bagian dari approval produk; evidence ada pada testing.
**Keputusan yang diperlukan:** tidak ada untuk gate ini; persetujuan rilis belum diberikan.
**Balas:** revisi atau stop bila scope perlu berubah.

### Tahap 3/6 — Breakdown (G3)

**Feature:** SUBTASK-SCHEDULE-WITHIN-FEATURE · **Jalur:** Penuh (WRA 6/16) · **Status:** Disetujui
**Dokumen:** [breakdown.md](breakdown.md)
**Ringkasan:** Satu slice BE/FE/QA, build/test lokal diotorisasi; WRA kini 6/16, tanpa commit/push/merge/deploy.
**Fakta terkonfirmasi:** keputusan Owner `ok`, 2026-11-07; baseline a717ba7 dan primary source pada problem.
**Unknown / unverified:** hasil build/runtime tidak dianggap bagian dari approval produk; evidence ada pada testing.
**Keputusan yang diperlukan:** tidak ada untuk gate ini; persetujuan rilis belum diberikan.
**Balas:** revisi atau stop bila scope perlu berubah.

### Tahap 4–5/6 — Build lokal dan Test & Review

**Feature:** SUBTASK-SCHEDULE-WITHIN-FEATURE · **Jalur:** Penuh (WRA 6/16) · **Status:** Disetujui
**Dokumen:** [Phase 01](phases/PHASE-01.md), [testing.md](testing.md).
**Ringkasan:** Standards dan Spec masing-masing Accepted untuk kandidat lokal setelah atomic Save
folder/tanggal dan metadata assignment diperbaiki. Tidak ada temuan actionable tersisa.
**Fakta terkonfirmasi:** PostgreSQL API 671/671, frontend 838/838, kontrak 109/109,
E2E 6/6, validate/build lulus; bukti primer diperiksa dua verifier.
**Unknown / unverified:** CI remote, Production/UAT, dan G6 belum diterima.
**Keputusan yang diperlukan:** Owner label pada PR Tier 2 sebelum merge/deploy Git integration.

### Tahap 6/6 — Release & Close

**Feature:** SUBTASK-SCHEDULE-WITHIN-FEATURE · **Jalur:** Penuh (WRA 6/16) · **Status:** Menunggu persetujuan
**Dokumen:** [release.md](release.md).
**Ringkasan:** Owner `ok kerjakan`, 2026-11-07, melanjutkan review, perbaikan F1, validasi,
dan persiapan commit/branch PR. Persetujuan merge Tier 2 tetap melalui label Owner.
**Fakta terkonfirmasi:** tidak ada migrasi baru; health Production read-only melaporkan 80 migrasi,
latest sesuai canonical tree. Tidak ada mutasi data Production atau deployment manual.
**Unknown / unverified:** hasil CI, Preview, deployment F1 dan smoke terautentikasi di target.
**Keputusan yang diperlukan:** label `owner-approved` dari Owner pada diff final.

Evidence terkini: [laporan G5](../../reports/SUBTASK_SCHEDULE_WITHIN_FEATURE_G5_2026-11-07.md).
[Laporan Phase 1](../../reports/SUBTASK_SCHEDULE_WITHIN_FEATURE_P1_2026-11-07.md) menyimpan
histori window lokal sebelumnya; window lanjutan dan hasil review dicatat pada laporan G5.
