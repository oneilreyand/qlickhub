# E2E-SDLC-FLOW — Tahap 6: Release & Close

**Status:** Belum mulai
**Gerbang:** G6 — keputusan rilis oleh PO; label `owner-approved` oleh Owner untuk Tier 2
**Applicable Policy IDs:** AI-013, AI-020, RELEASE-001, RELEASE-002, DOC-003, QA-010

## 1. Merge dan deploy

Urutan wajib, karena merge langsung men-deploy Production:

1. Owner push branch `feat/e2e-sdlc-flow` dan membuat PR (Tier 2: migrasi, ADR, SSoT, Policy Registry).
2. Terapkan migrasi `20261105000095-shorten-applied-requirement-codes` ke Production **sebelum**
   merge (gerbang migrasi Production, ADR-039); periksa `requirement_code_renames` terisi.
3. Beri label `owner-approved`, merge, tunggu deploy selesai.

| Phase | PR           | Tier | File Tier 2                             | Merge commit | Memicu deploy Production? | Deployment ID / waktu |
| ----- | ------------ | ---- | --------------------------------------- | ------------ | ------------------------- | --------------------- |
| P1–P5 | belum dibuat | 2    | lihat [PHASE-01](phases/PHASE-01.md) §5 | —            | ya                        | —                     |

## 2. Verifikasi di environment target

| AC   | Environment | Observasi / perintah                                                                    | Level | Hasil |
| ---- | ----------- | --------------------------------------------------------------------------------------- | ----- | ----- |
| AC-8 | Production  | Requirement lama tampil `REQ-001` dst.; `SELECT count(*) FROM requirement_code_renames` | E4    | —     |
| AC-9 | Production  | Ulangi skenario E2E manual dengan satu Feature uji, rekam bukti                         | E4    | —     |

## 3. QA sign-off dan keputusan rilis

| Item               | Isi                                                                          |
| ------------------ | ---------------------------------------------------------------------------- |
| QA sign-off        | Belum                                                                        |
| Keputusan rilis PO | Belum                                                                        |
| Gap yang diterima  | Belum ada; usulan: notifikasi Bug membuka Feature (follow-up terpisah)       |
| Rollback plan      | Revert PR; bila perlu `down` migrasi `20261105000095` (kode lama dipulihkan) |

## 4. Metrik sukses (dari problem.md)

| Metrik                                                  | Baseline | Target | Hasil setelah rilis | Kapan diukur ulang   |
| ------------------------------------------------------- | -------- | ------ | ------------------- | -------------------- |
| Langkah alur yang bisa lewat UI                         | 0 dari 9 | 9      | —                   | Hari rilis           |
| Kartu Tugas Saya yang berujung 403/"tidak dapat dibuka" | ada      | 0      | —                   | Hari rilis           |
| Retest macet                                            | mungkin  | 0      | —                   | 7 hari setelah rilis |

## 5. Checklist penutupan

- [ ] Report di `docs/reports/` memakai `AGENT_REPORT_TEMPLATE.md`
- [ ] Stage Tracker di [README.md](README.md) diperbarui
- [ ] `docs/features/FEATURE_CATALOG.md` diperbarui
- [ ] SSoT/ADR terdampak sudah sesuai implementasi
- [ ] `TODO.md` → Done dan dipindah ke arsip
- [ ] Follow-up/Bug tertaut, tidak dibiarkan di catatan bebas
