# UI-WORKSPACE-REFRESH — Tahap 6: Release & Close

**Status:** Belum mulai
**Gerbang:** G6 — keputusan rilis oleh PO; label `owner-approved` oleh Owner untuk Tier 2
**Applicable Policy IDs:** AI-013, AI-020, RELEASE-001, RELEASE-002, DOC-003, DOC-005

## 1. Merge dan deploy

| Phase | PR           | Tier                              | File Tier 2      | Merge commit | Memicu deploy Production?        | Deployment ID / waktu |
| ----- | ------------ | --------------------------------- | ---------------- | ------------ | -------------------------------- | --------------------- |
| P1–P4 | Belum dibuat | Belum ditentukan dari path aktual | Belum ditentukan | —            | Tidak diizinkan dalam window ini | —                     |

Bila merge ke `main` otomatis men-deploy Production, catat di sini dan pastikan persetujuan deploy
tercakup (lihat ADR-029 butir 5).

## 2. Verifikasi di environment target

| AC    | Environment                | Observasi / perintah    | Level | Hasil       |
| ----- | -------------------------- | ----------------------- | ----- | ----------- |
| Semua | Local / Preview sesudah PR | Akan dicatat setelah G5 | E4    | Belum mulai |

## 3. QA sign-off dan keputusan rilis

| Item               | Isi                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------- |
| QA sign-off        | N/A untuk perubahan UI internal sampai proses rilis ditentukan dari scope aktual.     |
| Keputusan rilis PO | Belum mulai.                                                                          |
| Gap yang diterima  | Tidak ada.                                                                            |
| Rollback plan      | Revert phase/PR sebelum merge; tidak ada data rollback karena v1 tidak mengubah data. |

## 4. Metrik sukses (dari problem.md)

| Metrik | Baseline | Target | Hasil setelah rilis | Kapan diukur ulang |
| ------ | -------- | ------ | ------------------- | ------------------ |
|        |          |        |                     |                    |

## 5. Checklist penutupan

- [ ] Report di `docs/reports/<FEATURE-ID>_<YYYY-MM-DD>.md` memakai `AGENT_REPORT_TEMPLATE.md`
- [ ] Stage Tracker di [README.md](README.md) diperbarui
- [ ] `docs/features/FEATURE_CATALOG.md` diperbarui
- [ ] SSoT/ADR terdampak sudah sesuai implementasi
- [ ] `TODO.md` → Done dan dipindah ke arsip
- [ ] Follow-up/Bug tertaut, tidak dibiarkan di catatan bebas
