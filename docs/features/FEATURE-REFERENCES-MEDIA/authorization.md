# FEATURE-REFERENCES-MEDIA — Authorization Matrix

**Status:** Menunggu persetujuan
**Gerbang:** Bagian G2 — disetujui oleh PO/Owner
**Applicable Policy IDs:** AUTH-001, AUTH-002

## 1. Aturan Otorisasi (RBAC)

Sesuai arahan Owner pada Keputusan K2:

- **Pengelolaan Tautan & Media (Mutasi)**: Dibatasi ketat hanya untuk peran **Owner, Admin, dan PO** pada Workspace yang bersangkutan.
- **Konsumsi Referensi (Baca-Saja)**: Peran **Developer dan QA** hanya berhak membaca daftar tautan, melihat pratinjau kartu, mengklik redirect, melihat galeri gambar, dan memutar video di tempat.
- **Enforcement di Backend**: Kontrol akses diperiksa langsung pada middleware `authenticateWorkspaceMember` dan service policy `taskLinkPolicy.ts`. Ketiadaan tombol di UI bukanlah batas otorisasi utama (`AUTH-002`).

## 2. Matriks Hak Akses

| Operasi                                   | Endpoint                     | Owner | Admin | PO  | Developer |    QA    |
| :---------------------------------------- | :--------------------------- | :---: | :---: | :-: | :-------: | :------: |
| Lihat daftar tautan referensi             | `GET .../links`              |  ✅   |  ✅   | ✅  |    ✅     |    ✅    |
| Tambah tautan referensi baru              | `POST .../links`             |  ✅   |  ✅   | ✅  | ❌ (403)  | ❌ (403) |
| Sunting tautan referensi                  | `PATCH .../links/:linkId`    |  ✅   |  ✅   | ✅  | ❌ (403)  | ❌ (403) |
| Hapus tautan referensi                    | `DELETE .../links/:linkId`   |  ✅   |  ✅   | ✅  | ❌ (403)  | ❌ (403) |
| Ubah urutan (_reorder_) tautan            | `PUT .../links/reorder`      |  ✅   |  ✅   | ✅  | ❌ (403)  | ❌ (403) |
| Lihat galeri gambar / lampiran            | `GET .../attachments`        |  ✅   |  ✅   | ✅  |    ✅     |    ✅    |
| Upload gambar referensi (`product_media`) | `POST .../attachments`       |  ✅   |  ✅   | ✅  | ❌ (403)  | ❌ (403) |
| Hapus gambar referensi                    | `DELETE .../attachments/:id` |  ✅   |  ✅   | ✅  | ❌ (403)  | ❌ (403) |

## 3. Penanganan Pelanggaran Otorisasi

- Jika request mutasi dikirim oleh Developer atau QA, API wajib merespons dengan HTTP status `403 Forbidden` dan payload JSON:
  ```json
  {
    "error": {
      "code": "FORBIDDEN",
      "message": "Hanya Owner, Admin, atau Product Owner yang dapat mengelola referensi dan media Feature."
    }
  }
  ```
- Percobaan akses tanpa token otentikasi atau oleh pengguna di luar keanggotaan Workspace yang aktif ditolak dengan HTTP `401 Unauthorized` atau `404 Not Found` / `403 Forbidden` sesuai standar `AUTH-001`.
