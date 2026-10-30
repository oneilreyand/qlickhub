# WORK-VISIBILITY — Design Exports

**Status:** Draft — revisi desain disetujui 2026-10-30; plan program tetap menunggu G0/G1
**Policy:** `DOC-007` ([ADR-037](../../../adr/ADR-037-DESIGN-ASSET-WORKFLOW.md))
**Sumber kerja:** canvas Design "qlickHub — Laporan, Leader Hub & Akses" (privat, bukan acuan resmi):
https://claude.ai/artifact/UhMWePRnt1K1DpcHQVPSed
**Sumber di repo:** [`source/`](source/canvas.json) — artboard `.dc.html` dan index canvas
**Acuan resmi:** gambar WebP di folder ini, setelah plan dan PRD per Feature disetujui

Gambar dirender lokal dari `source/*.dc.html` dengan Chromium/Playwright memakai
`source/render-export.mjs`, lalu dikonversi ke WebP (kualitas 80). Font Inter dimuat dari Google Fonts
bila jaringan tersedia. Semua nama, email, angka, dan tanggal di layar adalah contoh.

| File                                    | Artboard canvas                                                   | Feature                       | Desktop 1440 | HP 390        |
| --------------------------------------- | ----------------------------------------------------------------- | ----------------------------- | ------------ | ------------- |
| `01-laporan-saya.webp`                  | Laporan Saya                                                      | MY-WORK-REPORT                | Ada          | Ada           |
| `02-leader-hub-ringkasan.webp`          | Leader Hub — Ringkasan                                            | LEADER-SDLC-HUB               | Ada          | Ada           |
| `03-anggota-akses.webp`                 | Anggota & Akses                                                   | MEMBER-ACCESS-HUB             | Ada          | Ikuti pola HP |
| `04-undang-anggota.webp`                | Undang anggota (modal)                                            | MEMBER-ACCESS-HUB             | Ada (760)    | —             |
| `05-pengaturan-kalender-kapasitas.webp` | Pengaturan Workspace — Kalender & Kapasitas                       | WORK-FOUNDATION               | Ada          | Ikuti pola HP |
| `06-leader-hub-operasional.webp`        | Leader Hub — Beban Kerja, Hambatan, Kualitas, dan Laporan Berkala | LEADER-SDLC-HUB               | Ada          | Ada           |
| `07-subtask-blocker-effort.webp`        | Detail Subtask — pencatatan hambatan dan pemilih effort           | WORK-FOUNDATION               | Ada          | Ada           |
| `08-work-visibility-states.webp`        | Pola Loading, Empty, Error, dan Akses Dibatasi                    | Semua Feature WORK-VISIBILITY | Ada          | Ada           |

Pola HP: Sidebar menjadi menu di atas, kartu turun satu kolom, tabel lebar bergulir horizontal.
Varian Dark belum dibuat; ikuti pemetaan Light → Dark di
[SIMPLE-UI-DELIVERY-FLOW/design](../../../features/SIMPLE-UI-DELIVERY-FLOW/design/README.md) dan ADR-034.

## Cakupan dan batasan desain

- Semua tab operasional Leader Hub, panel hambatan/pemilih effort, dan pola state data-driven kini memiliki artboard.
- Pola state adalah spesifikasi bersama untuk semua layar WORK-VISIBILITY; implementasi harus menyesuaikan pesan dan aksi dengan route/izin sebenarnya, tanpa fallback data contoh.
- Varian Dark belum dibuat; ikuti pemetaan Light → Dark di [SIMPLE-UI-DELIVERY-FLOW/design](../../../features/SIMPLE-UI-DELIVERY-FLOW/design/README.md) dan ADR-034.
- Artboard adalah rancangan, bukan kontrak API atau izin baru. D1–D10 pada plan program tetap keputusan terbuka.

## Ekspor ulang

Jalankan dari root repository setelah `source/` diperbarui dari canvas:

```bash
node docs/plans/work-visibility/design/source/render-export.mjs \
  docs/plans/work-visibility/design/source/Main.dc.html /tmp/01-laporan-saya.png 1440 900
cwebp -q 80 /tmp/01-laporan-saya.png -o docs/plans/work-visibility/design/01-laporan-saya.webp
```

Ekspor ulang hanya layar yang berubah, dan hanya saat gerbang (G2 atau revisi yang disetujui),
bukan setiap iterasi canvas.
