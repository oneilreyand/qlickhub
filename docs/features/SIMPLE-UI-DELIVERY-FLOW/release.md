# SIMPLE-UI-DELIVERY-FLOW — Tahap 6: Release & Close

**Status:** Belum mulai | Menunggu keputusan | Released | Ditolak | Closed
**Gerbang:** G6 — keputusan rilis oleh PO; label `owner-approved` oleh Owner untuk Tier 2
**Applicable Policy IDs:** AI-013, AI-020, RELEASE-001, RELEASE-002, DOC-003, TBD

## 1. Merge dan deploy

| Phase | PR  | Tier  | File Tier 2 | Merge commit | Memicu deploy Production? | Deployment ID / waktu |
| ----- | --- | ----- | ----------- | ------------ | ------------------------- | --------------------- |
| P1    |     | 1 / 2 |             |              | ya / tidak                |                       |

Bila merge ke `main` otomatis men-deploy Production, catat di sini dan pastikan persetujuan deploy
tercakup (lihat ADR-029 butir 5).

P5d-2: merge runtime ke `main` memicu deployment Production melalui Git integration. Approval
Window awal mengecualikan deployment. Owner kemudian menyetujui **auto-merge PR #96 dan deploy
Production setelah seluruh CI hijau** (chat, 2026-11-03). Tidak termasuk Apply/mutasi data Production.
Hasil tes/review, batas verifikasi, rollback dan status fase ada di [PHASE-05d2](phases/PHASE-05d2.md).

## 2. Verifikasi di environment target

| AC     | Environment          | Observasi / perintah | Level | Hasil |
| ------ | -------------------- | -------------------- | ----- | ----- |
| AC-1.1 | Production / Preview |                      | E4    |       |

## 3. QA sign-off dan keputusan rilis

| Item               | Isi                          |
| ------------------ | ---------------------------- |
| QA sign-off        | <link record / tanggal>      |
| Keputusan rilis PO | approved / rejected — alasan |
| Gap yang diterima  | <daftar + siapa menyetujui>  |
| Rollback plan      | <cara + siapa>               |

### P5d-1 — gap yang diterima Owner, 2026-11-02

Owner memilih **"Lengkapi konteks AI; terima duplikasi sementara"** di chat. Persetujuan ini
menerima sementara duplikasi predicate kecocokan role/specialty assignee antara AI draft dan
penugasan manual, yang saat review setara untuk kandidat Developer/QA. Tidak menerima gap
konteks prompt: gap tersebut harus diperbaiki dan diuji sebelum kandidat fase diterima.

Definisi gap, hasil reviewer, bukti perbaikan, dan tindak lanjut berada di
[PHASE-05d1 §4](phases/PHASE-05d1.md#4-verifikasi-lanjutan-2026-11-02).
Ekstraksi predicate bersama memerlukan scope/path baru karena menyentuh `taskLifecycle`;
tidak dilakukan dalam P5d-1. Risiko pemeliharaan: dua predicate dapat berbeda saat aturan
penugasan berubah, sehingga perubahan selanjutnya harus memeriksa keduanya.

Ini penerimaan gap fase, bukan rilis seluruh Feature. PR #95 tetap Tier 2 karena
`packages/contracts/package.json`; label `owner-approved` harus dipasang sendiri oleh Owner
setelah gate selesai, dan agent tidak mengubah label. Belum ada klaim merge atau deploy.

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
