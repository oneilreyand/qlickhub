# WORK-VISIBILITY — Design Exports

**Status:** Draft — diekspor 2026-10-29; menunggu G0/G1 [plan program](../../WORK_VISIBILITY_PROGRAM_PLAN.md)
**Policy:** `DOC-007` ([ADR-037](../../../adr/ADR-037-DESIGN-ASSET-WORKFLOW.md))
**Sumber kerja:** canvas Design "qlickHub — Laporan, Leader Hub & Akses" (privat, bukan acuan resmi):
https://claude.ai/artifact/UhMWePRnt1K1DpcHQVPSed
**Sumber di repo:** [`source/`](source/canvas.json) — artboard `.dc.html` dan index canvas
**Acuan resmi:** gambar WebP di folder ini, setelah plan dan PRD per Feature disetujui

Gambar dirender lokal dari `source/*.dc.html` dengan Chromium/Playwright memakai
`source/render-export.mjs`, lalu dikonversi ke WebP (kualitas 80). Font Inter dimuat dari Google Fonts
bila jaringan tersedia. Semua nama, email, angka, dan tanggal di layar adalah contoh.

| File                                    | Artboard canvas                             | Feature           | Desktop 1440 | HP 390        |
| --------------------------------------- | ------------------------------------------- | ----------------- | ------------ | ------------- |
| `01-laporan-saya.webp`                  | Laporan Saya                                | MY-WORK-REPORT    | Ada          | Ada           |
| `02-leader-hub-ringkasan.webp`          | Leader Hub — Ringkasan                      | LEADER-SDLC-HUB   | Ada          | Ada           |
| `03-anggota-akses.webp`                 | Anggota & Akses                             | MEMBER-ACCESS-HUB | Ada          | Ikuti pola HP |
| `04-undang-anggota.webp`                | Undang anggota (modal)                      | MEMBER-ACCESS-HUB | Ada (760)    | —             |
| `05-pengaturan-kalender-kapasitas.webp` | Pengaturan Workspace — Kalender & Kapasitas | WORK-FOUNDATION   | Ada          | Ikuti pola HP |

Pola HP: Sidebar menjadi menu di atas, kartu turun satu kolom, tabel lebar bergulir horizontal.
Varian Dark belum dibuat; ikuti pemetaan Light → Dark di
[SIMPLE-UI-DELIVERY-FLOW/design](../../../features/SIMPLE-UI-DELIVERY-FLOW/design/README.md) dan ADR-034.

## Belum didesain

- Leader Hub: tab Beban kerja, Hambatan, Kualitas, dan Laporan berkala.
- Panel blocker di detail subtask dan field effort di form subtask.
- State Loading, Empty, Error, dan Permission denied untuk setiap layar.

## Ekspor ulang

Jalankan dari root repository setelah `source/` diperbarui dari canvas:

```bash
node docs/plans/work-visibility/design/source/render-export.mjs \
  docs/plans/work-visibility/design/source/Main.dc.html /tmp/01-laporan-saya.png 1440 900
cwebp -q 80 /tmp/01-laporan-saya.png -o docs/plans/work-visibility/design/01-laporan-saya.webp
```

Ekspor ulang hanya layar yang berubah, dan hanya saat gerbang (G2 atau revisi yang disetujui),
bukan setiap iterasi canvas.
