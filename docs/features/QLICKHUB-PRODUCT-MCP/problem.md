# QLICKHUB-PRODUCT-MCP — Tahap 0: Problem

**Status:** Draft
**Gerbang:** G0 — menunggu review PO/Owner
**Applicable Policy IDs:** SDLC-001, DOC-003, AI-001

Anggota tim memakai agent AI yang berbeda-beda, tetapi data kerja ada di Qlick Hub. Saat ini belum
ada pintu MCP: hasil kerja di agent harus disalin manual ke aplikasi, dan agent tidak bisa membaca
AC, antrean, atau beban tim.

## Bukti dan fakta terkonfirmasi

- Owner meminta grooming di agent dan pembuatan tugas setelah hasilnya OK, 2026-11-03, dengan
  konfirmasi di agent tanpa approval sekali-pakai.
- Owner meminta MCP untuk setiap role dan berbagai agent (Claude, Codex, Antigravity, OpenCode, dan
  lainnya), 2026-11-18, termasuk agar agent mengetahui Developer yang tersedia dan bentrok timeline
  saat PO meng-assign.
- [ADR-036](../../adr/ADR-036-FEATURE-SPEC-REQUIRED-FIELDS-AND-AGENT-READY-WRITES.md) menyatakan MCP
  dan autentikasi agent memerlukan keputusan P9 tersendiri; setiap write sudah mencatat actor
  `user`/`agent` dan channel.
- Endpoint yang dapat dipakai ulang per role sudah ada (task, requirement, bug, test management,
  readiness, kapasitas, blocker, Leader); pemetaannya di [contracts.md](contracts.md).
- Waktu yang terpakai untuk salin ulang: unknown; ukur saat pilot, jangan mengarang baseline.

## Masalah per role

| Role           | Masalah                                                                                           |
| -------------- | ------------------------------------------------------------------------------------------------- |
| Owner/Admin/PO | Hasil grooming harus diketik ulang; saat assign tidak tahu bentrok jadwal tanpa membuka Timeline. |
| Developer      | Harus berpindah ke aplikasi untuk membaca AC, mengambil subtask, dan memperbarui status.          |
| QA             | Hasil uji (termasuk dari otomasi Playwright) dan bug dicatat manual ke aplikasi.                  |
| Owner/Admin    | Ringkasan Leader hanya dari UI; tidak bisa ditanyakan dari agent.                                 |

## Metrik sukses

| Metrik                   | Baseline              | Target rancangan                                           | Pengukuran                 |
| ------------------------ | --------------------- | ---------------------------------------------------------- | -------------------------- |
| Kompatibilitas client    | Belum diuji           | Client Tier A lolos UAT per rilis; Tier B dicatat hasilnya | UAT staging per client     |
| Salin ulang isi grooming | Unknown               | Tidak diperlukan pada alur sukses                          | Observasi Owner/PO         |
| Duplikasi akibat retry   | Belum diuji           | 0 duplikat untuk key/payload yang sama                     | PostgreSQL integration     |
| Isolasi Workspace/role   | Belum diuji lewat MCP | Tidak ada kebocoran, tidak ada hak melebihi REST/UI        | Negative integration tests |
| Pemakaian per role       | Unknown               | Diukur saat pilot; tidak ada target sebelum baseline       | Audit actor agent/channel  |

Di luar scope seluruh rilis: QA sign-off, keputusan rilis, governance decision, delete, pengelolaan
anggota/role, deployment oleh agent, dan aktivasi operasi otonom docs/5. Tool bug Developer dan tiket
Support mengikuti program BUG-INTAKE-SLA. Unknown yang menghambat implementasi ada di
[solution.md](solution.md).
