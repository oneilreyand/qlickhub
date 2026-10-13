# VERCEL-PRODUCTION-BRANCH — Owner / Admin Path

**Applicable Policy IDs:** DOC-005, AUTH-002, AI-013, AI-020, SDLC-001

## Inputs and preconditions

- Preview deployment dari branch `main` telah lolos smoke test dan disetujui untuk rilis oleh PO.
- Laporan rilis dan daftar migrasi skema database yang tertunda telah diverifikasi.

## Permitted actions and decisions

- Menjalankan migrasi skema database Production (`npm run db:migrate:prod`) jika ada migrasi baru.
- Melakukan review final diff pada PR `main` → `production`.
- Melakukan merge manual pada PR `main` → `production` (dilarang auto-merge).
- Mengonfigurasi Production Branch di Vercel dan branch protection di GitHub.
- Menentukan tindakan rollback jika terjadi insiden pasca-deploy di Production.

## Outputs and handoff

- Commit merge mendarat di branch `production`, memicu auto-deploy Vercel ke domain resmi Production.
- Konfirmasi rilis dan log deployment dicatat dalam laporan rilis.
