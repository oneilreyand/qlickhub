# TASK-READ-ACCESS — Tahap 1: Opsi Solusi (Decision Snapshot)

**Status:** Disetujui
**Gerbang:** G1 — disetujui oleh Owner
**Disetujui:** Owner (Reyand), 2026-11-12 — memilih "Semua endpoint baca, bertahap"
**Problem:** [problem.md](problem.md)
**ADR:** [ADR-043](../../adr/ADR-043-TASK-SCOPED-READ-ACCESS.md)
**Applicable Policy IDs:** AI-006, SDLC-001, AUTH-002, AUTH-013

## 1. Kondisi sekarang

Aturan akses task ada di `taskPolicy.ts`, ditegakkan pada tiga jalur baca saja, dan tidak tercatat
di SSoT.

## 2. Opsi

| Opsi | Isi                                                               | Pro                                      | Kontra                                              |
| ---- | ----------------------------------------------------------------- | ---------------------------------------- | --------------------------------------------------- |
| A    | Semua route baca task-scoped memakai satu aturan, bertahap dua PR | Satu definisi; celah tertutup menyeluruh | Dua PR Tier 2; perubahan perilaku bagi Developer/QA |
| B    | Hanya tautan, Product Brief dan riwayat                           | Cepat                                    | Route lain tetap terbuka                            |
| C    | Audit saja                                                        | Tanpa risiko regresi                     | Celah tetap ada                                     |

## 3. Rekomendasi

Opsi A dengan middleware route tunggal yang memanggil fungsi kebijakan bersama.

## 4. Dampak policy

Kebijakan baru `AUTH-013`, ADR-043, bagian baru Architecture §5. Tanpa migrasi atau kontrak baru.

## 5. Keputusan

**Dipilih:** Opsi A — oleh Owner (Reyand), 2026-11-12, pilihan pada dialog chat.
**Ditolak:** Opsi B (tidak menyeluruh) dan Opsi C (tidak menutup celah).
