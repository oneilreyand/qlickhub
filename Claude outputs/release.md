# [FEATURE-ID] — Tahap 6: Release & Close

**Status:** Belum mulai | Menunggu keputusan | Released | Ditolak | Closed
**Gerbang:** G6 — keputusan rilis oleh PO; label `owner-approved` oleh Owner untuk Tier 2
**Applicable Policy IDs:** AI-013, AI-020, RELEASE-001, RELEASE-002, DOC-003, TBD

## 1. Merge dan deploy

| Phase | PR | Tier | File Tier 2 | Merge commit | Memicu deploy Production? | Deployment ID / waktu |
| --- | --- | --- | --- | --- | --- | --- |
| P1 | | 1 / 2 | | | ya / tidak | |

Bila merge ke `main` otomatis men-deploy Production, catat di sini dan pastikan persetujuan deploy
tercakup (lihat ADR-029 butir 5).

## 2. Verifikasi di environment target

| AC | Environment | Observasi / perintah | Level | Hasil |
| --- | --- | --- | --- | --- |
| AC-1.1 | Production / Preview | | E4 | |

## 3. QA sign-off dan keputusan rilis

| Item | Isi |
| --- | --- |
| QA sign-off | <link record / tanggal> |
| Keputusan rilis PO | approved / rejected — alasan |
| Gap yang diterima | <daftar + siapa menyetujui> |
| Rollback plan | <cara + siapa> |

## 4. Metrik sukses (dari problem.md)

| Metrik | Baseline | Target | Hasil setelah rilis | Kapan diukur ulang |
| --- | --- | --- | --- | --- |
| | | | | |

## 5. Checklist penutupan

- [ ] Report di `docs/reports/<FEATURE-ID>_<YYYY-MM-DD>.md` memakai `AGENT_REPORT_TEMPLATE.md`
- [ ] Stage Tracker di [README.md](README.md) diperbarui
- [ ] `docs/features/FEATURE_CATALOG.md` diperbarui
- [ ] SSoT/ADR terdampak sudah sesuai implementasi
- [ ] `TODO.md` → Done dan dipindah ke arsip
- [ ] Follow-up/Bug tertaut, tidak dibiarkan di catatan bebas
