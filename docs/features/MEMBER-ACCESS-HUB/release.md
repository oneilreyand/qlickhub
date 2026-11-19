# MEMBER-ACCESS-HUB — Tahap 6: Release & Close

**Status:** Belum mulai
**Gerbang:** G6 — keputusan rilis oleh PO; label `owner-approved` oleh Owner untuk Tier 2
**Applicable Policy IDs:** AI-013, AI-020, RELEASE-001, RELEASE-002, DOC-003

## 1. Merge dan deploy

Merge ke `main` otomatis men-deploy Production (Vercel). Setiap phase dicatat di sini: PR, tier,
file Tier 2 (migrasi, ADR, middleware), merge commit, dan nama bundle setelah deploy.

| Phase | PR                      | Tier                                | Migrasi                                                                                    | Catatan                         |
| ----- | ----------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------- |
| P1    | #136                    | 2                                   | —                                                                                          | API ringkasan akses             |
| P2    | #146                    | 1                                   | —                                                                                          | Halaman Anggota & Akses         |
| P3    | #147                    | 2 (Architecture, registry)          | —                                                                                          | Kirim ulang / batalkan undangan |
| P6    | #148                    | 1                                   | —                                                                                          | Tab Pengaturan Workspace        |
| P4    | `feat/member-access-p4` | 2 (migrasi, Architecture, registry) | `20261119000103-create-member-role-templates` dijalankan Owner di Production sebelum merge | Template peran + impor CSV      |

## 2. Verifikasi di environment target

Smoke Production read-only per phase setelah deploy; mutasi hanya pada data uji yang disetujui Owner.

## 3. QA sign-off dan keputusan rilis

Diisi saat phase terakhir siap rilis.

## 4. Metrik sukses (dari problem.md)

Diukur ulang 4 minggu setelah rilis phase terakhir di Workspace pilot.

## 5. Checklist penutupan

- [ ] Report di `docs/reports/` memakai `AGENT_REPORT_TEMPLATE.md`
- [ ] Stage Tracker di [README.md](README.md) diperbarui
- [ ] `docs/features/FEATURE_CATALOG.md` diperbarui
- [ ] SSoT/ADR terdampak sesuai implementasi
- [ ] `TODO.md` → Done dan dipindah ke arsip
