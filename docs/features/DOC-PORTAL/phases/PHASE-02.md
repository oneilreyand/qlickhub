# DOC-PORTAL — Tahap 4: Build Phase 02 — Completeness + ratchet + CI

**Status:** Kandidat teruji
**Breakdown:** [../breakdown.md](../breakdown.md)
**AC phase ini:** AC-2.1–AC-2.5, AC-3.1–AC-3.5
**Applicable Policy IDs:** AI-009, AI-013, AI-014, DOC-002, SDLC-001

## 1. Approval Window

| Item                             | Isi                                                                                                                                                                                                                                                                                                  |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task ID                          | P2-BE-1, P2-BE-2, P2-BE-3, P2-BE-4, P2-DOC-1, P2-DOC-2, P2-QA-1                                                                                                                                                                                                                                      |
| Branch / baseline commit         | `feat/doc-portal-p2` @ `1d9d437` (`origin/main`, setelah PR #43)                                                                                                                                                                                                                                     |
| File/path yang diizinkan         | `tools/docsys/**`, `docsys.config.json`, `package.json`, `quality/doc-baseline.json`, `docs/adr/` (ADR-033 + indeks), `docs/POLICY_REGISTRY.md`, `docs/4_AGENT_DEV_GUIDELINES.md`, `AGENTS.md`, `docs/ux/UX_MATRIX.md`, `TODO.md`, `docs/features/FEATURE_CATALOG.md`, `docs/features/DOC-PORTAL/**` |
| Urutan aksi yang diizinkan       | edit → test → commit → push branch → PR (Tier 2)                                                                                                                                                                                                                                                     |
| Pemeriksaan yang akan dijalankan | `npm run validate`, simulasi gap baru, `checkSdlc`, `checkTier`                                                                                                                                                                                                                                      |
| Risiko & recovery                | Gate salah memblokir → `DOCSYS_MODE=report` atau hapus langkah `docs:completeness` dari `validate`                                                                                                                                                                                                   |
| Masa berlaku                     | sampai PR Phase 2 dibuat                                                                                                                                                                                                                                                                             |
| Disetujui                        | reyand (Owner), 2026-10-14 ("ok lanjutkan" atas Approval Window Phase 2), sesi agent                                                                                                                                                                                                                 |

## 2. Log perubahan

| Task     | File berubah                                                                                                            | Ringkasan                                                                                                                                      |
| -------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| P2-BE-1  | `tools/docsys/core/rules.mjs`                                                                                           | Rule `DS-R01`–`DS-R05`; setiap gap punya `rule`, `key` stabil, file, pesan, dan cara perbaikan                                                 |
| P2-BE-2  | `tools/docsys/core/completeness.mjs`, `tools/docsys/cli.mjs`                                                            | Perintah `completeness` dan `baseline --init/--shrink`; ratchet `added/known/resolved`; `DOCSYS_MODE=report`; laporan `.docsys/report.json`    |
| P2-BE-3  | `quality/doc-baseline.json`, `docsys.config.json`                                                                       | Baseline 130 gap (`DS-R01`=118, `DS-R03`=12); pemetaan 58 model ke 7 domain di `erd.domains` (`DS-R02` = 0)                                    |
| P2-BE-4  | `package.json`                                                                                                          | `docsys:test` dan `docs:completeness` masuk `validate`; script `docs:completeness`, `docs:baseline`                                            |
| P2-DOC-1 | `docs/adr/ADR-033-*.md`, `docs/adr/README.md`, `docs/POLICY_REGISTRY.md`, `docs/4_AGENT_DEV_GUIDELINES.md`, `AGENTS.md` | ADR-033 `Accepted` (berlaku saat merge dengan label), `DOC-006`, aturan di §2B dan checklist agent                                             |
| P2-DOC-2 | `docs/ux/UX_MATRIX.md`, `TODO.md`, `docs/features/FEATURE_CATALOG.md`                                                   | Template UX matrix 15 alur untuk 4 role (`DS-R04` = 0); format `Layer:` dan item TODO DOC-PORTAL; katalog bagian Feature folder (`DS-R05` = 0) |
| P2-QA-1  | `tools/docsys/__tests__/completeness.test.mjs`                                                                          | Test rule, ratchet, exit code CLI, mode report, `--init`/`--shrink`                                                                            |

## 3. Pemeriksaan yang dijalankan

| Perintah                                                                                     | Environment              | Exit code | Pass / fail / skip                                                        | AC                     |
| -------------------------------------------------------------------------------------------- | ------------------------ | --------- | ------------------------------------------------------------------------- | ---------------------- |
| `node --test tools/docsys/__tests__/completeness.test.mjs`                                   | workspace cloud, Node 22 | 0         | 8 / 0 / 0                                                                 | AC-2.1–2.5, AC-3.1–3.4 |
| `npm run validate`                                                                           | workspace cloud          | 0         | lulus; `docs:completeness` 130 gap lama, 0 baru                           | AC-3.5                 |
| Simulasi: tambah `GET /v1/meta/docsys-probe` tanpa dokumen, lalu `npm run docs:completeness` | workspace cloud          | 1         | gap baru `DS-R01` dengan file dan saran perbaikan; perubahan dikembalikan | AC-3.2                 |
| `npm run docs:baseline -- --shrink` setelah katalog dilengkapi                               | workspace cloud          | 0         | baseline 133 → 130                                                        | AC-3.3                 |
| `npx eslint tools/docsys`                                                                    | workspace cloud          | 0         | 0 error                                                                   | —                      |

## 4. Deviasi dari rencana

| Deviasi                                                                | Alasan                                                                    | Masih dalam scope?            | Persetujuan baru?    |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------- | -------------------- |
| `docs/features/FEATURE_CATALOG.md` ikut diubah (bagian Feature folder) | Membereskan 3 gap `DS-R05` milik folder SDLC sebagai bukti `--shrink`     | Ya (dokumen navigasi, Tier 1) | Tidak                |
| Pemetaan model → domain ditulis langsung di config, bukan dibaseline   | 58 gap `DS-R02` lebih berguna sebagai domain ERD yang bisa direview di PR | Ya                            | Tidak — review di PR |
| Uji CI merah/hijau memakai simulasi lokal, bukan PR uji terpisah       | Menghindari PR tambahan; perilaku sama karena CI menjalankan `validate`   | Ya                            | Tidak                |

## 5. Hasil

- PR: dibuat Owner dari branch `feat/doc-portal-p2` — Tier 2 — file Tier 2 yang cocok: `package.json`,
  `quality/doc-baseline.json`, `docs/adr/**`, `docs/POLICY_REGISTRY.md`, `docs/4_AGENT_DEV_GUIDELINES.md`,
  `AGENTS.md`.
- Lanjut ke [testing.md](../testing.md) untuk tahap 5.
