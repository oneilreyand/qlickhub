# FEATURE-REFERENCES-MEDIA — Tahap 0: Problem Statement

**Status:** Menunggu persetujuan
**Gerbang:** G0 — disetujui oleh PO/Owner
**Applicable Policy IDs:** SDLC-001, DOC-005, AUTH-001, AUTH-002, DATA-001

## 1. Masalah

Saat ini pada halaman Feature (khususnya tahap PRD), Product Owner (PO) tidak memiliki wadah terstruktur untuk menyematkan referensi produk seperti banyak tautan eksternal (Figma desain, Google Docs spesifikasi, spreadsheet riset, video penjelasan YouTube/Loom), maupun galeri gambar mockup. Tautan yang diletakkan di dalam deskripsi teks biasa seringkali sulit ditemukan, tidak menyediakan pratinjau yang jelas, dan tidak memiliki penataan urutan, sedangkan Developer dan QA yang bekerja pada subtask membutuhkan akses cepat satu klik (_direct redirect_) ke referensi tersebut tanpa harus mencari di pesan atau dokumen terpisah.

## 2. Bukti masalah

| Bukti                                                                                                                     | Sumber                                                                               | Level |
| ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ----- |
| `FeaturePrdSummary` hanya merender Product Brief (teks markdown) dan daftar Requirement tanpa bagian referensi atau media | `apps/web/src/components/ui/organisms/taskDetail/FeatureStagePanels.tsx:270`         | E1    |
| Komponen lampiran `TaskAttachmentsPanel.tsx` sudah ada namun belum dipasang di alur PRD halaman Feature                   | `apps/web/src/components/ui/organisms/taskDetail/TaskAttachmentsPanel.tsx:28`        | E1    |
| Belum ada tabel database untuk menyimpan banyak tautan terstruktur dengan tipe referensi dan urutan per Feature           | `docs/plans/QLICKHUB_FOLLOWUP_F1_F4_PLAN.md#f2--referensi--media-di-halaman-feature` | E1    |
| Endpoint metadata `GET /v1/meta/link-preview` sudah aktif namun belum diintegrasikan ke kartu referensi Feature           | `apps/api/src/modules/meta/metaRoutes.ts:75`                                         | E1    |

## 3. Siapa yang terdampak

| Role          | Situasi                                                                             | Seberapa sering             | Dampak                                                                |
| ------------- | ----------------------------------------------------------------------------------- | --------------------------- | --------------------------------------------------------------------- |
| PO            | Menyiapkan spesifikasi PRD dengan aset Figma, dokumen riset, dan video penjelasan   | Setiap pembuatan Feature    | Referensi tersebar di luar platform; tim pelaksana melewatkan konteks |
| Developer     | Mengimplementasikan subtask Feature yang membutuhkan acuan desain atau dokumen API  | Setiap pengerjaan subtask   | Harus mencari link Figma/dokumen di chat atau bertanya berulang kali  |
| QA            | Memvalidasi kesesuaian implementasi terhadap mockup desain atau alur uji pada video | Setiap siklus uji Test Case | Kurang bukti visual pembanding saat verifikasi perilaku aplikasi      |
| Owner / Admin | Memantau kelengkapan artefak Feature sebelum rilis                                  | Setiap review berkala       | Tidak ada visibilitas terpusat atas referensi produk                  |

## 4. Bila tidak dikerjakan

Komunikasi scope produk tetap tercerai-berai di luar platform. Potensi salah implementasi dan pengerjaan ulang (_rework_) meningkat karena Developer dan QA tidak memiliki satu pintu acuan referensi resmi yang diverifikasi oleh PO.

## 5. Metrik sukses

| Metrik                               | Baseline saat ini                  | Target                                       | Cara mengukur                 |
| ------------------------------------ | ---------------------------------- | -------------------------------------------- | ----------------------------- |
| Akses referensi oleh Developer/QA    | 0 (harus mencari di luar aplikasi) | 1 klik langsung (_direct redirect_ tab baru) | Pengujian fungsional UI & E2E |
| Dukungan multi-tautan terstruktur    | 0 tautan terstruktur               | Tidak dibatasi (disortir berdasarkan urutan) | Integration test PostgreSQL   |
| Dukungan galeri gambar & video embed | 0 galeri di tahap PRD              | Galeri responsif + inline YouTube embed      | Uji visual desktop & mobile   |

## 6. Batasan dan di luar scope

- Unggah langsung file video ke cloud storage backend berada di luar scope fase ini; video didukung melalui tautan eksternal (YouTube dengan inline embed, Loom, Google Drive).
- Peran Developer dan QA tidak diizinkan menambah, mengubah, atau menghapus tautan dan media (hak akses hanya baca).

## 7. Unknown

Tidak ada unknown terbuka. Keputusan hak akses (K2) telah ditetapkan eksplisit oleh Owner: hanya Owner, Admin, dan PO yang berhak mengelola tautan dan media, sedangkan Developer dan QA bersifat _view-only_.
