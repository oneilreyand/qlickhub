# DOC-PORTAL — Data, API, and Shared Contracts

**Applicable Policy IDs:** DOC-005, DOC-006

## Data and relations

Tidak ada entitas database, migrasi, atau data Workspace. Semua data berasal dari file di repo dan
ditulis ke file lokal:

| File                                        | Dibuat oleh                                         | Di-commit         | Isi                                                                                            |
| ------------------------------------------- | --------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------- |
| `docsys.config.json`                        | Manusia                                             | Ya                | Lokasi sumber, adapter aktif, pemetaan model → domain, daftar role dan kriteria UX, rule aktif |
| `docs-data.json` (di `.docsys/`)            | `docs:extract`                                      | Tidak (gitignore) | Fakta proyek hasil ekstraksi                                                                   |
| `.docsys/report.json`                       | `docs:completeness`                                 | Tidak             | Gap saat ini, gap baru, gap yang sudah beres                                                   |
| `quality/doc-baseline.json`                 | `docs:baseline` (inisialisasi), lalu hanya menyusut | Ya — Tier 2       | Daftar gap lama yang diterima: `rule`, `key`, `file`                                           |
| `tools/docsys/schema/docs-data.schema.json` | Manusia                                             | Ya                | JSON Schema `docs-data.json`, ber-`schemaVersion`                                              |

`docs-data.json` (schemaVersion 1), bagian tingkat atas:

| Bagian      | Sumber (adapter qlickhub)                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------- |
| `meta`      | `git rev-parse HEAD`, waktu, `schemaVersion`                                                      |
| `stack`     | `package.json` root + `apps/*` + `packages/*`, `.nvmrc`, `.github/workflows/*.yml`, `vercel.json` |
| `features`  | `docs/features/**` (kartu legacy + folder SDLC + Stage Tracker), `FEATURE_CATALOG.md`             |
| `endpoints` | `apps/api/src/app.ts` (prefix) + `apps/api/src/modules/**/*Routes.ts` via parser TypeScript       |
| `contracts` | Export `*Schema` di `packages/contracts/src/*.ts` (nama, file, field tingkat atas)                |
| `erd`       | `apps/api/src/db/models/*.ts` (tabel, kolom, asosiasi)                                            |
| `policies`  | `docs/POLICY_REGISTRY.md`                                                                         |
| `adrs`      | `docs/adr/ADR-*.md` (ID, judul, status, tanggal)                                                  |
| `todo`      | `TODO.md` bagian Active work (status, pemilik, tanggal, policy, baris `Layer:`)                   |
| `uxMatrix`  | `docs/ux/UX_MATRIX.md` + alur dari `docs/features/ROLE_FLOWS.md`                                  |

## API and executable contract

Tidak ada endpoint HTTP baru dan tidak ada perubahan pada `packages/contracts`. Antarmuka baru hanya
perintah npm:

| Perintah                            | Exit code                                                    |
| ----------------------------------- | ------------------------------------------------------------ |
| `npm run docs:extract`              | 0 sukses; 1 config/sumber tidak valid                        |
| `npm run docs:completeness`         | 0 tanpa gap baru (atau `DOCSYS_MODE=report`); 1 ada gap baru |
| `npm run docs:baseline -- --init`   | Hanya bila baseline belum ada                                |
| `npm run docs:baseline -- --shrink` | Menghapus entri yang sudah beres; tidak pernah menambah      |
| `npm run docs:portal`               | Server statis lokal; `--build` hanya menulis file statis     |

Antarmuka adapter (core): `{ id, detect(config), extract(context) → Partial<DocsData> }`.

## Boundary notes

- Terdampak: `tools/docsys/**` (baru), `package.json` root (script), `scripts/` bila perlu
  pembungkus, `.github/workflows/ci.yml` lewat `npm run validate`, `quality/doc-baseline.json`,
  `docs/ux/UX_MATRIX.md` (baru), `TODO.md` (baris `Layer:`), `POLICY_REGISTRY.md`, docs/4.
- Tidak terdampak: `apps/web`, `apps/api`, `packages/contracts`, database, Vercel, Production.
