# DOC-CONSISTENCY-REMEDIATION — 2026-10-02

## Task

`DOC-CONSISTENCY-REMEDIATION` — rapikan inkonsistensi dokumentasi dan perketat `docs:check` untuk ADR.
Plan: [DOC_CONSISTENCY_REMEDIATION_PLAN](../plans/DOC_CONSISTENCY_REMEDIATION_PLAN.md).

## Outcome

- ADR Workload Conflict dinomori ulang menjadi
  [ADR-023](../adr/ADR-023-WORKLOAD-CONFLICT-AND-CROSS-WORKSPACE-PRIVACY-BOUNDARY.md); semua tautan
  aktif sudah diarahkan ke file baru dan ADR-023 masuk indeks. Isi keputusan tidak berubah.
- `README.md` root menjadikan Knowledge Map sebagai entry point dan menaut dokumen pendukung.
- `apps/web/README.md` menjelaskan stack, struktur `src/`, konfigurasi, dan skrip yang berlaku.
- 173 item `Done` dipindahkan dari `TODO.md` ke
  [arsip 2026-10-02](../archive/TODO_COMPLETED_2026-10-02.md); `TODO.md` kini hanya berisi 11 item
  terbuka.
- `docs:check` kini menolak nomor ADR ganda, nama file ADR yang tidak sesuai pola, ADR yang tidak
  ada atau berulang di indeks, dan memeriksa tautan lokal di `README.md` root serta `docs/adr/`.

File lama `docs/adr/ADR-016-WORKLOAD-CONFLICT-AND-CROSS-WORKSPACE-PRIVACY-BOUNDARY.md` dihapus oleh
user dengan `git rm` (executor tidak dapat menghapus file), lalu `npm run validate` lulus di repo
user.

## Work assurance

- **Work Readiness Assessment:** 4/16, `Ready` setelah D1–D5 disetujui; dokumentasi + script
  checker saja.
- **User plan approval:** plan disetujui di percakapan 2026-10-02 ("ok jalankan" setelah plan).
- **Step approval log:**
  - S0 + S1 — klaim TODO dan renumber ADR — disetujui ("ok jalankan"); diterapkan kecuali penghapusan file lama.
  - S2 + S3 — README root dan web — disetujui ("ok jalankan"); diterapkan.
  - S4 — arsip TODO — disetujui ("ok jalankan"); diterapkan.
  - S5 — checker ADR + laporan — disetujui ("ok jalankan"); diterapkan.
- **Agent capability and access:** executor (Claude, Cowork) hanya dapat membaca/menyalin file dari
  repo user dan menulis file kembali; **tidak** dapat menjalankan shell, `git`, menghapus, atau
  mengganti nama file di komputer user. Validasi dijalankan di salinan repo dalam container cloud
  (Node v22.22.0). Salinan memuat isi asli semua dokumen yang diperiksa checker; file lain yang
  hanya perlu ada (target tautan) dibuat sebagai file kosong berdasarkan daftar direktori repo.
- **AC-to-evidence matrix:**

| Acceptance Criterion                                                         | Required / achieved evidence level (E0–E4) | Primary evidence and environment                                                                                                             | Verification status                                       |
| ---------------------------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Setiap nomor ADR unik dan setiap ADR tercantum tepat sekali di indeks.       | E2 / E2 (salinan)                          | Unit test baru + `node scripts/checkDocs.mjs` di salinan dengan file lama dihapus → passed.                                                  | Accepted — dikonfirmasi `npm run docs:check` di repo user |
| Tidak ada tautan Markdown aktif ke `ADR-016-WORKLOAD-…`.                     | E1 / E1                                    | grep di salinan: hanya plan ini dan laporan historis 2026-09-25 (teks backtick).                                                             | Accepted                                                  |
| README root menyebut Knowledge Map sebagai entry point dan Policy Registry.  | E1 / E2                                    | Diff review + link check (kini dicakup `docs:check`).                                                                                        | Accepted                                                  |
| `apps/web/README.md` sesuai `package.json` dan isi `src/`.                   | E1 / E1                                    | Dicocokkan dengan `apps/web/package.json`, `vite.config.ts`, dan listing tiap folder `src/`.                                                 | Accepted                                                  |
| _Active work_ di `TODO.md` tanpa item `Done`; arsip berisi 173 item identik. | E1 / E1                                    | Script membandingkan teks item asli vs arsip (tanpa target tautan) → identik; 0 `[x]` di Active work.                                        | Accepted                                                  |
| `npm run validate` lulus.                                                    | E2 / E2                                    | `npm run validate` dijalankan user di macOS pada branch `antigravity/task-and-feature-generation-compliance`; output ditempel ke percakapan. | Accepted                                                  |

- **Evidence outcomes:**
  - Baseline salinan sebelum perubahan: `node scripts/checkDocs.mjs` → passed.
  - Unit test checker setelah S5: 12/12 lulus, 0 gagal, 0 skipped (sebelumnya 8/8).
  - Dengan file ADR lama ada: checker gagal dengan 2 error (`ADR number 016 is used by more than one file…`
    dan `docs/adr/README.md is missing ADR link: ADR-016-WORKLOAD-…`), sesuai harapan.
  - Dengan file lama dihapus: checker lulus.
  - Arsip TODO: 102 tautan relatif ditulis ulang agar tetap valid dari `docs/archive/`; 0 tautan
    tak-terselesaikan di TODO lama, TODO baru, maupun arsip.
  - `prettier --check` (config repo) pada script yang diubah → lolos setelah format.
- **Change Impact Map:** Module (dokumentasi + checker). Konsumen: kontributor/agent yang membaca
  ADR, Policy Registry, README, TODO; CI `validate`. Tidak ada dampak contract, data,
  authorization, UI, release, atau operasi.
- **Decision Snapshot:** lihat plan — Workload dinomori ulang (bukan Vendor-Neutral AI) karena
  rujukannya paling sedikit; tanpa stub redirect; laporan historis tidak diedit.
- **Agent handoff and independent verification:** baseline = working tree user pada 2026-10-02 (commit
  tidak diketahui; executor tidak punya akses `git`). `npm run validate` dijalankan ulang secara
  lokal oleh user (bukti primer); CI belum menjalankan perubahan ini.
- **Quality review:** Reuse — checker ADR memakai `extractMarkdownLinks` dan pola penghitungan yang
  sama dengan `validateFeatureCatalog`. Duplikasi — tidak ada aturan yang disalin ke README.
  Obsolete — `AGENT_UI_COMPONENT_POLICY.md` sengaja dipertahankan (Superseded). Regression — test
  baru mencakup kasus gagal dan lulus.
- **Cross-layer quality gates:** N/A — tidak ada perubahan UI, data access, performa, atau AI model.

## Source of truth and impact

- **Applicable SSoT:** [AGENTS.md](../../AGENTS.md), [Knowledge Map](../0_PRODUCT_KNOWLEDGE_MAP.md),
  [Agent Guidelines](../4_AGENT_DEV_GUIDELINES.md).
- **Policy IDs:** `DOC-001`, `DOC-002`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** None.
- **Authorization impact:** None (`AUTH-011` dan `FLOW-007` hanya berganti target tautan ADR).
- **Migration risk:** None.

## Changed files

- `docs/adr/ADR-023-WORKLOAD-CONFLICT-AND-CROSS-WORKSPACE-PRIVACY-BOUNDARY.md` — ADR yang dinomori ulang (baru).
- `docs/adr/ADR-016-WORKLOAD-CONFLICT-AND-CROSS-WORKSPACE-PRIVACY-BOUNDARY.md` — dihapus (`git rm` oleh user).
- `docs/adr/README.md` — baris ADR-023.
- `docs/POLICY_REGISTRY.md`, `docs/1_ARCHITECTURE.md`, `docs/2_WORKFLOW_AND_ROLES.md` — tautan ke ADR-023.
- `README.md` — bagian dokumentasi.
- `apps/web/README.md` — panduan aplikasi web.
- `TODO.md` — item tugas ini; arsip item `Done`.
- `docs/archive/TODO_COMPLETED_2026-10-02.md` — arsip baru.
- `scripts/checkDocs.mjs`, `scripts/checkDocs.test.mjs` — validasi ADR dan cakupan link check.
- `docs/plans/DOC_CONSISTENCY_REMEDIATION_PLAN.md` — plan.
- `docs/reports/DOC_CONSISTENCY_REMEDIATION_2026-10-02.md` — laporan ini.

## Validation

- `node --test scripts/checkDocs.test.mjs` (salinan, Node v22.22.0) — 12 passed, 0 failed, 0 skipped.
- `node scripts/checkDocs.mjs` (salinan, file lama dihapus) — passed.
- `node scripts/checkDocs.mjs` (salinan, file lama masih ada) — failed, 2 error ADR yang diharapkan.
- `npx prettier --check` (prettier 3, config repo) pada dua script — passed.
- `npm run validate` (repo user, macOS, dijalankan user setelah `git rm`) — passed:
  - `docs:check`: 12 passed, 0 failed, 0 skipped, 0 cancelled; `Documentation governance passed.`
  - `lint`: 0 errors, 37 warnings. Semua warning berada di `apps/api/src` dan `apps/web/src` yang
    tidak disentuh tugas ini (warning lama; tidak ditindaklanjuti di sini).
  - `typecheck`: `packages/contracts`, `apps/api`, `apps/web` — passed tanpa error.

## Risks or follow-up

- Working tree user berada di branch `antigravity/task-and-feature-generation-compliance` dengan
  perubahan lain yang belum di-commit; perubahan tugas ini sebaiknya di-commit terpisah.
- 37 lint warning lama di kode aplikasi dapat dijadikan TODO terpisah bila diinginkan.
- Tautan eksternal (di luar repo) ke path ADR lama akan rusak; diterima menurut keputusan D2.

## Human decision summary

Semua slice diterapkan dan `npm run validate` lulus di repo user. Yang masih butuh keputusan
manusia hanya commit/PR, mengikuti proses approval repository.

## TODO update

- `DOC-CONSISTENCY-REMEDIATION` → `Done` (dipindahkan ke arsip 2026-10-02)
