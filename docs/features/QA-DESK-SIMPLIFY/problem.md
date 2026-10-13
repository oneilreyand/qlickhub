# QA-DESK-SIMPLIFY — Tahap 0: Problem Statement

**Status:** Menunggu persetujuan
**Gerbang:** G0 — disetujui oleh PO/Owner
**Applicable Policy IDs:** SDLC-001, FLOW-005, QA-001, RELEASE-002

## 1. Masalah

QA tidak bisa memulai pengujian pada Feature yang belum disiapkan sempurna oleh PO. Tombol yang
ditawarkan ("Aktifkan", "Tetapkan Versi Uji") gagal dengan 403/409 tanpa penjelasan, test case tidak
bisa dihapus atau diedit setelah aktif, dan baseline kesiapan hanya bisa dibuat manual oleh PO setelah
review Dev dan QA tercatat.

## 2. Bukti masalah

| Bukti                                                                                                                                     | Sumber                                                                                                                       | Level |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----- |
| QA klik "Aktifkan" → `PATCH /test-cases/:id` 403; `assertCanUpdateTestCase` hanya mengizinkan draft→active bila scope QA Subtask terbukti | Screenshot Owner 12 Okt; `apps/api/src/policies/testManagementPolicy.ts` (main `221fa0a`)                                    | E1    |
| `createQaTestCycle` melempar 409 bila Feature belum punya baseline, padahal baseline hanya bisa dibuat owner/admin/po                     | `testManagementService.ts`; `featureReadinessRoutes.ts` (main `221fa0a`)                                                     | E1    |
| Pembuatan baseline manual ditolak 409 kecuali review Dev **dan** QA terbaru berstatus siap                                                | `featureReadinessService.ts` baris 171–178 (main `221fa0a`): "Latest Development and QA readiness inputs must both be ready" | E1    |
| Tidak ada route DELETE test case                                                                                                          | `apps/api/src/modules/testManagement/testManagementRoutes.ts` (main `221fa0a`)                                               | E1    |
| QA hanya boleh mengubah definisi test case berstatus draft                                                                                | ADR-015 butir 4; `testManagementPolicy.ts`                                                                                   | E1    |
| e2e QA lulus karena seed menulis baseline, test case `active`, dan test cycle langsung ke DB, jadi jalur nyata QA tidak pernah diuji      | `apps/web/e2e/support/qaDeskFlowSeed.ts`; audit e2e di "qa-drawer-simplify-agy-prompts.md" (12 Okt)                          | E1    |
| Keputusan Owner D1–D5 (12 Okt) dan K1 (baseline otomatis) sudah diambil, lalu diimplementasikan AGY di branch `feat/qa-desk-backend-b1`   | "qa-drawer-simplify-agy-prompts.md"; dokumen "Audit Produk qlickhub — Peluang Enhancement", bagian Keputusan Owner           | E1    |

Perilaku runtime branch AGY (B0/B1) diuji ulang di Tahap 5 pada PostgreSQL disposable (E3).

## 3. Siapa yang terdampak

| Role | Situasi                                                  | Seberapa sering             | Dampak                                                |
| ---- | -------------------------------------------------------- | --------------------------- | ----------------------------------------------------- |
| QA   | Membuat dan menjalankan test case di subtask QA miliknya | Setiap Feature              | Terhenti di 403/409; menunggu PO tanpa tahu sebabnya  |
| QA   | Salah membuat test case atau perlu mengoreksi langkah    | Sering, sebelum run pertama | Tidak bisa hapus/edit; test case sampah ikut dihitung |
| PO   | Harus membuat baseline manual setelah review Dev dan QA  | Setiap Feature              | Satu langkah administratif yang sering terlewat       |
| Dev  | Menunggu QA mulai menguji                                | Setiap handoff              | Siklus umpan balik lebih lambat                       |

## 4. Bila tidak dikerjakan

QA tetap bergantung pada PO untuk langkah administratif, alur QA sungguhan tidak tercakup e2e, dan
dua branch AGY (B0/B1) yang sudah berisi kode tetap tidak bisa di-merge karena CI `sdlc:check`
menolaknya dan policy di SSoT bertentangan dengan kodenya.

## 5. Metrik sukses

| Metrik                                                                 | Baseline saat ini        | Target                           | Cara mengukur                     |
| ---------------------------------------------------------------------- | ------------------------ | -------------------------------- | --------------------------------- |
| QA membuat test case di scope subtask-nya lalu langsung menjalankannya | Gagal (403) tanpa PO     | Berhasil tanpa langkah PO        | Integration test PostgreSQL (E3)  |
| Feature dengan Brief disetujui + Requirement/AC lengkap punya baseline | Hanya bila PO membuatnya | Otomatis                         | Integration test PostgreSQL (E3)  |
| QA menghapus test case yang belum pernah dijalankan                    | Tidak mungkin            | 204; ditolak 409 setelah ada run | Integration test PostgreSQL (E3)  |
| Respons 4xx tanpa pesan yang bisa ditindaklanjuti di alur QA normal    | `unknown`                | 0                                | Integration test + e2e (Phase UI) |

## 6. Batasan dan di luar scope

- Perubahan UI drawer QA (Prompt A dan C) — ditangani Feature/phase terpisah setelah backend ini.
- Gate rilis `unverified_bugs` (A2) — ada di RELEASE-DEADLOCK-A1-A2 Phase 2.
- Menjalankan migrasi 087/088 ke Production — stop condition `AI-013`, butuh persetujuan terpisah.

## 7. Unknown

| Pertanyaan                                                                                   | Mengapa penting                                  | Siapa bisa menjawab               |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------ | --------------------------------- |
| Siapa yang dicatat sebagai `established_by` baseline hasil backfill 087?                     | ADR-013 butir 6 melarang identitas hasil tebakan | Owner (D6)                        |
| Apakah baseline otomatis boleh dipicu oleh aksi role non-Planner (mis. Dev membuat subtask)? | ADR-013 butir 1 menyebut Planner yang menetapkan | Owner (D7)                        |
| Berapa Feature di Production yang akan mendapat baseline dari backfill 087?                  | Ukuran dampak migrasi                            | Data Production (read-only query) |
