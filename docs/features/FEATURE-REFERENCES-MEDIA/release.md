# FEATURE-REFERENCES-MEDIA — Tahap 6: Release & Close

**Status:** Belum mulai
**Gerbang:** G6 — keputusan rilis oleh PO; label `owner-approved` oleh Owner untuk Tier 2
**Applicable Policy IDs:** AI-013, AI-020, RELEASE-001, RELEASE-002, DOC-003

## 1. Merge dan deploy

| Phase | PR      | Tier   | File Tier 2                                     | Merge commit | Memicu deploy Production?   | Deployment ID / waktu |
| :---- | :------ | :----- | :---------------------------------------------- | :----------- | :-------------------------- | :-------------------- |
| P1–P3 | Pending | Tier 2 | Migrasi database `apps/api/src/db/migrations/*` | Pending      | Ya (Vercel Git Integration) | Pending               |

## 2. Verifikasi di environment target

| AC              | Environment          | Observasi / perintah                                                                        | Level | Hasil          |
| :-------------- | :------------------- | :------------------------------------------------------------------------------------------ | :---- | :------------- |
| AC-F2.1–AC-F2.9 | Production / Preview | Pengujian terautentikasi kelola tautan, direct redirect, galeri gambar, dan pembatasan role | E4    | Menunggu rilis |

## 3. QA sign-off dan keputusan rilis

| Item               | Isi                                                                          |
| :----------------- | :--------------------------------------------------------------------------- |
| QA sign-off        | Menunggu pengujian siklus uji rilis                                          |
| Keputusan rilis PO | Menunggu verifikasi staging / preview                                        |
| Gap yang diterima  | Tidak ada gap yang diizinkan                                                 |
| Rollback plan      | Revert commit PR di Git; migrasi down `task_links` jika belum ada dependensi |

## 4. Metrik sukses (dari problem.md)

| Metrik                            | Baseline        | Target                     | Hasil setelah rilis | Kapan diukur ulang      |
| :-------------------------------- | :-------------- | :------------------------- | :------------------ | :---------------------- |
| Akses referensi oleh Developer/QA | 0 (di luar app) | 1 klik langsung (tab baru) | Menunggu rilis      | Pasca deploy Production |
| Multi-tautan tersimpan            | 0               | Tidak terbatas per Feature | Menunggu rilis      | Pasca deploy Production |
| Galeri gambar & video embed       | 0               | Aktif di tahap PRD         | Menunggu rilis      | Pasca deploy Production |

## 5. Checklist penutupan

- [ ] Stage Tracker di [README.md](README.md) diperbarui
- [ ] `docs/features/FEATURE_CATALOG.md` diperbarui
- [ ] SSoT/ADR terdampak sudah sesuai implementasi
- [ ] `TODO.md` diperbarui
