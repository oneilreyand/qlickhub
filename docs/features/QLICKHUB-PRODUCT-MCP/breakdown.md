# QLICKHUB-PRODUCT-MCP — Tahap 3: Breakdown

**Status:** Draft
**Gerbang:** G3 — belum disetujui
**Applicable Policy IDs:** AI-002, AI-005, AI-009, AI-013, AI-014, SDLC-001, SDLC-002

## WRA dan capability

Estimasi Feature: requirement 1 + lapisan 2 + data 1 + auth 2 + contract 1 +
ketersinggungan 2 + validasi 2 + eksternal 2 = **13/16, Blocked untuk implementasi**.
Jalur Penuh. Unknown auth/Apply/host di solution.md harus diselesaikan sebelum Build.
Akses file dan pemeriksaan docs tersedia. PostgreSQL, OAuth provider, staging, akun client dan
UAT belum diverifikasi; draft ini tidak menyatakan runtime Ready.

Pembaruan dokumen saat ini: **WRA 3/16, Ready** (requirement 0, lapisan 0, data 0,
auth 0, contract 0, ketersinggungan 1, validasi 2, eksternal 0).
AC dokumen: pilihan user tercatat; fakta/usulan terpisah; AC runtime punya jalur evidence;
tautan dan struktur lolos pemeriksaan. Bukti: diff review + docs:check + docs:completeness.

## Peta phase usulan

| Phase | Hasil dan AC utama                          | BE                                                       | FE                                     | QA                                              | Dependensi / readiness                                      |
| ----- | ------------------------------------------- | -------------------------------------------------------- | -------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------- |
| P0    | Problem, ADR keputusan, kontrak, breakdown  | Analisis service/auth                                    | Review OAuth UI jika diperlukan        | Review test plan                                | Draft docs; belum approve                                   |
| P1    | OAuth + profil + Workspace read; AC-1.1/1.2 | Grant, discovery, revocation, policy read                | Login/consent bila perlu               | E3 akses dan token + staging login              | WRA belum final sampai provider dipilih; pecah lagi bila >8 |
| P2    | Preview dan konteks Folder/Spec; AC-2.1     | Tool/schema, bounded read, no-write                      | N/A: agent UI                          | E2/E3 no-write, denial                          | Setelah P1 Accepted; estimasi WRA 8                         |
| P3    | Publish atomik + retry + audit; AC-3.1–3.4  | Orchestration bersama primitive transaction-aware, dedup | N/A: hasil di halaman Feature existing | E3 atomicity, concurrency, audit, regression UI | WRA perlu dihitung ulang; pecah bila >8 sebelum G3          |
| P4    | Onboarding tiga client; AC-4.1              | Transport/observability staging                          | Panduan koneksi                        | E4 Codex/Claude/Antigravity + source read-back  | Setelah publish Accepted, akun client tersedia              |
| P5    | Release terukur                             | Rate limit, metrics, rollback                            | N/A bila UI tidak berubah              | Verifier dan target smoke                       | ADR/SSoT, QA, PO dan izin deployment                        |

Ini roadmap dependency, bukan fase yang telah Ready. Auth/publish tidak dipaksa menjadi WRA ≤8
dengan mengabaikan persistence atau UAT. Breakdown task rinci dan WRA setiap slice menjadi syarat G3.

## Change Impact Map dan berkas calon

Cross-boundary change untuk implementasi. MCP → auth principal → Workspace/Feature Spec policy →
persistence + audit + receipt → UI/REST pembaca yang sudah ada.
Calon area: apps/api/src/modules/mcp, modules/auth, modules/featureSpecs, policies,
packages/contracts/src, migrations Sequelize, app wiring, integration tests, dokumen deployment.
Provider/SDK dependency, OAuth UI, migrations, dan host belum dipilih.
Dampak data: additive grants/dedup mungkin diperlukan. Authorization: principal baru, tanpa role
baru. Migration risk: additive, perlu clean migration dan recovery; tidak ada backfill/destructive
migration yang diotorisasi. UI baru perlu Atomic/touch/keyboard serta tiga breakpoint jika ada.

## Window pembaruan dokumentasi saat ini

Instruksi user “update docnya”, 2026-11-03, mencakup draft Feature ini, indeks Feature/plan,
tautan P9, TODO, dan laporan. Baseline 058d6d1, working tree awal bersih.
Urutan: scaffold → tulis docs → pemeriksaan docs → perbaikan dalam scope → laporan.
Berlaku sampai handoff pembaruan docs di chat ini. Tidak mencakup implementasi, credential,
dependency, migration, commit/push/PR atau deploy. Pemulihan: revert hanya diff dokumentasi task ini.
Unknown teknis dicatat, tidak diputuskan melalui window docs.

## Decision Snapshot dan stop conditions

Alternatif material di solution.md. Sebelum runtime, ADR + SSoT harus menyelesaikan arti
konfirmasi agent sebagai Apply, pilihan OAuth, dan transaksi publish. Aktivasi docs/5 tidak masuk
scope. Tiap phase meminta window yang konkret setelah G3; jangan mewariskan window docs.
