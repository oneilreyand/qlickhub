# DOC-PORTAL — Tahap 1: Opsi Solusi (Decision Snapshot)

**Status:** Disetujui
**Gerbang:** G1 — disetujui oleh reyand (Owner) 2026-10-14
**Problem:** [problem.md](problem.md)
**ADR:** ADR-033 (draf disetujui di G1; file ditambahkan sebagai `Accepted` di Phase 2 karena `docs/adr/**` Tier 2)
**Applicable Policy IDs:** AI-006, SDLC-001, DOC-002

Format mengikuti Decision Snapshot di `docs/4_AGENT_DEV_GUIDELINES.md` §2A.E; dokumen ini tidak
mengubah aturan tersebut.

## 1. Kondisi sekarang

- `scripts/checkDocs.mjs` dan `scripts/checkSdlc.mjs` memeriksa struktur dokumen dan Stage Tracker,
  bukan kecocokan dokumen dengan kode.
- Endpoint didaftarkan di `apps/api/src/modules/*/…Routes.ts` dan di-mount di `apps/api/src/app.ts`;
  kontrak ada sebagai schema Zod di `packages/contracts/src/*.ts`; tidak ada spesifikasi API yang
  dibangkitkan dari kode.
- ERD hanya blok Mermaid manual di `docs/1_ARCHITECTURE.md`.
- `typescript` sudah menjadi devDependency root dan dapat dipakai sebagai parser tanpa dependency baru.

## 2. Opsi

|                              | Opsi A: tool sendiri, core + adapter                                                                           | Opsi B: rakit tool siap pakai                                                                    | Opsi 0: tidak dikerjakan    |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------- |
| Ringkasan                    | `tools/docsys/`: core (format JSON, rule, ratchet), adapter (Express, Zod, Sequelize, Markdown), portal statis | VitePress + `zod-to-openapi` + generator ERD + skrip check                                       | Biarkan seperti sekarang    |
| Pro                          | Semua tampilan mockup bisa dibuat persis; tanpa dependency baru; mudah dibawa ke proyek lain                   | Pencarian dan navigasi dokumen langsung jadi; OpenAPI standar                                    | Tanpa effort                |
| Kontra                       | Portal dibangun dari nol; adapter perlu dirawat                                                                | Kode API harus mendaftarkan schema OpenAPI; 3–4 dependency baru; TODO dan UX matrix tetap custom | Gap dokumen terus bertambah |
| Lapisan terdampak (FE/BE/DB) | `tools/`, `package.json`, CI; aplikasi tidak berubah                                                           | Ditambah `apps/api`                                                                              | —                           |
| Data / migrasi               | Tidak ada                                                                                                      | Tidak ada                                                                                        | —                           |
| Authorization                | Tidak ada (portal lokal)                                                                                       | Tidak ada                                                                                        | —                           |
| Shared contract              | Hanya dibaca                                                                                                   | Ikut disentuh (metadata OpenAPI)                                                                 | —                           |
| Estimasi WRA                 | 5/16                                                                                                           | 8/16                                                                                             | —                           |
| Risiko & rollback            | Gate CI salah memblokir → baseline + `DOCSYS_MODE=report`                                                      | Regresi kode API → revert banyak file                                                            | —                           |

## 3. Rekomendasi

Opsi A. Semua metrik di [problem.md](problem.md) bisa diukur langsung dari sumber, kode aplikasi tidak
berubah (penting karena merge ke `main` memicu deploy Production), dan desain core + adapter paling
mudah dipakai ulang. OpenAPI dapat ditambahkan kemudian sebagai adapter terpisah.

## 4. Dampak policy

- [ ] Tidak mengubah policy → tidak perlu ADR
- [x] Mengubah policy → ADR-033 dan `DOC-006`
      (PR tidak boleh menambah gap dokumen baru dibanding baseline). Registry dan docs/4 diperbarui di
      Phase 2 bersama penegakannya (`DOC-002`).

## 5. Keputusan

**Dipilih:** Opsi A — oleh reyand (Owner), 2026-10-14, persetujuan G1 di sesi agent.
**Ditolak:** Opsi B (mengubah kode API dan menambah dependency), Opsi 0 (gap terus bertambah).
