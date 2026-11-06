# QLICKHUB-PRODUCT-MCP — Tahap 0: Problem

**Status:** Draft
**Gerbang:** G0 — menunggu review PO/Owner
**Applicable Policy IDs:** SDLC-001, DOC-003, AI-001

Owner/PO ingin grooming bersama agent pilihannya lalu menerbitkan hasil ke Qlick Hub setelah
mengatakan “publish”. Saat ini belum tersedia pintu MCP untuk alur tersebut.

## Bukti dan fakta terkonfirmasi

- Owner meminta grooming di agent dan pembuatan tugas setelah hasilnya OK dalam percakapan ini,
  2026-11-03. Owner memilih konfirmasi di agent tanpa approval sekali-pakai.
- [ADR-036](../../adr/ADR-036-FEATURE-SPEC-REQUIRED-FIELDS-AND-AGENT-READY-WRITES.md)
  menyatakan MCP dan autentikasi agent memerlukan keputusan P9 tersendiri.
- [Feature Spec service](../../../apps/api/src/modules/featureSpecs/featureSpecService.ts)
  sudah memiliki create, saveSection, Apply, versioning, serta actor.
- Waktu yang terpakai untuk salin ulang: unknown; ukur saat pilot, jangan mengarang baseline.

## Pengguna dan dampak

Owner/Admin/PO melakukan perencanaan; Developer dan QA menerima hierarchy delivery normal.
Frekuensi penggunaan serta volume tim belum diukur. Tanpa integrasi, hasil grooming harus
dipindahkan ke aplikasi oleh pengguna.

## Metrik sukses

| Metrik                   | Baseline              | Target rancangan                                            | Pengukuran                 |
| ------------------------ | --------------------- | ----------------------------------------------------------- | -------------------------- |
| Kompatibilitas client    | Belum diuji           | Codex, Claude, Antigravity berhasil login, preview, publish | UAT staging per client     |
| Salin ulang isi grooming | Unknown               | Tidak diperlukan pada alur sukses                           | Observasi Owner/PO         |
| Duplikasi akibat retry   | Belum diuji           | 0 duplikat untuk key/payload yang sama                      | PostgreSQL integration     |
| Isolasi Workspace        | Belum diuji lewat MCP | Tidak ada kebocoran/penulisan lintas Workspace              | Negative integration tests |

Di luar scope: update delivery Dev/QA melalui MCP, rilis otomatis, delete, deployment oleh agent,
dan aktivasi operasi otonom docs/5.
Unknown yang menghambat implementasi ditampung di [solution.md](solution.md).
