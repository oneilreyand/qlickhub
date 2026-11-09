# FEATURE-REFERENCES-MEDIA — Tahap 1: Opsi Solusi

**Status:** Menunggu persetujuan
**Gerbang:** G1 — disetujui oleh Owner
**Applicable Policy IDs:** SDLC-001, DOC-005, AUTH-001, AUTH-002, DATA-001, UI-001, UI-002, UI-003, UI-004, UI-005

## 1. Pilihan Solusi

### Opsi A (Dipilih): Bagian Terstruktur "Referensi & Media" di Tahap PRD Feature

- Menambahkan satu bagian terintegrasi bernama **Referensi & Media** di tahap PRD halaman Feature, diletakkan tepat di bawah Product Brief.
- Menyediakan dua sub-komponen:
  1. **Tautan Referensi**:
     - Tabel database baru `task_links` untuk menyimpan judul, URL (`https://`), tipe referensi (`figma`, `document`, `sheet`, `video`, `other`), urutan tampilan, dan pembuat.
     - Kartu tautan memuat judul, favicon/thumbnail, dan ringkasan dari `GET /v1/meta/link-preview`.
     - Tautan dapat **diklik langsung (_direct redirect_)** untuk membuka URL tujuan di tab baru (`target="_blank" rel="noopener noreferrer"`).
     - Dapat diurutkan (_reorder_) secara naik/turun oleh pengguna berwenang.
  2. **Galeri Media (Gambar & Video)**:
     - Gambar: Memanfaatkan API lampiran task yang sudah ada (`POST /v1/workspaces/:workspaceId/tasks/:taskId/attachments`) dengan kategori `product_media`. Gambar dikompresi di sisi browser sebelum diunggah agar tetap di bawah batas body request Vercel (±4,5 MB). Ditampilkan dalam grid galeri dengan modal preview/lightbox.
     - Video: Tautan eksternal (YouTube, Loom, Google Drive). Khusus YouTube dapat langsung diputar di tempat (_inline embedded player_).
- Pada halaman kerja Subtask Developer dan QA, disediakan komponen baca-saja _"Referensi Feature"_ yang menautkan langsung ke referensi tanpa kemampuan mutasi.
- **Kelebihan**: Sangat terstruktur, rapi, aman, tidak membebani storage dengan file video besar, dan memberikan pengalaman satu klik (_one-click access_) bagi Developer dan QA.
- **Kekurangan**: Membutuhkan satu migrasi database untuk tabel `task_links`.

### Opsi B (Ditolak): Memasukkan Tautan dan Gambar ke Teks Markdown Product Brief

- Memanfaatkan field markdown `context` pada Product Brief yang sudah ada.
- **Alasan ditolak**: Tidak terstruktur, tidak ada pratinjau kartu interaktif (_rich preview card_), tidak ada reordering, tidak ada lightbox viewer gambar, menyulitkan parsing untuk tautan direct redirect, dan bercampur dengan deskripsi scope teks.

## 2. Keputusan Arsitektur dan Policy

- **Tabel Baru**: `task_links` dengan foreign key ke `workspaces(id)` dan `tasks(id)` dengan relasi `ON DELETE CASCADE`.
- **Hak Akses (RBAC)**:
  - Sesuai Keputusan K2 Owner: hanya peran `owner`, `admin`, dan `po` yang diizinkan melakukan mutasi (tambah, edit, hapus, reorder tautan, serta upload/hapus gambar `product_media`).
  - Peran `developer` dan `qa` berstatus baca-saja (_view-only_) pada endpoint `GET` dan tampilan antarmuka.
  - Enforced di backend service/policy (`AUTH-002`).
- **Validasi URL**: Server menolak URL yang tidak berawalan `https://` atau menggunakan skema berbahaya seperti `javascript:` atau file lokal.

## 3. Komponen UI Atomic yang Digunakan

Menggunakan token Stitch dan sistem Atomic Design yang ada:

- Atom: `Button`, `Input`, `Textarea`, `Skeleton`, `IconButton`, `Badge`.
- Molekul: `Modal` konfirmasi hapus, `FormField`.
- Organisme: `FeatureReferencesPanel`, `FeatureMediaGallery`, `TaskAttachmentsPanel`.
- Token: Inter, lime `#B1E743` (dengan `#141413` teks), emerald `#10B981`, neutral `#64748B`, Dark/Light mode konsisten.
