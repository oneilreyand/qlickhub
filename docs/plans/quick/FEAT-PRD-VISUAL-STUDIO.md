# QUICK — FEAT-PRD-VISUAL-STUDIO Visual Diagram and Chart Studio di PRD

**Status:** Disetujui
**WRA:** 2/16 — Skor 1 pada batasan lingkup (UI studio canvas) dan skor 1 pada implementasi kanvas interaktif

## Problem

- Gejala: Dokumen PRD dan Product Brief di QlickHub belum memiliki kapabilitas visualisasi diagram alur proses dan grafik data metrik.
- Bukti: `apps/web/src/components/ui/atoms/FormattedText.tsx` baris 488-509 merender semua blok kode bertanda backtick hanya sebagai `<pre><code>` mentah tanpa rendering grafis.
- Penyebab: Belum ada komponen parser diagram/grafik visual dan studio pembuat alur berbasis drag-and-drop di dalam antarmuka Feature PRD.

## Perubahan

- File/path:
  - `apps/web/src/components/ui/molecules/MermaidViewer.tsx`
  - `apps/web/src/components/ui/molecules/PrdMetricChartViewer.tsx`
  - `apps/web/src/components/ui/organisms/taskDetail/PrdDiagramStudioModal.tsx`
  - `apps/web/src/components/ui/atoms/FormattedText.tsx`
  - `apps/web/src/components/ui/organisms/taskDetail/FeatureSpecPrdEditor.tsx`
  - `apps/web/src/components/ui/atoms/__tests__/FormattedText.test.tsx`
  - `apps/web/src/components/ui/organisms/taskDetail/__tests__/PrdDiagramStudioModal.test.tsx`
  - `docs/plans/quick/FEAT-PRD-VISUAL-STUDIO.md`
- Bukan scope: Perubahan skema PostgreSQL, endpoint backend, otorisasi role, migrasi data, atau alur rilis aplikasi.

## Acceptance Criteria → bukti

| AC                                                        | Bukti yang dibutuhkan (E-level) | Perintah / observasi                                               |
| :-------------------------------------------------------- | :------------------------------ | :----------------------------------------------------------------- |
| AC-STUDIO-1 (Tombol studio di editor PRD)                 | E2 (Unit / Component)           | `npm --prefix apps/web run test -- PrdDiagramStudioModal.test.tsx` |
| AC-STUDIO-2 (Drag & Drop kanvas interaktif alur & metrik) | E2 (Unit / Component)           | `npm --prefix apps/web run test -- PrdDiagramStudioModal.test.tsx` |
| AC-STUDIO-3 (Konversi ke Markdown terstruktur)            | E2 (Unit / Component)           | `npm --prefix apps/web run test -- PrdDiagramStudioModal.test.tsx` |
| AC-STUDIO-4 (Viewer Mermaid SVG & Metric Chart di PRD)    | E2 (Unit / Component)           | `npm --prefix apps/web run test -- FormattedText.test.tsx`         |
| AC-STUDIO-5 (Lightbox zoom modal diagram)                 | E2 (Unit / Component)           | `npm --prefix apps/web run test -- FormattedText.test.tsx`         |
| AC-STUDIO-6 (Lazy loading & code splitting bundle)        | E1 (Static / Build)             | `npm --prefix apps/web run build`                                  |

## Approval Window

- Task / baseline: FEAT-PRD-VISUAL-STUDIO @ e82df3c8
- Path yang diizinkan: `apps/web/**`, `docs/plans/quick/FEAT-PRD-VISUAL-STUDIO.md`
- Urutan aksi: implementasi komponen viewer → buat modal kanvas studio → integrasikan ke editor & viewer → unit test → full validate → PR Tier 1 → auto-merge
- Masa berlaku dan stop condition: Berhenti bila terjadi regresi bundle size awal tanpa code-splitting, atau kegagalan pemeriksaan `npm run validate`.

**Disetujui:** reyand (Owner), 2026-11-09, via konfirmasi Approval Window pengguna

## Hasil

- Perintah — exit code — pass/fail/skip: Dalam proses eksekusi
- PR dan tier: Tier 1
- Gap: Tidak ada
