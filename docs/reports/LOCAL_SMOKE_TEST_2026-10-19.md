# Smoke test lokal QA-DESK-SIMPLIFY dan RELEASE-DEADLOCK-A1-A2 — 2026-10-16 s/d 2026-10-19

**Environment:** lokal Owner (`localhost:3000` web Vite, `localhost:4000` API, PostgreSQL lokal
`qa_management_dev`, migrasi sampai 088), kode `main` `2894a62`.
**Pelaksana:** agen (Playwright di komputer Owner) atas permintaan Owner; akun tes lokal QA dan Owner.
**Level bukti:** E3 (persisted record lewat UI dan API terautentikasi di environment lokal). Ini **bukan**
bukti Production (E4).

## Hasil

| #   | Cek                                                                 | Feature / AC                                       | Observasi                                                                                                                                                                 | Hasil |
| --- | ------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 1   | Bug terbuka tanpa error                                             | migrasi 085/086                                    | Tab Bug Feature dan tab Bug & Retest meja QA tampil; `GET /bugs` 200; console 0 error                                                                                     | Pass  |
| 2   | Gate "Bug belum terverifikasi" di readiness                         | RELEASE-DEADLOCK AC-3.1                            | `GET /release-readiness` memuat gate `unverified_bugs`; quality gate meja QA menampilkan "Bug belum terverifikasi"; snapshot sign-off mencatat "Bug belum diverifikasi 0" | Pass  |
| 3   | Header `x-request-id`                                               | STRUCTURED-ERROR-LOG AC-5                          | `curl /v1/health` → `x-request-id: <uuid>`                                                                                                                                | Pass  |
| 4   | Meja QA menunggu Baseline sebelum Versi Uji                         | QA-DESK-AWAIT-BASELINE AC-5                        | Feature tanpa baseline: kartu "Menunggu Kesiapan Feature", tombol Tetapkan Versi Uji nonaktif                                                                             | Pass  |
| 5   | Brief dari generator AI bisa disetujui; baseline otomatis terbentuk | PRODUCT-BRIEF-SCOPE-ID AC-5; QA-DESK-SIMPLIFY AC-2 | Owner menyimpan Brief v2 `approved`; `qa-workflow-summary` berubah dari `await_baseline` ke `create_test_cycle`                                                           | Pass  |
| 6   | QA menetapkan Versi Uji dan menjalankan Test Case                   | QA-DESK-SIMPLIFY                                   | Versi `local-smoke-2026.10.19 · staging` tersimpan; run TC-0001 dimulai                                                                                                   | Pass  |
| 7   | Sign-off QA saat gate gagal hanya bisa Tolak                        | RELEASE-DEADLOCK AC-1.1                            | Opsi "Setujui" nonaktif; "Hanya penolakan yang dapat dicatat"                                                                                                             | Pass  |
| 8   | Tolak tanpa alasan ditolak                                          | RELEASE-DEADLOCK AC-1.1                            | "Keputusan tidak tercatat — Alasan penolakan wajib diisi"; tidak ada request ke server                                                                                    | Pass  |
| 9   | Tolak dengan alasan tersimpan                                       | RELEASE-DEADLOCK AC-1.1                            | `POST /qa-sign-offs` 201; riwayat menampilkan "Ditolak" beserta alasan                                                                                                    | Pass  |

## Tambahan 2026-10-19 (setelah PR #54)

Kode `main` `ba12fe5`. Lewat API terautentikasi dari sesi browser (QA, lalu Owner):

| #   | Cek                                                                    | Feature / AC            | Observasi                                                           | Hasil |
| --- | ---------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------- | ----- |
| 10  | QA membuat Test Case dengan `qaSubtaskId` langsung aktif               | QA-DESK-SIMPLIFY AC-3.1 | `POST /test-cases` 201, `status: active` (TC-0003)                  | Pass  |
| 11  | Test Case tanpa run bisa dihapus                                       | QA-DESK-SIMPLIFY AC-4.1 | `DELETE` TC-0003 dan TC-0002 → 204; `GET` setelahnya 404            | Pass  |
| 12  | Test Case dengan riwayat run tidak bisa dihapus                        | QA-DESK-SIMPLIFY AC-4.1 | `DELETE` TC-0001 → 409 "sudah memiliki riwayat eksekusi pengujian"  | Pass  |
| 13  | PO tidak bisa menyetujui rilis atas sign-off QA yang ditolak           | RELEASE-DEADLOCK AC-2.x | `POST /release-decisions` `approved` → 409 (bukti QA belum lengkap) | Pass  |
| 14  | PO bisa mencatat Keputusan Rilis `rejected` atas sign-off yang ditolak | RELEASE-DEADLOCK AC-2.x | `POST /release-decisions` `rejected` → 201                          | Pass  |

Temuan: form **Test Case Baru** di meja QA belum mengirim `qaSubtaskId` dan masih menyimpan `draft`
(TC-0002), sehingga AC-3.1 hanya tercapai lewat API. Ini sesuai scope QA-DESK-SIMPLIFY (UI di luar scope) dan
menjadi bagian Feature UI drawer QA lanjutan.

## Tidak diuji

- Hasil pengujian (Lulus/Gagal) tidak dicatat karena wajib bukti gambar/video nyata.
- Semua cek di Production (E4).

## Bug yang ditemukan

| Temuan                                                                                           | Tindak lanjut                                |
| ------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| Meja QA menawarkan Tetapkan Versi Uji sebelum baseline ada; 409 tampil sebagai "muat ulang"      | Diperbaiki — PR #51 (QA-DESK-AWAIT-BASELINE) |
| Brief dari generator AI menyimpan id scope non-UUID sehingga tidak bisa disimpan/disetujui (400) | Diperbaiki — PR #52 (PRODUCT-BRIEF-SCOPE-ID) |
| QA melihat tombol "Aktifkan Test Case" untuk Test Case berstatus Menunggu Review PO; server 403  | Belum — kandidat Quick Card berikutnya       |

## Data lokal yang berubah

Brief Feature 817e3fca v2 `approved` (Owner); Versi Uji `local-smoke-2026.10.19`; TC-0001 diaktifkan
(Owner); satu run TC-0001 dimulai tanpa hasil; satu QA Sign-off `rejected` permanen; satu Keputusan Rilis `rejected` (Owner); TC-0002 dan TC-0003 dibuat lalu dihapus.
