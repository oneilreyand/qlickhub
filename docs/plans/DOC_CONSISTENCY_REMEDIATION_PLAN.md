# Documentation Consistency Remediation Plan

**Status:** Implemented — S0–S5 diterapkan; `npm run validate` lulus 2026-10-02
**Task:** `DOC-CONSISTENCY-REMEDIATION`
**Report:** [DOC_CONSISTENCY_REMEDIATION_2026-10-02](../reports/DOC_CONSISTENCY_REMEDIATION_2026-10-02.md)
**Policy boundaries:** `DOC-001`, `DOC-002`, `DOC-003`, `DOC-004`
**Tanggal:** 2026-10-02

## Confirmed facts

Fakta di bawah diverifikasi dengan membaca file sumber pada 2026-10-02.

1. **Nomor ADR-016 dipakai dua kali.**
   - `docs/adr/ADR-016-VENDOR-NEUTRAL-AI-WORK-ASSURANCE.md` (Accepted, 2026-09-24) — tercantum di
     `docs/adr/README.md`, dirujuk oleh ADR-017 (`Refines:`), `4_AGENT_DEV_GUIDELINES.md:104`, dan
     Policy `AI-002`…`AI-006`.
   - `docs/adr/ADR-016-WORKLOAD-CONFLICT-AND-CROSS-WORKSPACE-PRIVACY-BOUNDARY.md` (Accepted,
     2026-09-25) — **tidak** tercantum di indeks ADR, tetapi dirujuk oleh `POLICY_REGISTRY.md`
     (`AUTH-011`, `FLOW-007`), `1_ARCHITECTURE.md:327`, dan `2_WORKFLOW_AND_ROLES.md:218`.
   - Laporan `WORKLOAD_CONFLICT_AND_TEAM_TIMELINE_2026-09-25.md` menyebut path lama dalam backtick
     (bukan tautan Markdown), sehingga tidak akan menjadi tautan rusak.
2. **`README.md` root belum selaras dengan `AGENTS.md`.** README menyebut "4 core SSoT pillars" dan
   tidak menyebut `docs/0_PRODUCT_KNOWLEDGE_MAP.md` (entry point wajib, `DOC-001`) maupun
   `docs/POLICY_REGISTRY.md`.
3. **`apps/web/README.md` usang.** Isinya "Source code will live under `src/`", padahal `src/` sudah
   berisi `app/`, `components/`, `config/`, `features/`, `hooks/`, `lib/`, `pages/`, `store/`,
   `test/`, dan `package.json` punya skrip `dev`, `build`, `typecheck`, `test`, `test:e2e`.
4. **`TODO.md` melanggar aturannya sendiri.** Header menyatakan "intentionally contains only
   unfinished work", tetapi bagian _Active work_ berisi **173 item `Done`** dan hanya **10 item
   terbuka** (6 `In progress`, 4 `Blocked`). Ukuran file ~170 KB.
5. **`npm run docs:check` tidak menangkap masalah 1–3.** `scripts/checkDocs.mjs` tidak memeriksa
   keunikan nomor ADR, kelengkapan indeks ADR, maupun tautan di `README.md` root / `docs/adr/`.

### Koreksi atas review sebelumnya

- Hierarki `Folder → Subfolder` di `DESIGN_IMPLEMENTATION_PLAN.md` **bukan** inkonsistensi:
  `1_ARCHITECTURE.md` §(Folder Depth) mengizinkan maksimal 2 level folder. Temuan ini dicabut.
- `docs/AGENT_UI_COMPONENT_POLICY.md` sudah berlabel _Superseded_ dan sengaja dipertahankan untuk
  tautan historis. Tidak perlu tindakan.

## Unresolved decisions

| #   | Keputusan                                      | Rekomendasi                                                                           |
| --- | ---------------------------------------------- | ------------------------------------------------------------------------------------- |
| D1  | ADR mana yang dinomori ulang?                  | Workload Conflict → **ADR-023** (lebih baru, tidak terindeks, lebih sedikit rujukan). |
| D2  | Simpan stub redirect di path lama?             | Tidak. Path lama hanya muncul sebagai teks backtick di laporan historis.              |
| D3  | Ubah laporan historis yang menyebut path lama? | Tidak (`DOC-003`: laporan adalah bukti saat itu). Cukup catatan di ADR-023.           |
| D4  | Nama arsip TODO                                | `docs/archive/TODO_COMPLETED_2026-10-02.md`, mengikuti pola arsip yang ada.           |
| D5  | Seberapa jauh checker diperketat?              | Keunikan nomor ADR + kelengkapan indeks ADR + link check `README.md` & `docs/adr/`.   |

## Slices (masing-masing butuh persetujuan sebelum dieksekusi)

### S0 — Klaim tugas

Tambahkan `DOC-CONSISTENCY-REMEDIATION` ke `TODO.md` sebagai `In progress`.

### S1 — Renumber ADR Workload Conflict → ADR-023 (D1–D3)

- `git mv docs/adr/ADR-016-WORKLOAD-CONFLICT-AND-CROSS-WORKSPACE-PRIVACY-BOUNDARY.md docs/adr/ADR-023-WORKLOAD-CONFLICT-AND-CROSS-WORKSPACE-PRIVACY-BOUNDARY.md`
- Ubah judul menjadi `# ADR-023: …`; tambah baris
  `**Renumbered:** 2026-10-02, sebelumnya ADR-016 (bentrok nomor dengan Vendor-Neutral AI Work Assurance).`
- Perbarui tautan di `docs/POLICY_REGISTRY.md` (`AUTH-011`, `FLOW-007`),
  `docs/1_ARCHITECTURE.md:327`, `docs/2_WORKFLOW_AND_ROLES.md:218`.
- Tambahkan baris ADR-023 ke `docs/adr/README.md`.
- Isi keputusan tidak berubah, jadi **bukan** perubahan kebijakan (tidak perlu ADR baru per `DOC-002`).

### S2 — Selaraskan `README.md` root

- Ganti "4 core SSoT pillars" dengan urutan baca yang sama seperti `AGENTS.md`: Knowledge Map
  (entry point) → SSoT 1–4 → Policy Registry → TODO.
- Tambahkan satu baris navigasi ke `docs/adr/`, `docs/features/`, `docs/plans/`, `docs/reports/`.
- Tidak menyalin aturan; hanya menautkan (`DOC-001`).

### S3 — Perbarui `apps/web/README.md`

- Stack aktual (React 18 + Vite + React Router 7 + Redux Toolkit, Tailwind), struktur `src/` saat
  ini, dan skrip `dev` / `build` / `typecheck` / `test` / `test:e2e`.
- Tautkan ke `docs/3_UI_ATOMIC_DESIGN_SYSTEM.md` untuk aturan komponen.

### S4 — Arsipkan item `Done` dari `TODO.md` (D4)

- Pindahkan 173 item `- [x] **Done**` dari _Active work_ ke
  `docs/archive/TODO_COMPLETED_2026-10-02.md` **tanpa mengubah isinya** dan dengan urutan yang sama.
- Tambahkan tautan arsip baru ke daftar arsip di header `TODO.md`.
- _Product direction_, 10 item terbuka, dan _Explicitly deferred_ tetap di tempat.

### S5 — Perketat `docs:check` (D5)

- `scripts/checkDocs.mjs`: tambah `validateAdrNumbering` (gagal jika satu nomor `ADR-NNN` dipakai
  > 1 file) dan `validateAdrIndex` (setiap file ADR harus ditautkan tepat sekali di
  > `docs/adr/README.md`).
- Perluas `validateLocalLinks` ke `README.md` root dan `docs/adr/**`.
- `scripts/checkDocs.test.mjs`: unit test untuk nomor ganda, ADR tidak terindeks, dan kasus valid.
- Dikerjakan **setelah** S1 supaya checker langsung hijau.

## Files likely to change

| Slice | File                                                                                                                                                            |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S0    | `TODO.md`                                                                                                                                                       |
| S1    | `docs/adr/ADR-016-WORKLOAD-…` → `ADR-023-WORKLOAD-…`, `docs/adr/README.md`, `docs/POLICY_REGISTRY.md`, `docs/1_ARCHITECTURE.md`, `docs/2_WORKFLOW_AND_ROLES.md` |
| S2    | `README.md`                                                                                                                                                     |
| S3    | `apps/web/README.md`                                                                                                                                            |
| S4    | `TODO.md`, `docs/archive/TODO_COMPLETED_2026-10-02.md` (baru)                                                                                                   |
| S5    | `scripts/checkDocs.mjs`, `scripts/checkDocs.test.mjs`                                                                                                           |
| Akhir | `docs/reports/DOC_CONSISTENCY_REMEDIATION_<tanggal>.md` (baru, pakai `AGENT_REPORT_TEMPLATE.md`)                                                                |

## Impact

- **Data / interface / shared contract:** tidak ada.
- **Authorization:** tidak ada; Policy `AUTH-011` dan `FLOW-007` hanya berganti target tautan.
- **Migration risk:** tidak ada migrasi database. Satu-satunya risiko adalah tautan eksternal (di luar
  repo) ke path ADR lama; diterima menurut D2.
- **CI:** S5 membuat `npm run validate` lebih ketat. Jika ada pelanggaran lain yang belum diketahui,
  CI akan merah sampai diperbaiki. Itu perilaku yang diinginkan.

## Work Readiness Assessment

| Dimension           |      Score | Basis                                                 |
| ------------------- | ---------: | ----------------------------------------------------- |
| Requirement clarity |          1 | Temuan terverifikasi; D1–D5 butuh konfirmasi.         |
| Affected layers     |          1 | Dokumentasi + script checker.                         |
| Data/migration      |          0 | Tidak ada.                                            |
| Authorization       |          0 | Tidak ada.                                            |
| Shared contract     |          0 | Tidak ada.                                            |
| Coupling            |          1 | Banyak dokumen menaut Policy Registry dan ADR.        |
| Validation          |          1 | `npm run docs:check`, unit test checker, diff review. |
| External dependency |          0 | Tidak ada.                                            |
| **Total**           | **4 / 16** | **Low — Ready setelah D1–D5 disetujui.**              |

## Acceptance criteria and evidence

| Acceptance Criterion                                                                | Objective evidence                                                                               | Level |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ----- |
| Setiap nomor ADR unik dan setiap ADR tercantum tepat sekali di indeks.              | Unit test S5 + `npm run docs:check` lulus.                                                       | E2    |
| Tidak ada tautan Markdown ke `ADR-016-WORKLOAD-…` di dokumen aktif.                 | `grep -rn "ADR-016-WORKLOAD" docs README.md AGENTS.md` → hanya laporan historis (teks backtick). | E1    |
| README root menyebut Knowledge Map sebagai entry point dan Policy Registry.         | Diff review + link check.                                                                        | E1    |
| `apps/web/README.md` sesuai `package.json` dan isi `src/`.                          | Diff review terhadap `apps/web/package.json` & `ls src`.                                         | E1    |
| Bagian _Active work_ di `TODO.md` hanya berisi item `In progress`/`Blocked`/`Todo`. | `grep -c "^- \[x\]"` pada bagian Active work = 0.                                                | E1    |
| Jumlah item arsip baru = 173 dan isinya identik.                                    | Perbandingan jumlah baris + diff isi sebelum/sesudah.                                            | E1    |
| `npm run validate` lulus.                                                           | Output perintah tercatat di report.                                                              | E2    |

## Change Impact Map

`ADR index → Policy Registry → SSoT 1/2 → Feature Card (tidak berubah) → docs:check → CI`

| Area                  | Impact                                         |
| --------------------- | ---------------------------------------------- |
| ADR / Policy Registry | Tautan diperbarui, isi kebijakan tetap.        |
| Entry docs (README)   | Navigasi diselaraskan dengan `AGENTS.md`.      |
| Backlog               | Riwayat pindah ke arsip, status tidak berubah. |
| Checker / CI          | Aturan baru untuk ADR dan cakupan link check.  |
| Aplikasi, API, data   | Tidak berubah.                                 |

## Decision Snapshot

| Alternative                          | Decision | Consequence                                                    |
| ------------------------------------ | -------- | -------------------------------------------------------------- |
| Renumber Workload → ADR-023          | Selected | Rujukan sedikit (4 file), ADR AI yang lebih tua tetap stabil.  |
| Renumber Vendor-Neutral AI → ADR-023 | Rejected | Menyentuh ADR-017, Agent Guidelines, 5 Policy ID AI.           |
| Pakai sufiks (ADR-016a / ADR-016b)   | Rejected | Melanggar pola penomoran berurutan; checker sulit ditegakkan.  |
| Biarkan dan hanya tambah ke indeks   | Rejected | Ambiguitas "ADR-016" tetap ada di diskusi dan Policy Registry. |

## Recovery

Semua perubahan berupa dokumen dan script, jadi bisa dibatalkan dengan `git revert` per slice. Jika
S5 memunculkan pelanggaran lain yang belum diketahui, slice itu ditunda (`Blocked`) dan temuan baru
dilaporkan, tanpa melemahkan checker.

## Quality review intent

Pastikan tidak ada aturan yang disalin ke README, tidak ada isi item TODO yang berubah saat
diarsipkan, tidak ada laporan historis yang diedit, dan checker baru punya test untuk kasus gagal
maupun lulus.
