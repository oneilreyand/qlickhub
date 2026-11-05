# E2E-SDLC-FLOW — Tahap 1: Opsi Solusi (Decision Snapshot)

**Status:** Disetujui
**Gerbang:** G1 — disetujui oleh Owner
**Problem:** [problem.md](problem.md)
**ADR:** [ADR-041](../../adr/ADR-041-QA-READINESS-PER-REQUIREMENT-AND-SERVER-SIDE-QA-FLOW.md)
**Applicable Policy IDs:** AI-006, SDLC-001, QA-010

Format mengikuti Decision Snapshot di `docs/4_AGENT_DEV_GUIDELINES.md` §2A.E; dokumen ini tidak
mengubah aturan tersebut.

## 1. Kondisi sekarang

- Web memakai `selectCurrentUserRole` (role global); API memakai `requireWorkspaceMember` (role
  Workspace).
- `useDeveloperReadiness` menghitung kesiapan di browser per Feature; API tidak menjaga.
- `my-work-queue` mengirim item Tinjau Subtask untuk Feature yang subtask-nya tidak boleh dibuka QA.
- Retest: `recordTestResult` lalu `createRetestAttempt` (dua panggilan).
- `createQaTestCycle` tidak menutup siklus lama.
- Kode Requirement hasil Apply: `REQ-<uuid>` (`aiTaskDraftPersistence.ts`).

## 2. Opsi

|                              | Opsi A: perbaiki akar di server + layar menyusul          | Opsi B: tambal tiap layar                   | Opsi 0: tidak dikerjakan |
| ---------------------------- | --------------------------------------------------------- | ------------------------------------------- | ------------------------ |
| Ringkasan                    | Role Workspace, gerbang/retest/siklus di API, kartu jujur | Ganti teks/tombol per halaman               | Biarkan seperti sekarang |
| Pro                          | Satu sumber aturan; tidak bisa dilewati                   | Cepat                                       | Tanpa biaya              |
| Kontra                       | Menyentuh BE, FE, kontrak, migrasi                        | Aturan tetap di browser; retest tetap macet | Alur tetap putus         |
| Lapisan terdampak (FE/BE/DB) | FE, BE, DB (migrasi kode REQ)                             | FE                                          | —                        |
| Data / migrasi               | Satu migrasi rename kode, bisa di-`down`                  | —                                           | —                        |
| Authorization                | Tidak ada izin baru; UI mengikuti API                     | Tetap tidak sinkron                         | —                        |
| Shared contract              | `DeveloperReadiness`, field origin QA pada Bug            | —                                           | —                        |
| Estimasi WRA                 | 8/16 per phase                                            | 4/16                                        | —                        |
| Risiko & rollback            | Revert PR; `down` migrasi                                 | Revert PR                                   | —                        |

## 3. Rekomendasi

Opsi A, karena metrik sukses (9 dari 9 langkah lewat UI, 0 kartu buntu, 0 retest macet) hanya
tercapai bila aturan dijaga API.

## 4. Dampak policy

- [x] Mengubah policy → ADR-041 dibuat sebelum tahap 2; SSoT Workflow §5–§6 dan `QA-010` diperbarui

## 5. Keputusan

**Dipilih:** Opsi A — oleh reyand (Owner), 2026-11-05, chat "ok jalankan" dan "aku ingin jalannya
1 round semua", dengan K1 role Workspace, K2 per requirement, K3 siklus lama digantikan, K4 ganti
semua jadi REQ-001, K5 tidak ditampilkan.
**Ditolak:** Opsi B (aturan tetap bisa dilewati), Opsi 0 (alur tetap putus).
