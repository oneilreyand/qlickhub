# Completed Work Archive — 2026-11-11

Completed items moved out of the Active work section of [`TODO.md`](../../TODO.md) on 2026-11-11.

## Completed active work

- [x] **Done** (Codex — 2026-11-09; Production verified and G6 Owner 2026-11-11) — **FEAT-PRD-MERMAID-STUDIO: Sederhanakan Studio menjadi input Mermaid + preview dengan edit ulang blok beridentitas.** Kandidat lokal P1–P2 teruji; G5 independen dan publikasi belum dilakukan. [Feature](../features/FEAT-PRD-MERMAID-STUDIO/README.md). Policies: `UI-001`, `UI-003`, `DATA-001`, `CONTRACT-001`, `TEST-001`.
      Layer: PRD=Done, BE=Done, FE=Done.
      Catatan 2026-11-11 (Claude): sudah masuk `main` lewat PR #119 (`4f0938a2`) dan artefak Production memuat Studio Mermaid; [bukti baca-saja](../reports/PRODUCTION_READONLY_EVIDENCE_2026-11-11.md). Sisa: smoke terautentikasi dan G6.
      Temuan Production 2026-11-11 (Owner): tombol Tambah Diagram ganda di halaman Feature sederhana. Perbaikan di branch `fix/prd-duplicate-diagram-button`: tombol di ringkasan PRD (hanya membuka form Edit) dan tombol di kepala form dihapus; satu pintu masuk tersisa di kolom Konteks. Vitest taskDetail 80/80, typecheck dan lint lulus; menunggu PR.
      Smoke Production 2026-11-11: PR #121 sudah di `main` (`431fcac8`) dan tombol tinggal satu; sisip, simpan dan edit ulang diagram lulus pada Feature uji; [smoke Production](../reports/PRODUCTION_SMOKE_F1_F2_MERMAID_2026-11-11.md). Sisa: keputusan G6 Owner.
      Ditutup 2026-11-11: G6 diterima Owner lewat chat (`ok`) setelah smoke Production terautentikasi; lihat `docs/features/FEAT-PRD-MERMAID-STUDIO/release.md`.
