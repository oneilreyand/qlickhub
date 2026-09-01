# UAT-ROLE-EVIDENCE Laporan Eksekusi Fitur — 2026-08-29

- **Pelaksana:** Codex (Senior PM UAT)
- **Tanggal:** 2026-08-29
- **Status:** Done — UAT production ditutup setelah retest formal evidence pada 2026-08-31.
- **Referensi Task:** TODO.md — UAT-ROLE-EVIDENCE

## 1. Ringkasan Perubahan

UAT Production dilakukan pada Workspace terisolasi `Qlick Hub Production Validation` dengan record berawalan `UAT-2026-08-29`. Pengujian memakai akun Owner, PO, Developer, dan QA yang sudah menjadi anggota Workspace. Tidak ada data pelanggan atau kredensial produksi pengguna yang digunakan.

### Hasil per role

| Role           | Skenario                                                                                                                                   | Hasil                       |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------- |
| Owner          | Memeriksa empat anggota dan pembagian role/specialty Workspace.                                                                            | PASS                        |
| PO             | Membuat Feature `690d7402`, Requirement `REF-KO5K659`, dan dua subtask (Frontend & QA).                                                    | PASS                        |
| Developer      | Melihat parent Feature sebagai read-only, membuka subtask QA, memulai subtask Frontend (`To Do` → `In Progress`), dan melihat evidence QA. | PASS                        |
| QA             | Mengajukan `UAT-EVID-001` untuk review, menjalankan Test Run, dan merekam Result `Passed` dengan evidence formal image/video.              | PASS (retest 2026-08-31)    |
| PO & Developer | Membuka subtask QA, melihat image preview, memperbesar gambar, dan melihat YouTube player tertanam.                                        | PASS untuk evidence diskusi |

### Evidence yang dibuat dan terbukti persisten

- Feature: `UAT-2026-08-29 Evidence Review Feature` (Task ID `690d7402`)
- Requirement: `UAT-2026-08-29 QA evidence links are visible in-app` (`REF-KO5K659`)
- QA Test Case: `UAT-2026-08-29 Verify image and video evidence preview` (`UAT-EVID-001`, Active)
- Formal Test Run: `uat-prod-2026-08-31.1` pada environment `production-uat`, Result `Passed`.
- Formal Test Result Evidence: `Production UAT image evidence` dan `Production UAT video evidence`.
- QA discussion evidence: image Cloudinary dan video YouTube publik. Keduanya tampil di Qlick Hub sebagai image preview dan embedded video player, lalu dibuka oleh Developer serta PO.

## 2. Berkas yang Diubah / Dibuat

- `[NEW]` `docs/reports/UAT_ROLE_EVIDENCE_2026-08-29.md`
- `[MODIFY]` `TODO.md`

## 3. Bukti Verifikasi Pengujian (Test Evidence)

- **Production browser UAT:** PASS untuk Owner membership, PO planning, Developer execution/read-only boundary, QA Test Case drafting, serta visibility image/video discussion evidence oleh Developer dan PO.
- **Authorization observation:** Developer menerima pesan `Read-only task` pada parent Feature; hanya PO/Admin/Owner yang dapat memperbarui parent task.
- **PO empty state desktop:** PASS untuk bucket `No requirement work` dan `No release decisions`; keduanya menampilkan image dengan accessible name yang sesuai. `No timeline work` tidak dapat menjadi kosong dalam Workspace UAT karena Feature tanpa jadwal dengan benar diprioritaskan sebagai satu Timeline work item.
- **Production health:** `GET https://qlickhub.vercel.app/v1/health` mengembalikan `200` dengan database `connected` pada saat UAT.
- **Perintah lokal:** `git diff --check` — dijalankan setelah dokumentasi UAT.

### Retest formal evidence — 2026-08-31

- **QA:** mengubah Test Case `UAT-EVID-001` dari `draft` ke `in_review` melalui aksi Submit for Review.
- **PO:** melihat Test Case read-only dan mengubahnya dari `in_review` ke `active` melalui aksi Activate Test Case.
- **QA:** membuat Test Run `uat-prod-2026-08-31.1` lalu merekam Result immutable `Passed` dengan dua Evidence Link formal: satu Cloudinary image dan satu YouTube video.
- **Developer & PO:** membuka record `Result Evidence (2)` dari aplikasi production. Keduanya melihat kartu image external-link yang dapat dibuka dan kartu YouTube berstatus `Preview Ready`.

## 4. Catatan Khusus & Handoff

### Resolved release blocker: formal evidence QA

Kebutuhan utama pengguna terpenuhi pada retest 2026-08-31: QA dapat melampirkan evidence gambar/video sebagai Test Result formal yang immutable, dan Developer serta PO dapat membukanya di aplikasi.

Tidak ada tindakan lanjutan untuk blocker ini. Evidence Discussion terdahulu tetap ada sebagai konteks kolaborasi, sedangkan bukti keputusan QA sekarang berada pada record Test Result formal.

### Temuan UX non-blocking

Mutation PO (requirement/subtask) dan QA (test case) telah persisten, tetapi UI beberapa kali tetap disabled/loading sekitar 3–7 detik sebelum data muncul kembali. Tidak ada feedback progres yang jelas selama periode tersebut. Perlu ditelusuri sebagai masalah loading/refresh agar pengguna tidak mengira submit gagal atau menekan ulang.
