# Agent Report: Perbaikan Pratinjau Media dan Zoom Video/Gambar pada Requirement

**Tanggal:** 2026-09-24  
**Pelaksana:** Antigravity  
**Cabang/Konteks:** fix_requirement_media_zoom

## Task

FIX-REQUIREMENT-MEDIA-ZOOM-AND-VIDEO-PREVIEW: Perbaiki penanganan pratinjau media dan zoom video/gambar pada Requirement dan FormattedText agar video diputar via player interaktif dan gambar broken memiliki fallback informatif.

## Outcome

1. Komponen `FormattedText` kini memiliki logika klasifikasi media cerdas (`detectMediaInfo`) yang mengenali URL video langsung (`.mp4`, `.webm`, `.mov`, `.ogg`, `isCloudVideo`), YouTube, Loom, Vimeo, Streamable, serta Google Drive Video/File Preview.
2. Markdown video (seperti `![k video](https://...)`) kini dirender menggunakan kartu video interaktif dengan badge yang sesuai (`VIDEO`, `YOUTUBE`, `LOOM`, `G-DRIVE VIDEO`) dan overlay Play, bukan tag `<img>` statis yang menyebabkan error render browser.
3. Klik tombol "Klik untuk Memperbesar & Memutar" membuka modal zoom `MediaLightboxModal` dengan parameter tipe yang tepat (`video_direct` atau `video_embed`), sehingga video langsung dapat diputar di dalam modal secara interaktif.
4. Google Drive image link dikonversi secara transparan ke CDN thumbnail yang valid (`lh3.googleusercontent.com/d/{id}`) untuk menghindari pemblokiran hotlinking CORS oleh Google Drive.
5. Menambahkan penanganan error terpadu (`loadError` / `hasError`):
   - Pada kartu inline di `FormattedText`, jika file gambar gagal dimuat (CORS, 404, atau blocked), sistem menampilkan kartu fallback informatif bertuliskan *"Pratinjau gambar tidak dapat dimuat"* beserta tombol *"Buka Tautan"*, menggantikan bug kartu kosong gelap sebelumnya.
   - Pada modal `MediaLightboxModal`, jika gambar gagal dimuat, modal menampilkan tampilan peringatan *"Gambar Tidak Dapat Dimuat"* dan tombol *"Buka Tautan Asli"*, menggantikan bug kotak tanda tanya rusak browser.

## Source of truth and impact

- **Applicable SSoT:** [`docs/3_UI_ATOMIC_DESIGN_SYSTEM.md`](../3_UI_ATOMIC_DESIGN_SYSTEM.md), [`docs/4_AGENT_DEV_GUIDELINES.md`](../4_AGENT_DEV_GUIDELINES.md)
- **Policy IDs:** `UI-001` (Atomic Design and Stitch tokens), `UI-002` (Error and empty state coverage), `TEST-001`, `DOC-003`, `DOC-004`
- **Data/interface impact:** None (Client-side formatting and presentation only; backward compatible with existing markdown text).
- **Authorization impact:** None.
- **Migration risk:** None.

## Changed files

- `apps/web/src/components/ui/atoms/FormattedText.tsx` — Menambahkan deteksi media video/embed/drive, kartu media interaktif `FormattedMediaCard`, fallback kegagalan muat gambar, dan integrasi modal lightbox dinamis.
- `apps/web/src/components/ui/molecules/MediaLightboxModal.tsx` — Menambahkan state `hasError`, pesan fallback jika gambar/video gagal dimuat, dan penyembunyian tombol zoom ketika terjadi error.
- `apps/web/src/components/ui/atoms/__tests__/FormattedText.test.tsx` — Menambahkan pengujian untuk video markdown, YouTube video, Google Drive video, dan fallback error kartu gambar.
- `apps/web/src/components/ui/molecules/__tests__/MediaLightboxModal.test.tsx` — Membuat test suite lengkap untuk modal zoom (gambar, direct video, embed iframe, fallback error).
- `TODO.md` — Menandai task `FIX-REQUIREMENT-MEDIA-ZOOM-AND-VIDEO-PREVIEW` selesai diverifikasi.

## Validation

- `npm --prefix apps/web test -- FormattedText MediaLightboxModal DiscussionMedia RichText RequirementManager` — 55/55 passed (100%).
- `npm --prefix apps/web run typecheck` — 0 errors (Passed).
- `npm --prefix apps/web run build` — 1.714 modules transformed successfully, bundle built in 2.96s (Passed).
- `npm run docs:check` — 5/5 passed (Documentation governance passed).

## Risks or follow-up

- URL video eksternal yang di-host di layanan dengan proteksi login ketat (seperti Google Drive dengan izin akses terbatas / private) tetap memerlukan hak akses dari akun Google pengguna untuk dapat diputar di iframe pratinjau.

## TODO update

- `FIX-REQUIREMENT-MEDIA-ZOOM-AND-VIDEO-PREVIEW` → `Done`
