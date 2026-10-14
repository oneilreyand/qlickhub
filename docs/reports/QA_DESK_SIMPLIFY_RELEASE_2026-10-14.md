# QA-DESK-SIMPLIFY Release — 2026-10-14

## Task

QA-DESK-SIMPLIFY: adopsi branch AGY B0 (baseline otomatis) dan B1 (siklus Test Case QA), PR #37.

## Outcome

PR #37 di-merge ke `main` (`de50b69`) dan ter-deploy otomatis ke Production. Migrasi 085–088
dijalankan Owner di Production; `SequelizeMeta` kini sampai `20261013000088`. Smoke test Production
belum dilakukan.

## Work assurance

- **SDLC stage and path (`SDLC-001`):** tahap 6, jalur Penuh,
  [folder Feature](../features/QA-DESK-SIMPLIFY/README.md).
- **Work Readiness Assessment:** P1 8/16, P2 6/16 — `Ready`.
- **User plan approval:** G0–G2 + D6/D7 dan G3 disetujui Owner 2026-10-13 di chat.
- **Approval Window / high-risk decisions:** migrasi Production disetujui dan dijalankan Owner sendiri;
  backup dilewati atas keputusan Owner (data Production belum penting, paket Supabase Free).
- **Agent capability and access:** Claude tidak punya akses push, GitHub API, Vercel, atau database
  Production; seluruh observasi Production berasal dari screenshot Owner.
- **AC-to-evidence matrix:** [testing.md](../features/QA-DESK-SIMPLIFY/testing.md) dan
  [release.md](../features/QA-DESK-SIMPLIFY/release.md).
- **Evidence outcomes:** validate, typecheck, docs:check exit 0; `test:integration` 500/500 pada
  PostgreSQL 16 disposable; CI PR #37 hijau (konfirmasi Owner).
- **Change Impact Map:** Module/Feature — test management API, readiness baseline, migrasi trigger,
  kontrak additive; UI tidak berubah.
- **Decision Snapshot:** [solution.md](../features/QA-DESK-SIMPLIFY/solution.md) dan ADR-032.
- **Agent handoff and independent verification:** kode ditulis AGY; Claude (bukan penulis) menjalankan
  ulang suite penuh setelah rebase ke `221fa0a` dan memperbaiki backfill D6.
- **Quality review:** dua follow-up — duplikasi logika snapshot antara `ensureAutoBaseline` dan
  baseline manual; pemicu baseline di `updateRequirement` berjalan di luar transaksi.
- **Cross-layer quality gates:** N/A — tanpa perubahan UI atau query baru yang berat.

## Incident: migrasi Production tertinggal (085, 086)

| Fakta                                                                                                             | Bukti                            |
| ----------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| Sebelum 2026-10-14, migrasi terakhir di Production adalah `20260918000084`                                        | Screenshot `SequelizeMeta` Owner |
| `20260925000085` (index tasks) dan `20261001000086` (`bugs.environment`) sudah di `main` sejak 25 Sep dan 1 Okt   | `git log` file migrasi           |
| Model `Bug` membaca kolom `environment`, jadi akses Bug di Production kemungkinan gagal sejak kode 086 ter-deploy | `apps/api/src/db/models/bug.ts`  |
| Setelah migrasi Owner: 085–088 tercatat dan `bugs.environment` ada                                                | Screenshot SQL Editor 2026-10-14 |

Akar masalah: merge ke `main` men-deploy Production otomatis, sedangkan migrasi Production manual dan
tidak diperiksa di mana pun. Dampak error Bug di Production belum diverifikasi dari log (unverified).

## Follow-up

1. Smoke test Production sebagai QA (Bug terbuka, buat dan jalankan Test Case, hapus Test Case 0 run).
2. Pengecekan otomatis: gagalkan atau peringatkan bila `main` memiliki migrasi yang belum ada di
   Production (butuh keputusan Owner soal akses read-only CI ke database).
3. Refactor `ensureAutoBaseline` agar memakai jalur snapshot yang sama dengan baseline manual.
4. Pindahkan pemicu baseline di `updateRequirement` ke dalam transaksi yang sama.
5. UI drawer QA (Prompt A dan C) sebagai Feature terpisah.

## Source of truth and impact

- **Applicable SSoT:** docs/1 Baseline Kesiapan Feature, docs/2 §2 dan §5.
- **Policy IDs:** FLOW-005, QA-001, AI-013, AI-020.
- **Data/interface impact:** kontrak additive; baseline otomatis; hapus Test Case 0 run.
- **Authorization impact:** QA dapat mengedit Test Case aktif dalam scope; hapus oleh pembuat QA atau
  PO/Admin/Owner.
- **Migration risk:** 087 tidak mengubah data Production (0 Feature); 088 mengganti fungsi trigger.
