# QLICKHUB-PRODUCT-MCP — Tahap 3: Breakdown

**Status:** Draft
**Gerbang:** G3 — belum disetujui
**Applicable Policy IDs:** AI-002, AI-005, AI-009, AI-013, AI-014, SDLC-001, SDLC-002

## WRA dan capability

Estimasi Feature: requirement 1 + lapisan 2 + data 1 + auth 2 + contract 1 +
ketersinggungan 2 + validasi 2 + eksternal 2 = **13/16, Blocked untuk implementasi**, berlaku untuk
keseluruhan v1–v3; setiap phase dipecah sampai WRA ≤8 sebelum Build.
Jalur Penuh. Unknown auth/Apply/host di solution.md harus diselesaikan sebelum Build.
Akses file dan pemeriksaan docs tersedia. PostgreSQL, OAuth provider, staging, akun client dan
UAT belum diverifikasi; draft ini tidak menyatakan runtime Ready.

Pembaruan dokumen 2026-11-03: WRA 3/16, Ready. Pembaruan dokumen 2026-11-18 (perluasan semua role):
**WRA 2/16, Ready** (requirement 1, lapisan 0, data 0, auth 0, contract 0, ketersinggungan 1,
validasi 0, eksternal 0). AC dokumen D-1–D-7 di
[rencana perluasan](../../plans/QLICKHUB_MCP_ALL_ROLES_PLAN.md); bukti: diff review + docs:check +
docs:completeness.

## Peta phase usulan

| Phase | Hasil dan AC utama                            | BE                                                                     | FE                                     | QA                                                             | Dependensi / readiness                                      |
| ----- | --------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------- |
| P0    | Problem, ADR keputusan, kontrak, breakdown    | Analisis service/auth                                                  | Review OAuth UI jika diperlukan        | Review test plan                                               | Draft docs; belum approve                                   |
| P1    | OAuth + profil + Workspace read; AC-1.1/1.2   | Grant, discovery, revocation, policy read                              | Login/consent bila perlu               | E3 akses dan token + staging login                             | WRA belum final sampai provider dipilih; pecah lagi bila >8 |
| P2    | Preview dan konteks Folder/Spec; AC-2.1       | Tool/schema, bounded read, no-write                                    | N/A: agent UI                          | E2/E3 no-write, denial                                         | Setelah P1 Accepted; estimasi WRA 8                         |
| P3    | Publish atomik + retry + audit; AC-3.1–3.4    | Orchestration bersama primitive transaction-aware, dedup               | N/A: hasil di halaman Feature existing | E3 atomicity, concurrency, audit, regression UI                | WRA perlu dihitung ulang; pecah bila >8 sebelum G3          |
| P4    | Onboarding tiga client; AC-4.1                | Transport/observability staging                                        | Panduan koneksi                        | E4 Codex/Claude/Antigravity + source read-back                 | Setelah publish Accepted, akun client tersedia              |
| P5    | Release terukur                               | Rate limit, metrics, rollback                                          | N/A bila UI tidak berubah              | Verifier dan target smoke                                      | ADR/SSoT, QA, PO dan izin deployment                        |
| P6    | v1 bantuan assign; AC-5.1/5.2                 | Tool kandidat + cek bentrok di atas assignment-preview/timeline        | N/A: agent UI                          | E3 kecocokan spesialisasi, bentrok, redaksi lintas Workspace   | Bersama P2; estimasi WRA 6                                  |
| P7    | v2 baca semua role + Leader; AC-6.x, 7.1, 9.x | Tool read memanggil service + requireTaskReadAccess; filter tools/list | N/A                                    | E3 akses ADR-043, Leader Owner/Admin, tools/list per role      | Setelah P1; estimasi WRA 7                                  |
| P8a   | v3 write Developer; AC-8.1/8.3                | Claim, status, AC check, komentar, blocker, readiness, resolusi Bug    | N/A                                    | E3 transisi status, assignee, 409, audit; E4 konfirmasi client | Setelah ADR K3 + P7; estimasi WRA 8                         |
| P8b   | v3 write QA; AC-8.2/8.3                       | Test case, run, hasil, evidence, Bug, retest, readiness                | N/A                                    | E3 aturan QA, audit; E4 konfirmasi client                      | Setelah ADR K3 + P7; estimasi WRA 8                         |
| P9    | Prompts per role (K8) + UAT Tier B            | MCP prompts yang menautkan SSoT                                        | Panduan setup                          | E4 Claude/Codex/Antigravity; catat OpenCode/Gemini CLI         | Setelah P7; estimasi WRA 5                                  |

Ini roadmap dependency, bukan fase yang telah Ready. Estimasi WRA P6–P9 dihitung ulang sebelum G3.
Tool bug Developer (`report_own_bug`) dan tiket Support menunggu BUG-INTAKE-SLA; K9 dan K10 diputuskan opsi a (tanpa perubahan authorization). Auth/publish tidak dipaksa menjadi WRA ≤8
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

## Window pembaruan dokumentasi

2026-11-03: instruksi user "update docnya" untuk draft v1, baseline 058d6d1.

2026-11-18: Owner menyetujui rencana perluasan semua role beserta rekomendasi K1–K8, dengan PR
ditahan sampai Owner menyetujui. Worktree terpisah `.worktrees/wt-mcp-roles`, branch
`claude/mcp-all-roles-docs`, baseline `origin/main` @ `e710d525`, dibuat oleh Owner. Path:
folder Feature ini, `docs/plans/README.md`, rencana perluasan, laporan, item MCP di `TODO.md`, dan
baris katalog Feature. Tidak mencakup kode, migration, ADR Accepted, SSoT/policy, credential,
commit/push/PR, atau deploy. Pemulihan: buang branch/worktree tersebut.

## Decision Snapshot dan stop conditions

Alternatif material di solution.md. Sebelum runtime, ADR + SSoT harus menyelesaikan arti
konfirmasi agent sebagai Apply dan write Dev/QA (K3), pilihan OAuth, dan transaksi publish. Aktivasi docs/5 tidak masuk
scope. Tiap phase meminta window yang konkret setelah G3; jangan mewariskan window docs.
