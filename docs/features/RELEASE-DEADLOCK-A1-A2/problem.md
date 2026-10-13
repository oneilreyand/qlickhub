# RELEASE-DEADLOCK-A1-A2 — Tahap 0: Problem Statement

**Status:** Disetujui
**Gerbang:** G0 — disetujui oleh PO/Owner
**Applicable Policy IDs:** SDLC-001, RELEASE-001, RELEASE-002, RELEASE-003, QA-004

## 1. Masalah

Jalur rilis bisa macet tanpa jalan keluar di aplikasi. Saat kualitas Feature belum memenuhi syarat
(ada test gagal atau bug belum terverifikasi), QA tidak bisa mencatat sign-off **Tolak**, sehingga PO
tidak pernah menerima sinyal resmi dan tidak bisa membuat keputusan rilis. Selain itu gate rilis yang
dilihat PO hanya menghitung bug Critical/High, sedangkan keputusan Owner K2 (12 Okt) menyatakan semua
severity memblokir.

## 2. Bukti masalah

| Bukti                                                                                                                                                           | Sumber                                                                                           | Level |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ----- |
| `createQaSignOff` menjalankan `assertQaCompletionGate` untuk semua keputusan, sebelum `decision` dipakai; gate gagal → 409, termasuk untuk keputusan `rejected` | `apps/api/src/modules/releaseDecisions/releaseDecisionService.ts` baris 258–265 (main `7231db8`) | E1    |
| Sign-off mensyaratkan QA Subtask berstatus `done`, padahal status `done` sendiri mensyaratkan gate yang sama lulus                                              | `releaseDecisionService.ts` baris 241–255; `taskLifecycle.ts` baris 681                          | E1    |
| SSoT mengizinkan QA "Menolak / Catat Rekomendasi Blokir" ketika kualitas tidak memenuhi syarat                                                                  | `docs/2_WORKFLOW_AND_ROLES.md` §7 diagram `QABlock`                                              | E1    |
| Gate PO `critical_high_bugs` hanya menghitung severity critical/high                                                                                            | `readinessGateEvaluator.ts` baris 42–68; `releaseDecisionService.ts` baris 1067                  | E1    |
| Gate penyelesaian QA memblokir bug semua severity                                                                                                               | `qaEvidenceCompletionGate.ts` (tidak ada filter severity)                                        | E1    |
| Keputusan Owner K2: semua severity memblokir; A1 wajib diperbaiki                                                                                               | Dokumen "Audit Produk qlickhub — Peluang Enhancement", bagian Keputusan Owner                    | E1    |
| UI sudah menyediakan pilihan "Tolak", jadi kegagalan terjadi di backend                                                                                         | `apps/web/src/components/ui/organisms/ReleaseAssurancePanel.tsx` baris 857–858                   | E1    |

Perilaku runtime (409 pada penolakan dengan gate gagal) belum direproduksi lewat test; akan dibuktikan
di Tahap 5 dengan integration test (E3).

## 3. Siapa yang terdampak

| Role      | Situasi                                          | Seberapa sering               | Dampak                                                  |
| --------- | ------------------------------------------------ | ----------------------------- | ------------------------------------------------------- |
| QA        | Menemukan kualitas belum layak dan ingin menolak | Setiap Feature yang gagal uji | Tidak bisa mencatat penolakan; hanya bisa menunggu      |
| PO        | Menunggu sinyal QA untuk memutuskan rilis        | Setiap Feature yang gagal uji | Feature macet di antrean tanpa keputusan                |
| Developer | Butuh umpan balik resmi untuk perbaikan          | Setiap penolakan              | Tidak ada catatan penolakan yang menjelaskan gate gagal |

## 4. Bila tidak dikerjakan

Feature dengan kualitas buruk tidak punya jalur resmi kembali ke Delivery; penolakan hanya terjadi lewat
chat di luar aplikasi sehingga jejak audit hilang. Tampilan gate PO juga tidak sesuai keputusan K2.

## 5. Metrik sukses

| Metrik                                                                   | Baseline saat ini                         | Target                                 | Cara mengukur                          |
| ------------------------------------------------------------------------ | ----------------------------------------- | -------------------------------------- | -------------------------------------- |
| Sign-off `rejected` dengan gate bukti gagal                              | Ditolak (409), unverified runtime         | Tersimpan (201) dengan kode gate gagal | Integration test PostgreSQL            |
| PO dapat mencatat Release Decision `rejected` atas sign-off yang ditolak | Tidak mungkin (sign-off tidak pernah ada) | Tersimpan (201)                        | Integration test PostgreSQL            |
| Gate PO menghitung bug semua severity                                    | Hanya Critical/High                       | Semua bug belum `verified`             | Unit test evaluator + integration test |

## 6. Batasan dan di luar scope

- Tidak menggabungkan "QA selesai" dan Sign-off (K4) — itu paket terpisah.
- Tidak mengubah gate bukti QA (`qaEvidenceCompletionGate.ts`), yang juga sedang diubah di branch AGY `feat/qa-desk-backend-b1`.
- Tidak mengubah alur baseline (A3/K1, branch AGY `feat/readiness-auto-baseline`).

## 7. Unknown

| Pertanyaan                                                                           | Mengapa penting                                         | Siapa bisa menjawab                          |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------- | -------------------------------------------- |
| Apakah QA Subtask harus tetap `in_progress` setelah sign-off Tolak?                  | Menentukan antrean QA berikutnya                        | Terjawab: ya (D1, Owner 2026-10-13)          |
| Apakah PO boleh menyetujui (override) sign-off yang ditolak ketika gate bukti gagal? | RELEASE-003 melarang override melewati integritas bukti | Terjawab: tidak boleh (D2, Owner 2026-10-13) |
