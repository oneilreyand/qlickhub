# [FEATURE-ID] — Tahap 1: Opsi Solusi (Decision Snapshot)

**Status:** Draft | Menunggu persetujuan | Disetujui
**Gerbang:** G1 — disetujui oleh Owner
**Problem:** [problem.md](problem.md)
**ADR:** <link bila policy berubah, atau "Tidak perlu — alasan">
**Applicable Policy IDs:** AI-006, SDLC-001, TBD

Format mengikuti Decision Snapshot di `docs/4_AGENT_DEV_GUIDELINES.md` §2A.E; dokumen ini tidak
mengubah aturan tersebut.

## 1. Kondisi sekarang

<Bagaimana sistem bekerja saat ini — dengan link ke kode/route/kontrak yang benar-benar dibaca.>

## 2. Opsi

Minimal dua opsi nyata ditambah opsi "tidak dikerjakan".

| | Opsi A | Opsi B | Opsi 0: tidak dikerjakan |
| --- | --- | --- | --- |
| Ringkasan | | | Biarkan seperti sekarang |
| Pro | | | |
| Kontra | | | |
| Lapisan terdampak (FE/BE/DB) | | | — |
| Data / migrasi | | | — |
| Authorization | | | — |
| Shared contract | | | — |
| Estimasi WRA | /16 | /16 | — |
| Risiko & rollback | | | |

## 3. Rekomendasi

<Opsi yang direkomendasikan dan alasannya, dikaitkan ke metrik sukses di problem.md.>

## 4. Dampak policy

- [ ] Tidak mengubah policy → tidak perlu ADR
- [ ] Mengubah policy → ADR-<NNN> dibuat **sebelum** tahap 2, lalu SSoT terdampak diperbarui (`DOC-002`)

## 5. Keputusan

**Dipilih:** <Opsi …> — oleh <nama/role>, <tanggal>, referensi pesan/PR
**Ditolak:** <opsi lain + alasan singkat>
