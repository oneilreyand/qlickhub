# FEATURE-REFERENCES-MEDIA — Owner / Admin Path

**Applicable Policy IDs:** DOC-005, AUTH-001, AUTH-002, DATA-001

## Inputs and preconditions

- Akun terautentikasi dengan peran `owner` atau `admin` pada Workspace aktif.
- Feature/Story (root task) telah dibuat di dalam folder kerja atau tanpa folder.

## Permitted actions and decisions

- Membuka tahap PRD pada halaman detail Feature.
- Menambah tautan eksternal baru (Figma, Dokumen, Spreadsheet, Video, dll.) dengan URL `https://`.
- Mengedit judul, jenis, dan mengubah urutan (_reorder_) tautan referensi.
- Menghapus tautan referensi yang tidak lagi relevan.
- Mengunggah gambar desain/mockup ke galeri media dan menghapus gambar bila diperlukan.
- Menyetujui keputusan rilis atau perubahan arsitektur terkait skema `task_links`.

## Outputs and handoff

- Tautan dan media tersimpan secara persisten di database PostgreSQL.
- Referensi siap diakses oleh Product Owner, Developer, dan QA.
