# DOC-PORTAL — Authorization Matrix

**Applicable Policy IDs:** DOC-005, DOC-006, AI-020

Portal berjalan lokal tanpa login; tidak ada otorisasi aplikasi. Batas yang berlaku adalah aturan
repository yang sudah ada.

| Action                                  | Owner / Admin     | PO             | Developer       | QA             | Penegakan dan bukti                                |
| --------------------------------------- | ----------------- | -------------- | --------------- | -------------- | -------------------------------------------------- |
| Membuka portal lokal                    | Ya                | Ya             | Ya              | Ya             | Tidak ada auth; siapa pun yang punya clone repo    |
| Menjalankan extract / check             | Ya                | Ya             | Ya              | Ya             | Perintah lokal dan CI                              |
| Memperkecil baseline (`--shrink`)       | Ya                | Ya             | Ya              | Ya             | `quality/**` Tier 2 → PR butuh `owner-approved`    |
| Menambah entri baseline (pengecualian)  | Ya, lewat label   | Tidak langsung | Tidak langsung  | Tidak langsung | Tier 2 + `owner-gate` (ADR-028); dibuktikan PR uji |
| Mematikan blokir (`DOCSYS_MODE=report`) | Ya, dicatat di PR | Tidak          | Tidak           | Tidak          | Perubahan `.github/**` Tier 2                      |
| Mengubah rule / core                    | Ya, lewat label   | Tidak          | Lewat PR Tier 2 | Tidak          | `scripts/check*.mjs`, `quality/**` Tier 2          |

Catatan: `--shrink` mengubah `quality/doc-baseline.json`, jadi PR-nya tetap Tier 2. Pengecualian Tier 1
untuk PR yang hanya mengecilkan baseline ditunda di G3 sampai terbukti merepotkan.
