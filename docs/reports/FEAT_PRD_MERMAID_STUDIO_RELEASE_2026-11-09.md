# Mermaid Studio — Production release, 2026-11-09

**Status:** In progress
**Task:** FEAT-PRD-MERMAID-STUDIO
**Owner approval:** instruksi “deploy ke prod”, sesudah kandidat lokal P1–P2 diserahkan.
**Baseline:** `94134da1`; branch `codex/prd-mermaid-studio`.
**Policy IDs:** AI-020, SDLC-001, DOC-004, DATA-001, TEST-001, UI-003.

## Scope dan assurance

[Approval Window rilis](../features/FEAT-PRD-MERMAID-STUDIO/release.md) mencakup commit/push branch,
PR, tiered auto-merge dan deployment Production melalui integrasi Git existing. Tidak mengubah
schema, environment, dependency, RBAC atau data bisnis Production. Tier yang direncanakan: 1;
matched Tier 2 files: none. Tier akhir diperiksa terhadap diff aktual.

Bukti kandidat: [laporan P1–P2](FEAT_PRD_MERMAID_STUDIO_2026-11-09.md). Final lokal:
864 frontend, 117 contracts, 47 scoped HTTP/PostgreSQL, build dan validate lulus.
Review Standards/Spec, CI dan status deployment akan dicatat setelah sumber primer tersedia.

## Preflight

- origin/main sama dengan baseline; tidak ada rebase atau penggabungan pekerjaan lain.
- `npm run build`: exit 0, contracts + API + web; warning chunk >500 kB yang juga ada di baseline.
- `npm run migrations:prod:check`: exit 0 setelah akses network tersedia; health Production
  melaporkan latest `20261109000097-create-task-links.cjs`, sesuai tree. Tidak menjalankan migrasi.
- `npm run env:check`: exit 1 pada file .env lokal existing, 6 error URI/password placeholder untuk
  DATABASE_URL/MIGRATION_DATABASE_URL/PRODUCTION_DATABASE_URL. Ini bukan pembacaan scope Vercel
  Production. Nilainya tidak dicetak, dan konfigurasi tidak diubah untuk meloloskan pemeriksaan.
  Deploy tetap memakai konfigurasi Vercel existing; verifikasi runtime Production wajib dicatat.
- Sandbox awal memblokir network health; perintah yang sama dengan capability jaringan memverifikasi
  target. Tidak menganggap warning fail-open sebagai bukti migration check.

## Hasil rilis

Pending: review independen, commit, PR/CI, merge SHA, deployment ID/status, smoke dan rollback target.

## Continuation — 2026-11-10

Owner menginstruksikan “lanjutkan”. Window rilis sebelumnya masih berlaku; task/baseline tetap.
Pekerjaan sempat terhenti karena batas penggunaan menolak penyelesaian automatic approval review;
aksi validasi saat itu tidak dijalankan. Capability berhasil digunakan kembali setelah dilanjutkan.

### Standards

Reviewer independen menolak kandidat `fe7c9bac` dengan satu temuan P1: managed validation baru
berada di generic createDocumentVersion, bukan upsertProductBrief yang dipakai PUT utama dan Apply.
Ini melanggar validasi input backend dan kontrak yang disetujui. Tidak ada temuan standar tambahan.
Reviewer menjalankan contract tests `featureSpec.test.ts`: 20 passed, 0 failed, 0 skipped.

### Spec

Reviewer independen menolak `fe7c9bac` dengan satu temuan P1 yang sama terhadap kontrak backend
validation/MMD-06. Tidak ada blocker tambahan pada parser, identity/revision, dirty/stale protection,
permissions atau legacy rendering. Contract tests independen: 20 passed, 0 failed, 0 skipped.

Total initial review: Standards 1, Spec 1; temuan terburuk adalah bypass validasi di upsert Brief.

### Remediation evidence

- Ditambahkan tes HTTP terautentikasi pada main Brief PUT untuk duplicate ID dan managed block
  tanpa penutup; asserts penolakan, jumlah row/audit, versi dan content tidak berubah.
- Sebelum fix: `node /private/tmp/qlick-mermaid-db-runner.cjs --test-name-pattern='Mermaid blocks round-trip' dist/modules/featureSpecs/__tests__/featureSpecApplyApiIntegration.test.js`
  → exit 1, 0 passed/1 failed/0 skipped; respons aktual 200, expected 400.
- Shared structure validation ditambahkan di upsertProductBrief setelah role guard dan sebelum write.
  Validation pada jalur generic document-version tetap ada; tidak mengubah authorization policy.
- Setelah build: scoped HTTP/PostgreSQL command pada laporan P1–P2 diulang → exit 0,
  **47 passed, 0 failed, 0 skipped**; regression assertions main Brief termasuk di dalamnya.
- Recheck kedua reviewer, required CI dan deployment masih menunggu sumber primer berikutnya.
