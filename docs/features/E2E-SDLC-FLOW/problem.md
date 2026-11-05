# E2E-SDLC-FLOW — Tahap 0: Problem Statement

**Status:** Disetujui
**Gerbang:** G0 — disetujui oleh PO/Owner
**Applicable Policy IDs:** SDLC-001, QA-004, QA-008, RELEASE-001

## 1. Masalah

Satu Feature tidak bisa berjalan dari ide PO sampai Keputusan Rilis di Production: QA tidak dapat
membuat Test Case, kartu Tugas Saya membuka halaman yang ditolak, retest Bug bisa macet, dan PO tidak
punya tombol Keputusan Rilis.

## 2. Bukti masalah

| Bukti                                                                                                 | Sumber                                                          | Level |
| ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ----- |
| Tombol "+ Test Case" dan "Impor spreadsheet" tidak muncul untuk QA (role global `dev`)                | Production, Feature "Fitur Pendaftaran Pasien", 2026-11-05      | E4    |
| "Buka pekerjaan" pada Tinjau Subtask → "Pekerjaan ini tidak dapat dibuka" (403)                       | Production, network browser                                     | E4    |
| Retest: Result dan Retest Attempt dua panggilan terpisah                                              | `TestCaseRunPage.tsx:291-299`, `bugService.ts:700` @ `51f9244`  | E1    |
| Panel rilis hanya dipasang `mode="qa"`                                                                | `QaSubtaskWorkSection.tsx:394-399` @ `51f9244`                  | E1    |
| Editor Brief di halaman Feature tanpa status; QA tidak bisa memulai siklus uji tanpa Brief disetujui  | E2E lewat UI, 2026-11-05 (409 baseline)                         | E3    |
| Halaman QA tanpa aksi menyelesaikan subtask QA; subtask Developer `in_review` tidak bisa disetujui QA | E2E lewat UI, 2026-11-05 (400 "Cannot mark QA subtask as Done") | E3    |

Audit lengkap (15 temuan) ada di rencana
[Rencana Perbaikan Alur E2E SDLC](https://claude.ai/artifact/3rFeHzyrUqqc2Cq6nhP2NC).

## 3. Siapa yang terdampak

| Role          | Situasi                                    | Seberapa sering | Dampak                         |
| ------------- | ------------------------------------------ | --------------- | ------------------------------ |
| QA            | Menyiapkan dan menjalankan uji, retest Bug | Setiap Feature  | Tidak bisa menguji sama sekali |
| Developer     | Menerima Bug dan menyerahkan perbaikan     | Setiap Bug      | Retest bisa macet permanen     |
| PO            | Menyetujui Brief dan memutuskan rilis      | Setiap Feature  | Tidak ada jalur rilis di UI    |
| Owner / Admin | Memantau Feature yang tidak pernah selesai | Mingguan        | Data delivery tidak akurat     |

## 4. Bila tidak dikerjakan

Alur SDLC hanya berjalan lewat API atau data yang disunting manual; Feature tidak pernah mencapai
Keputusan Rilis dan bukti QA tidak dapat dipercaya.

## 5. Metrik sukses

| Metrik                                                  | Baseline saat ini | Target | Cara mengukur                         |
| ------------------------------------------------------- | ----------------- | ------ | ------------------------------------- |
| Langkah alur PO → QA → Bug → rilis yang bisa lewat UI   | 0 dari 9          | 9      | Playwright `e2e-sdlc-flow.spec.ts`    |
| Kartu Tugas Saya yang berujung 403/"tidak dapat dibuka" | ada (E4)          | 0      | E2E langkah 9 + observasi Production  |
| Retest yang macet karena attempt tidak tercatat         | mungkin           | 0      | Test PostgreSQL retest satu transaksi |

## 6. Batasan dan di luar scope

- Bug dari pengguna akhir dan SLA (program BUG_INTAKE_SLA).
- Notifikasi in-app yang membuka halaman Bug (butuh kolom baru; follow-up).
- Klaim terbuka QA untuk Feature tanpa subtask QA (K5 = tidak ditampilkan).

## 7. Unknown

| Pertanyaan                                         | Mengapa penting             | Siapa bisa menjawab                 |
| -------------------------------------------------- | --------------------------- | ----------------------------------- |
| Apakah kode `REQ-<uuid>` dipakai di luar Qlick Hub | Migrasi mengganti kode (K4) | Owner — dijawab: tidak, ganti semua |
