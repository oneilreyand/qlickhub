# docsys — portal dokumentasi lokal + completeness check

`docsys` membaca kode dan dokumen sebuah repo, menulis satu file data (`docs-data.json`), menampilkan
portal lokal tanpa login, dan menolak gap dokumen baru di CI dengan pola _ratchet_. Tidak ada
dependency selain `typescript` (dipakai sebagai parser) dan Node.js ≥ 20.

```text
repo ──► adapter ──► docs-data.json ──► portal (localhost)
                │
                └──► rules DS-R01…R05 ──► baseline ratchet ──► exit 0 / 1 di CI
```

## Perintah

| Perintah                                      | Fungsi                                                                            |
| --------------------------------------------- | --------------------------------------------------------------------------------- |
| `node tools/docsys/cli.mjs extract`           | Menulis `<output>/docs-data.json` (default `.docsys/`), termasuk ringkasan gap    |
| `node tools/docsys/cli.mjs portal`            | Portal di `http://localhost:4310` (`--port n`; `--build` menulis HTML statis)     |
| `node tools/docsys/cli.mjs completeness`      | Exit 1 bila ada gap yang tidak ada di baseline; laporan di `<output>/report.json` |
| `node tools/docsys/cli.mjs baseline --init`   | Membuat baseline pertama dari semua gap saat ini                                  |
| `node tools/docsys/cli.mjs baseline --shrink` | Menghapus entri yang sudah beres; tidak pernah menambah                           |
| `DOCSYS_MODE=report … completeness`           | Mode darurat: gap baru dilaporkan tetapi tidak memblokir                          |

Semua perintah menerima `--root <dir>` dan `--config <file>` (default `docsys.config.json`).

## Struktur

| Folder       | Isi                                                                                        | Spesifik proyek? |
| ------------ | ------------------------------------------------------------------------------------------ | ---------------- |
| `core/`      | Loader, runner adapter, link fitur ↔ endpoint/schema, validator JSON Schema, rule, ratchet | Tidak            |
| `adapters/`  | `package-json`, `express-routes`, `zod-contracts`, `sequelize-models`, `markdown`          | Per stack        |
| `portal/`    | HTML + JS + CSS statis tanpa framework                                                     | Tidak            |
| `schema/`    | `docs-data.schema.json` (`schemaVersion` 1)                                                | Tidak            |
| `__tests__/` | Fixture `mini` dan `alt`, test repo ini, smoke browser                                     | —                |

Test `reuse.test.mjs` memastikan `core/`, `adapters/`, `portal/`, dan `cli.mjs` tidak memuat path atau
nama milik satu proyek.

## Config (`docsys.config.json`)

| Kunci                 | Dipakai oleh         | Contoh                                                                                                                                                |
| --------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `project`             | portal               | `{ "name": "Shop", "tagline": "…" }`                                                                                                                  |
| `output`              | CLI                  | `".docsys"` (tambahkan ke `.gitignore`)                                                                                                               |
| `adapters`            | core                 | `["package-json", "express-routes", "zod-contracts", "sequelize-models", "markdown"]`                                                                 |
| `stack`               | `package-json`       | `manifests`, `nodeVersionFile`, `workflows`, `groups[{ id, name, manifest, packages }]`                                                               |
| `routes`              | `express-routes`     | `{ "app": "server/main.ts", "appRouter": "server", "include": ["server/routes/*.ts"] }`                                                               |
| `contracts`           | `zod-contracts`      | `{ "include": ["shared/schemas/*.ts"], "suffix": "Schema" }`                                                                                          |
| `models`              | `sequelize-models`   | `{ "include": ["db/entities/*.ts"], "associations": ["db/relations.ts"] }`                                                                            |
| `markdown`            | `markdown`           | `features { dir, catalog, navigationFiles, ignoreFolders }`, `policies`, `adrs`, `todo { file, section }`, `roleFlows`, `uxMatrix { file, criteria }` |
| `erd.domains`         | `DS-R02`, portal ERD | `{ "Sales": ["Order", "Customer"] }`                                                                                                                  |
| `links.stripPrefixes` | link fitur           | `["/api"]` — prefix yang boleh tidak ditulis di dokumen                                                                                               |
| `completeness`        | rule & CLI           | `baseline`, `rules`, `policyLabel`, `exceptionHint`                                                                                                   |

Contoh lengkap: `__tests__/fixtures/alt/docsys.config.json` (proyek kecil) dan `docsys.config.json` di
root repo ini.

## Rule

| Rule     | Gap                                                                                             |
| -------- | ----------------------------------------------------------------------------------------------- |
| `DS-R01` | Endpoint yang path-nya tidak disebut di dokumen fitur mana pun                                  |
| `DS-R02` | Model yang belum masuk `erd.domains`                                                            |
| `DS-R03` | Item TODO terbuka tanpa baris `Layer: PRD=…, BE=…, FE=…` (`Todo`, `In progress`, `Done`, `N/A`) |
| `DS-R04` | Role di dokumen role flow yang belum punya baris di tabel UX matrix (kolom `Role` dan `Alur`)   |
| `DS-R05` | Fitur yang tidak ditautkan dari katalog                                                         |

## Memasang di proyek baru

1. Salin folder `tools/docsys/` (tanpa `__tests__/fixtures` bila tidak perlu) dan pastikan
   `typescript` ada di devDependencies.
2. Buat `docsys.config.json`; mulai dari contoh `alt` lalu sesuaikan path.
3. Tambahkan script: `"docs:extract"`, `"docs:portal"`, `"docs:completeness"`, `"docs:baseline"`,
   `"docsys:test"` (lihat `package.json` repo ini) dan `.docsys/` ke `.gitignore`.
4. Jalankan `npm run docs:extract`, periksa peringatan adapter, lalu `npm run docs:portal`.
5. Jalankan `npm run docs:baseline -- --init` sekali, commit baseline-nya, lalu tambahkan
   `npm run docs:completeness` ke pemeriksaan CI.

## Menulis adapter baru

Adapter adalah objek `{ id, extract({ root, config }) }` yang mengembalikan sebagian bagian data
(`stack`, `features`, `endpoints`, `contracts`, `erd`, `policies`, `adrs`, `todo`, `uxMatrix`) dan
opsional `warnings: [{ adapter, file, line, reason }]`. Daftarkan di `core/extract.mjs` → `ADAPTERS`,
pilih lewat `config.adapters`, dan tambahkan fixture test. Contoh: stack NestJS + Prisma cukup menulis
adapter `nest-routes` dan `prisma-models` yang mengisi `endpoints` dan `erd`; core, rule, dan portal
tidak berubah.
