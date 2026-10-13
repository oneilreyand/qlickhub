# Perubahan repo saat paket ini diterapkan

**Belum diterapkan.** Tunggu PR AGY (`feat/readiness-auto-baseline`) merge, lalu kerjakan di branch
baru dari `main` terbaru dengan plan + Approval Window. Semua path di bawah adalah perkiraan dari
dokumen yang sudah dibaca; cek ulang terhadap `main` saat itu.

## Tier

PR ini **Tier 2**, sehingga butuh label `owner-approved` dari Owner. Menurut `quality/tier2-paths.txt`, file
`AGENTS.md`, `AGENT_REPORT_TEMPLATE.md`, `docs/0_…`, `docs/4_…`, `docs/POLICY_REGISTRY.md`,
`docs/adr/**`, dan `scripts/check*.mjs` semuanya termasuk Tier 2. Hanya `docs/features/**` dan
`docs/plans/README.md` yang Tier 1.

Catatan: `contracts.md`, `authorization.md`, dan `roles/*` yang ditautkan dari template adalah file
yang **sudah ada** di `docs/features/_template/`; paket ini tidak mengubahnya.

## Daftar perubahan

| # | File | Perubahan | Catatan |
| --- | --- | --- | --- |
| 1 | `docs/adr/ADR-029-STAGED-FEATURE-SDLC.md` | Tambah dari `ADR-029-DRAFT.md` | Status `Proposed` sampai Owner setuju |
| 2 | `docs/adr/README.md` | Tambah baris ADR-029; tambah kolom Status | Sekalian tandai ADR-018 superseded oleh ADR-025 |
| 3 | `docs/4_AGENT_DEV_GUIDELINES.md` | Tambah §2B "Tahap SDLC Feature" (alur, gerbang, jalur Cepat/Standar/Penuh, Stage Card) | Satu-satunya tempat aturan kanonis; dokumen lain hanya menaut |
| 4 | `docs/POLICY_REGISTRY.md` | Tambah `SDLC-001` → docs/4 §2B | |
| 5 | `docs/features/_template/` | Tambah `problem.md`, `solution.md`, `breakdown.md`, `phases/PHASE-01.md`, `release.md`; ganti isi `README.md`, `product.md`, `testing.md` | `contracts.md`, `authorization.md`, `roles/` tetap |
| 6 | `docs/features/README.md` | Jelaskan Stage Tracker dan jalur | |
| 7 | `AGENTS.md` | Satu baris di "Task lifecycle": ikuti §2B dan tampilkan Stage Card | Jangan menyalin isi §2B |
| 8 | `AGENT_REPORT_TEMPLATE.md` | Tambah field "Tahap & gerbang" | |
| 9 | `docs/plans/README.md` | Plan baru memakai `breakdown.md`/`QUICK_CARD`; daftar status yang diizinkan | |
| 10 | `scripts/checkDocs.mjs` + test | Validasi file wajib folder Feature dan Stage Tracker | Tier 2 |
| 11 | `docs/0_PRODUCT_KNOWLEDGE_MAP.md` | Link ke §2B pada Reading Path AI | |

## Keputusan Owner yang dibutuhkan sebelum ADR-029 Accepted

1. **Tier 1 = deploy Production.** Pilih: (A) ubah Vercel ke promosi manual, (B) jadikan path runtime
   (`apps/**`, `packages/**`) Tier 2, atau (C) nyatakan resmi bahwa Tier 1 merge boleh deploy dan
   perbarui `AI-013`.
2. Siapa penyetuju tiap gerbang bila Owner dan PO adalah orang yang sama.
3. Apakah fitur yang sudah berjalan (mis. Leader Hub) dibuatkan `problem.md`–`testing.md` secara
   retroaktif, atau cukup ditandai legacy.

## Verifikasi setelah diterapkan

- `npm run docs:check` dan `npm run validate` lulus (catat jumlah pass/fail).
- Uji coba satu Feature nyata lewat tahap 0–3 untuk memastikan template bisa dipakai.
