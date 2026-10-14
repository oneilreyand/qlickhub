# DOC-PORTAL — Tahap 4: Build Phase 01 — Extractor + portal awal

**Status:** Kandidat teruji
**Breakdown:** [../breakdown.md](../breakdown.md)
**AC phase ini:** AC-1.1–AC-1.5, AC-4.1 (Beranda & Stack, Fitur & Kontrak API), AC-4.3, AC-4.4
**Applicable Policy IDs:** AI-009, AI-013, AI-014, SDLC-001

## 1. Approval Window

| Item                             | Isi                                                                                                           |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Task ID                          | P1-DOC-1, P1-BE-1, P1-BE-2, P1-BE-3, P1-FE-1, P1-QA-1                                                         |
| Branch / baseline commit         | `feat/doc-portal` @ `0b88711` (`origin/main`)                                                                 |
| File/path yang diizinkan         | `tools/docsys/**`, `docsys.config.json`, `docs/features/DOC-PORTAL/**`, `package.json` (script), `.gitignore` |
| Urutan aksi yang diizinkan       | edit → test → commit → push branch → PR                                                                       |
| Pemeriksaan yang akan dijalankan | `npm run docsys:test`, smoke browser portal, `npm run validate`, `checkSdlc`, `checkTier`                     |
| Risiko & recovery                | Tidak menyentuh aplikasi; revert PR menghapus seluruh tool                                                    |
| Masa berlaku                     | sampai PR Phase 1 dibuat                                                                                      |
| Disetujui                        | reyand (Owner), G3 2026-10-14, sesi agent                                                                     |

## 2. Log perubahan

| Task     | File berubah                                                                               | Ringkasan                                                                                                                           |
| -------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| P1-DOC-1 | `docs/features/DOC-PORTAL/**`                                                              | Folder dari `sdlc:new`; tahap 0–3 yang disetujui; Stage Tracker                                                                     |
| P1-BE-1  | `tools/docsys/core/*`, `tools/docsys/schema/docs-data.schema.json`, `tools/docsys/cli.mjs` | Loader config, runner adapter, link fitur ↔ endpoint/schema, JSON Schema v1 + validator, CLI `extract`/`portal`                     |
| P1-BE-2  | `tools/docsys/adapters/*`                                                                  | `package-json`, `express-routes` (parser TypeScript, mount prefix, factory router), `zod-contracts`, `sequelize-models`, `markdown` |
| P1-BE-3  | `docsys.config.json`, `package.json`, `.gitignore`                                         | Config qlickhub; script `docs:extract`, `docs:portal`, `docsys:test`; `.docsys/` diabaikan git                                      |
| P1-FE-1  | `tools/docsys/portal/*`                                                                    | Portal statis tanpa dependency: state loading/empty/error, Beranda & Stack, Fitur & Kontrak API                                     |
| P1-QA-1  | `tools/docsys/__tests__/*`                                                                 | Test fixture proyek mini, test terhadap repo ini, smoke browser                                                                     |

## 3. Pemeriksaan yang dijalankan

| Perintah                                                               | Environment               | Exit code | Pass / fail / skip           | AC                     |
| ---------------------------------------------------------------------- | ------------------------- | --------- | ---------------------------- | ---------------------- |
| `npm run docsys:test`                                                  | workspace cloud, Node 22  | 0         | 14 / 0 / 3 (browser)         | AC-1.1–1.5             |
| `DOCSYS_CHROMIUM=… node --test tools/docsys/__tests__/portal.test.mjs` | workspace cloud, Chromium | 0         | 3 / 0 / 0                    | AC-4.1, AC-4.3, AC-4.4 |
| `npm run docs:extract` pada repo ini                                   | workspace cloud           | 0         | 0 peringatan adapter         | AC-1.1                 |
| `npm run validate`                                                     | workspace cloud           | 0         | lulus (15 warning lint lama) | —                      |
| `node scripts/checkSdlc.mjs --base origin/main`                        | workspace cloud           | 0         | lulus                        | —                      |
| `node scripts/checkTier.mjs --base origin/main`                        | workspace cloud           | 1         | Tier 2 — `package.json`      | —                      |

Perbandingan manual (P1-QA-1, E1 + E2):

| Hal                                | Hitungan independen                                               | Hasil extractor | Cocok |
| ---------------------------------- | ----------------------------------------------------------------- | --------------- | ----- |
| Endpoint `testManagementRoutes.ts` | 24 registrasi literal di file                                     | 24              | Ya    |
| Registrasi route modul             | 158 literal; `folderRoutes` di-mount 2× (+8); 3 route di `app.ts` | 169             | Ya    |
| Model                              | 58 file model (tanpa `index.ts`, `associations.ts`)               | 58              | Ya    |
| Versi stack                        | nilai `package.json` per workspace                                | sama            | Ya    |

Hasil ukur pertama (pengganti angka perkiraan di problem.md): 51 dari 169 endpoint disebut di dokumen
fitur; 326 schema; 292 relasi model; 32 ADR; 76 policy; 12 TODO terbuka, 0 dengan baris `Layer:`.

## 4. Deviasi dari rencana

| Deviasi                                     | Alasan                                                                                                  | Masih dalam scope? | Persetujuan baru?                                             |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------- |
| PR Phase 1 menjadi **Tier 2**, bukan Tier 1 | `package.json` termasuk `quality/tier2-paths.txt`; breakdown keliru menganggapnya Tier 1                | Ya                 | Ya — label `owner-approved`, atau tunda script npm ke Phase 2 |
| Smoke browser memakai `DOCSYS_CHROMIUM`     | Versi browser Playwright tidak tersedia di workspace; test melewati diri sendiri bila browser tidak ada | Ya                 | Tidak                                                         |

## 5. Hasil

- PR: dibuat Owner dari branch `feat/doc-portal` — Tier 2 — file Tier 2 yang cocok: `package.json`.
- Lanjut ke [testing.md](../testing.md) untuk tahap 5.
