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
