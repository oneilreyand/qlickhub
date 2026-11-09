# FEATURE-REFERENCES-MEDIA — Developer Path

**Applicable Policy IDs:** DOC-005, AUTH-001, AUTH-002, DATA-001

## Inputs and preconditions

- Akun terautentikasi dengan peran `developer` pada Workspace aktif.
- Ditugaskan pada subtask di bawah Feature tertentu.

## Permitted actions and decisions

- Membuka panel "Referensi Feature" di halaman detail subtask atau membuka tahap PRD Feature.
- Mengklik tombol tautan (_direct redirect_) untuk langsung membuka link eksternal (Figma, Dokumen API, dll.) di tab baru browser.
- Melihat galeri gambar mockup dan mengklik gambar untuk memperbesar (lightbox modal).
- Memutar video penjelasan YouTube langsung di tempat (_embedded player_).
- **Dilarang**: Menambah, mengedit, menghapus, atau mengubah urutan tautan dan media (tombol aksi tidak ditampilkan di UI dan API memvalidasi larangan ini dengan `403 Forbidden`).

## Outputs and handoff

- Kode implementasi frontend/backend yang presisi sesuai acuan referensi desain dan spesifikasi.
