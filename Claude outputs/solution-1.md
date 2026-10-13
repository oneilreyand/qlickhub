# RELEASE-DEADLOCK-A1-A2 — Tahap 1: Opsi Solusi (Decision Snapshot)

**Status:** Menunggu persetujuan
**Gerbang:** G1 — disetujui oleh Owner
**Problem:** [problem.md](problem.md)
**ADR:** A1 tidak perlu ADR (memulihkan perilaku yang sudah tertulis di Workflow §7). A2 mengubah RELEASE-001 → ADR baru dengan nomor berikutnya yang kosong di `main` saat PR dibuat.
**Applicable Policy IDs:** AI-006, RELEASE-001, RELEASE-002, RELEASE-003, SDLC-001

## 1. Kondisi sekarang

- `createQaSignOff` (releaseDecisionService.ts:217) mewajibkan QA Subtask `done` dan menjalankan gate bukti penuh sebelum membaca `decision`.
- `createReleaseDecision` (baris 559) menjalankan gate bukti lagi untuk semua keputusan PO.
- `evaluateReadinessGates` memakai `bugs.criticalOrHighUnverified`; snapshot V2 sudah memuat `bugs.total` dan `bugs.verified`.

## 2. Opsi untuk A1 (sign-off Tolak)

|                | Opsi A (rekomendasi)                                                                                                                                                    | Opsi B                                                 | Opsi 0: tidak dikerjakan |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------ |
| Ringkasan      | Gate bukti dan syarat Subtask `done` hanya untuk `approved`. `rejected` wajib catatan, boleh saat QA Subtask `in_progress`, menyimpan snapshot beserta kode gate gagal. | Endpoint baru "QA blokir rilis" terpisah dari sign-off | Biarkan                  |
| Pro            | Sesuai Workflow §7; kontrak API tidak berubah; jejak audit memakai record yang sudah ada                                                                                | Pemisahan semantik jelas                               | —                        |
| Kontra         | Sign-off `rejected` bisa ada tanpa Subtask `done`                                                                                                                       | Kontrak, tabel, dan UI baru                            | Kebuntuan tetap          |
| Lapisan        | API (+ UI minor bila form disembunyikan saat Subtask belum `done`)                                                                                                      | API, DB, UI                                            | —                        |
| Data / migrasi | Tidak ada                                                                                                                                                               | Tabel baru                                             | —                        |
| Estimasi WRA   | 5/16                                                                                                                                                                    | 10/16                                                  | —                        |

PO atas sign-off `rejected`: gate bukti tetap dijalankan hanya untuk Release Decision `approved`
(RELEASE-003: override bisnis tidak boleh melewati integritas bukti). Release Decision `rejected`
tidak menjalankan gate bukti.

## 3. Opsi untuk A2 (gate bug PO, keputusan K2)

|              | Opsi A (rekomendasi)                                                                                                                                                             | Opsi B                                              | Opsi 0                |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | --------------------- |
| Ringkasan    | Kode gate baru `unverified_bugs` (semua severity, dihitung dari `bugs.total - bugs.verified`) untuk snapshot baru; `critical_high_bugs` tetap di enum agar snapshot lama terbaca | Ubah arti `critical_high_bugs` diam-diam            | Biarkan Critical/High |
| Pro          | Riwayat snapshot tetap jujur; perubahan kontrak additive                                                                                                                         | Tanpa perubahan enum                                | —                     |
| Kontra       | Enum kontrak bertambah satu nilai; label UI perlu diperbarui                                                                                                                     | Label lama menyesatkan; data historis berubah makna | Tidak sesuai K2       |
| Estimasi WRA | 6/16                                                                                                                                                                             | 5/16                                                | —                     |

## 4. Rekomendasi

A1 Opsi A + A2 Opsi A, dikerjakan sebagai dua phase. A1 duluan karena membuka kebuntuan tanpa
perubahan policy.

## 5. Keputusan yang dibutuhkan

- **D1:** Sign-off `rejected` boleh dicatat saat QA Subtask `in_progress` dan Subtask tetap `in_progress` (rekomendasi: ya).
- **D2:** PO tidak dapat `approved` (override) bila gate bukti gagal; boleh `rejected` (rekomendasi: ya, sesuai RELEASE-003).
- **D3:** A2 memakai kode gate baru `unverified_bugs` (rekomendasi: ya).

## 6. Keputusan

**Dipilih:** menunggu G1.
