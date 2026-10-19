# DOC-PORTAL — Tahap 6: Release & Close

**Status:** Released
**Gerbang:** G6 — keputusan rilis oleh PO; label `owner-approved` oleh Owner untuk Tier 2
**Applicable Policy IDs:** AI-013, AI-020, RELEASE-001, RELEASE-002, DOC-003, DOC-006

## 1. Merge dan deploy

| Phase     | PR  | Tier | File Tier 2                                                                                         | Merge commit | Memicu deploy Production?                         | Deployment ID / waktu |
| --------- | --- | ---- | --------------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------- | --------------------- |
| P1        | #43 | 2    | `package.json`                                                                                      | `1d9d437`    | ya (Vercel auto-deploy), tanpa perubahan aplikasi | 2026-10-14            |
| P2        | #44 | 2    | `package.json`, `quality/doc-baseline.json`, ADR-033, `POLICY_REGISTRY.md`, `AGENTS.md`, guidelines | `998e998`    | ya (Vercel auto-deploy), tanpa perubahan aplikasi | 2026-10-14            |
| P3        | #45 | 1    | —                                                                                                   | `5931530`    | ya (Vercel auto-deploy), tanpa perubahan aplikasi | 2026-10-19            |
| Follow-up | #55 | 2    | `quality/doc-baseline.json`                                                                         | `de3873c`    | ya (Vercel auto-deploy), tanpa perubahan aplikasi | 2026-10-19            |

DOC-PORTAL hanya menambah tool lokal (`tools/docsys`), dokumen, dan langkah `validate`. Kode aplikasi,
kontrak, dan database tidak berubah, sehingga deploy Production tidak membawa perubahan perilaku.

## 2. Verifikasi di environment target

Environment target adalah laptop developer (portal lokal) dan CI `verify` (completeness check).

| AC             | Environment       | Observasi / perintah                                                       | Level | Hasil                                                          |
| -------------- | ----------------- | -------------------------------------------------------------------------- | ----- | -------------------------------------------------------------- |
| AC-3.5         | CI `verify`       | `npm run validate` menjalankan `docs:completeness` di PR #44, #45, #55     | E2    | Pass                                                           |
| AC-3.1         | `main` `de3873c`  | `npm run docs:completeness`: 91 gap, 0 baru                                | E2    | Pass                                                           |
| AC-4.1, AC-4.5 | Mac Owner, `main` | `docs:extract` + `docs:portal`; 6 halaman aktif, badge gap tampil per menu | E4    | Pass — dikonfirmasi Owner di chat 2026-10-19, tanpa screenshot |

## 3. QA sign-off dan keputusan rilis

| Item               | Isi                                                                                                               |
| ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| QA sign-off        | N/A — tool dokumentasi internal; bukti test di [testing.md](testing.md)                                           |
| Keputusan rilis PO | approved — Owner merge PR #43, #44, #45 dan menyetujui G6 di chat 2026-10-19                                      |
| Gap yang diterima  | 91 gap lama di `quality/doc-baseline.json` (DS-R01 = 81, DS-R03 = 10) dikerjakan bertahap, bukan syarat penutupan |
| Rollback plan      | Owner: set `DOCSYS_MODE=report` untuk menonaktifkan blokir, atau revert PR terkait; aplikasi tidak terdampak      |

## 4. Metrik sukses (dari problem.md)

| Metrik                                  | Baseline                   | Target                                                    | Hasil setelah rilis (2026-10-19)                                           | Kapan diukur ulang       |
| --------------------------------------- | -------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------ |
| Endpoint yang tercatat di dokumen fitur | sekitar 45/102 (perkiraan) | 100% atau selisih tercatat sebagai pengecualian           | 77/158 tercatat; 11 dikecualikan (`links.ignoreEndpoints`); 81 di baseline | Setiap batch dokumentasi |
| Model yang dipetakan ke domain ERD      | 24/60                      | 100%                                                      | 58/58                                                                      | —                        |
| Item TODO dengan penanda layer          | 0/12                       | 100%                                                      | 4/14; 10 item Codex menunggu keputusan Owner                               | Setelah keputusan Owner  |
| Portal sinkron dengan `main`            | tidak ada portal           | Dibangun ulang dengan satu perintah                       | `npm run docs:extract`                                                     | —                        |
| Bisa dipakai ulang                      | —                          | Proyek baru cukup config dan adapter, tanpa mengubah core | Lulus uji fixture `alt` (AC-5.1, AC-5.2)                                   | Saat dipakai proyek baru |

## 5. Checklist penutupan

- [x] Report di [`docs/reports/DOC_PORTAL_2026-10-19.md`](../../reports/DOC_PORTAL_2026-10-19.md)
- [x] Stage Tracker di [README.md](README.md) diperbarui
- [x] `docs/features/FEATURE_CATALOG.md` diperbarui
- [x] SSoT/ADR terdampak sudah sesuai implementasi (ADR-033, `DOC-006`)
- [x] `TODO.md` → Done dan dipindah ke [arsip 2026-10-19](../../archive/TODO_COMPLETED_2026-10-19.md)
- [x] Follow-up tertaut di report: batch dokumentasi endpoint, test notifikasi flaky, keputusan item Codex
