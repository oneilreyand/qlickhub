# FEATURE-REFERENCES-MEDIA — QA Path

**Applicable Policy IDs:** DOC-005, AUTH-001, AUTH-002, DATA-001, TEST-001

## Inputs and preconditions

- Akun terautentikasi dengan peran `qa` pada Workspace aktif.
- Menyusun Test Case atau menjalankan Test Run untuk memverifikasi Feature.

## Permitted actions and decisions

- Membaca seluruh tautan referensi dan membuka tautan tujuan melalui tombol direct redirect.
- Memeriksa galeri gambar desain sebagai _baseline_ visual saat membandingkan hasil pengujian UI.
- Memutar video alur kerja untuk memahami ekspektasi interaksi pengguna.
- Menjalankan suite pengujian integrasi terkait CRUD `task_links`, keamanan RBAC (403), validasi URL, dan direct redirect link.
- **Dilarang**: Menambah, mengubah, atau menghapus referensi atau media produk pada Feature.

## Outputs and handoff

- Test Case dan hasil uji (Test Result) yang tervalidasi terhadap referensi resmi produk.
