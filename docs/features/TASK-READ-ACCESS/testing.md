# TASK-READ-ACCESS — Tahap 5: Test & Review

**Status:** Berjalan
**Gerbang:** G5 — verifier independen atau CI yang mencakup seluruh AC
**Applicable Policy IDs:** AI-003, AI-004, AI-008, AI-010, TEST-001, DOC-005, AUTH-013

## 1. Matriks AC → bukti

| AC   | Bukti                                                                                                                | Level | Status      |
| ---- | -------------------------------------------------------------------------------------------------------------------- | ----- | ----------- |
| AC-1 | `taskReadAccessIntegration.test.ts`: dev/qa tanpa akses → 403 `FORBIDDEN` pada enam route, untuk Feature dan Subtask | E3    | Lulus lokal |
| AC-2 | Test yang sama: pemegang Subtask → 200 pada Feature dan Subtask saudara; isi tautan terbaca                          | E3    | Lulus lokal |
| AC-3 | Test yang sama: PO dan pelapor → 200                                                                                 | E3    | Lulus lokal |
| AC-4 | Test yang sama: GET comments 200 untuk anggota tanpa akses task                                                      | E3    | Lulus lokal |
| AC-5 | Test yang sama: task di luar Workspace → 404; `taskLinksIntegration.test.ts` tetap lulus                             | E3    | Lulus lokal |
| AC-6 | Phase 2                                                                                                              | E3    | Belum mulai |

## 2. Outcome pemeriksaan

PostgreSQL 16 disposable, 81 migrasi kanonikal, Node 22 (repo menetapkan Node 24; CI menjadi bukti
pada versi yang benar). Perintah dan hitungan lulus/gagal dicatat pada deskripsi PR Phase 1.
Fixture `taskLinksIntegration.test.ts` diubah: QA kini memegang Subtask QA, karena ekspektasi lama
"QA mana pun membaca tautan" bertentangan dengan `AUTH-013` yang disetujui Owner.

## 3. Bukti UI (bila UI berubah)

Tidak ada perubahan UI.

## 4. Quality review (AI-010)

- Reuse: aturan `assertCanAccessTask` dipakai ulang; duplikasi query di `getTaskImpl` dihapus.
- Perilaku tumpang tindih: `testManagementService` masih menghitung akses sendiri; disatukan pada
  Phase 2.
- Kode usang: tidak ada yang ditemukan pada file yang disentuh.
- Dokumentasi: ADR-043, `AUTH-013`, Architecture §5, folder ini.

## 5. Hasil verifier

Belum ada verifier independen. Smoke Production (akun QA tanpa penugasan menerima 403 pada route
Phase 1) dijalankan setelah merge.
