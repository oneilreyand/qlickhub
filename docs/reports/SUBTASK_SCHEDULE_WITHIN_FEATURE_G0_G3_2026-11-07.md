# SUBTASK-SCHEDULE-WITHIN-FEATURE — Persiapan G0–G3, 2026-11-07

## Task

F1 dari [rencana F1–F4](../plans/QLICKHUB_FOLLOWUP_F1_F4_PLAN.md), item Codex.
Buat draft Feature folder, kemudian berhenti meminta persetujuan Owner sebelum build.

## Outcome

Fetch origin berhasil; branch `codex/f1-subtask-schedule-plan` dibuat dari `a717ba7`
(origin/main, PR #111). Folder dibuat dengan perintah scaffold kanonikal dan 14 dokumen diisi
untuk peninjauan G0–G3, shared contract/role, breakdown, serta rencana bukti dan rilis.
Belum ada tahap Disetujui, kode runtime, test produk, commit, push, PR, merge atau deployment.
F2–F4 dan tabel keputusan K1–K7 pada rencana induk tidak diubah.

## Work assurance

- **WRA dokumentasi:** Ready 2/16; external Git fetch 2, tujuh dimensi lain 0.
  **WRA build usulan:** 7/16, Blocked pada keputusan K1/L1/L2 dan gerbang produk/policy.
- **Approval Window:** instruksi eksplisit user 2026-11-07 untuk fetch, branch dari main,
  scaffold, isi G0–G3 dan berhenti. Cakupan mutasi hanya Feature folder, item TODO F1,
  navigasi/katalog dan laporan ini; window berakhir pada handoff sebelum build.
- **Fakta:** helper hanya pair/order; lifecycle Task tidak memeriksa parent range;
  syncPlanToFeature juga mengubah tanggal root langsung; scheduleHealth existing menilai
  overdue, bukan containment; role planning existing Owner/Admin/PO.
- **Konflik/unknown:** K1 belum terisi walau ringkasan rencana menyebut F1 siap. Teks aturan
  legacy dan mitigasi risiko berbeda tentang edit yang tidak memperburuk; L1 meminta keputusan.
  Aturan reopen terminal tidak eksplisit; L2 meminta keputusan. Tidak memilih diam-diam.
- **Capability:** source/SSoT, Node 24 dan tool docs tersedia. RTK.md tidak ditemukan pada
  repository/main atau lokasi parent/global umum yang diperiksa. Tidak membaca file env.
  Kemampuan PostgreSQL/runtime untuk phase implementasi belum dibuktikan di pekerjaan ini.
- **Change Impact Map:** pekerjaan saat ini dokumentasi saja. Usulan build adalah Feature change
  pada planning, Task/Feature Spec transaction/query, shared metadata dan UI; schema/izin tetap.
- **Decision Snapshot:** opsi guard server bersama direkomendasikan vs auto-shift vs status quo;
  pro/kontra dan opsi legacy/reopen tersedia di solution. Semua keputusan masih milik Owner.
- **AC-to-evidence persiapan:**

| AC persiapan                     | Bukti objektif                                                    | Level | Status                                |
| -------------------------------- | ----------------------------------------------------------------- | ----- | ------------------------------------- |
| Branch dari main terbaru         | fetch exit 0; merge-base/HEAD a717ba7                             | E2    | Diperiksa                             |
| Scaffold dan G0–G3 terisi        | sdlc:new exit 0; 14 dokumen, Stage Tracker/Card dan review isi    | E1/E2 | Disiapkan untuk Owner, bukan approval |
| Tidak memulai build/F2–F4        | diff scope hanya dokumentasi terkait F1; tabel induk identik main | E1/E2 | Diperiksa pada handoff                |
| Dokumen valid dan tanpa gap baru | docs:check/completeness/SDLC gate                                 | E2    | Hasil aktual pada bagian Validation   |
| Handoff sebelum build            | G2/G3 Blocked, build Belum mulai, meminta keputusan Owner         | E1    | Menunggu Owner                        |

- **Verifier:** pemeriksa struktural menilai dokumen; tidak mengklaim penerimaan produk.
  Owner menilai keputusan G0–G3. Independent runtime review/CI direncanakan pada phase P1.
- **Quality review:** inspeksi helper/query/policy dan Gallery mengidentifikasi reuse input,
  badge, audit dan validasi pair/order. Tidak ada duplikasi runtime, dependency atau kode usang
  baru karena runtime tidak berubah. Overlap scheduleHealth/advisory dipisah eksplisit dari
  invariant baru. Template telah diganti dengan isi F1, bukti produk tetap Planned.
- **Cross-layer gates:** planning menyediakan responsive states dan rencana PostgreSQL/concurrency/
  query-count/EXPLAIN; hasil aktual belum ada dan tidak diklaim. Model AI tidak berubah.

## Source of truth and impact

[Map](../0_PRODUCT_KNOWLEDGE_MAP.md), [Architecture](../1_ARCHITECTURE.md),
[Workflow §4](../2_WORKFLOW_AND_ROLES.md#aturan-transisi-subtask),
[UI §7](../3_UI_ATOMIC_DESIGN_SYSTEM.md#7-responsive--atomic-quality-gate),
[Guidelines §2A–2B](../4_AGENT_DEV_GUIDELINES.md).
Policies: `SDLC-001`, `SDLC-002`, `DOC-002`, `DOC-003`, `DOC-004`, `DOC-005`, `DOC-006`,
`AUTH-002`, `DOMAIN-002`, `CONTRACT-001`, `TEST-001`, `FLOW-007`, `AI-020`.

Data/interface/authorization/migration impact sekarang: tidak ada. Proposal metadata baca additive
serta mutation error 400/409 dibahas untuk approval. Aturan domain baru memerlukan ADR dan SSoT
sebelum implementasi; belum mengubah policy kanonikal atau memesan nomor ADR.

## Changed files

- docs/features/SUBTASK-SCHEDULE-WITHIN-FEATURE/ — 14 dokumen hasil scaffold yang diisi untuk F1.
- docs/features/FEATURE_CATALOG.md dan README.md — navigasi draft.
- TODO.md — hanya item F1, PRD In progress; BE/FE Todo dan build Blocked.
- Laporan ini — fakta, keputusan terbuka, scope, bukti dan batasnya.

## Validation

- Node 24.15.0; `git fetch origin`: exit 0. HEAD/origin/main `a717ba7`; branch baru dibuat
  dari baseline itu, tanpa commit baru. Pemeriksaan ancestry dan kesamaan HEAD/main lulus.
- `npm run sdlc:new -- feature SUBTASK-SCHEDULE-WITHIN-FEATURE`: exit 0;
  14 dokumen dari scaffold dipenuhi, termasuk empat Stage Card; tidak ada tahap approved.
- `npm run docs:check`: exit 0, **12 pass / 0 fail / 0 skip**; governance lulus.
- `npm run docs:completeness`: exit 0; **85 baseline gaps / 0 baru** (DS-R01=75, DS-R03=10).
- `npm run sdlc:check -- --base origin/main`: exit 0, no runtime code changed. CLI ini
  menilai committed diff; pemeriksaan worktree terpisah menggunakan evaluateChanges pada
  tracked dan untracked files membuktikan **18 file docs/TODO, 0 runtime, 0 error**.
- Canonical evaluateTier pada seluruh 18 file worktree: **Tier 1, 0 Tier 2 matches**.
  ADR/SSoT mendatang akan Tier 2 jika benar-benar diubah; belum diubah pada pekerjaan ini.
- Perbandingan exact membuktikan rencana induk (termasuk tabel K1–K7) identik origin/main dan
  seluruh TODO selain blok F1 identik main. Tidak ada F2–F4 yang dikerjakan.
- `git diff --check`: exit 0; Prettier pada Feature folder/laporan lulus.
- Pemeriksaan pola secret atas 18 file: **0 kecocokan** setelah memperbaiki token-boundary
  pada scanner diagnostik. Run pertama exit 1 karena substring `sk-` di URL slug subtask
  salah dikenali sebagai token; tidak ada nilai credential yang ditampilkan atau disalin.
  Scanner diperbaiki, bukan konten/test produk yang dilemahkan; pemeriksaan ini bukan audit keamanan lengkap.
- Tidak ada tes runtime/PostgreSQL/UI/E2E, npm run build atau full validate yang dijalankan;
  bukti produk tetap Planned dan tidak dihitung sebagai hasil passing.

## Risks or follow-up

K1/L1/L2, G0–G3 dan ADR/SSoT belum disetujui. K2–K7 tidak disentuh; F2–F4 tetap tidak dimulai.
Skema/indeks baru, perubahan authorization/dependency atau scope material memerlukan keputusan baru.
Dokumen persiapan belum di-commit atau di-push. Tier final dinilai dari seluruh path berubah.

## Human decision summary

Tinjau [Feature overview dan Stage Cards](../features/SUBTASK-SCHEDULE-WITHIN-FEATURE/README.md).
Rekomendasi: K1 tolak tanpa auto-shift; L1 edit tanggal harus menghasilkan rentang valid penuh,
metadata aman; L2 blok reopen yang masih di luar rentang. Setujui/revisi G0–G3 dan window P1 lokal
setelah keputusan/policy gate selesai. Berhenti sebelum implementasi sampai jawaban eksplisit Owner.

## TODO update

SUBTASK-SCHEDULE-WITHIN-FEATURE → Blocked (persiapan G0–G3 tersedia; menunggu Owner sebelum build).

## Continuation after Owner approval

Laporan di atas adalah snapshot sebelum approval build. Owner kemudian menjawab `ok` atas
G0–G3/K1/L1/L2 pada 2026-11-07 dan mengizinkan ADR/SSoT dahulu lalu Phase 1 lokal.
Status terbaru dan hasil implementasi ada pada [laporan Phase 1](SUBTASK_SCHEDULE_WITHIN_FEATURE_P1_2026-11-07.md).
Snapshot persiapan tidak dipakai sebagai klaim status runtime saat ini.
