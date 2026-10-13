# VERCEL-PRODUCTION-BRANCH — Data, API, and Shared Contracts

**Applicable Policy IDs:** DOC-005, CONTRACT-001, SDLC-001

## Data and relations

Tidak ada penambahan tabel, relasi, model Sequelize, maupun migrasi skema database baru pada task ini.

## API and executable contract

Tidak ada perubahan interface pada `packages/contracts/src` maupun penambahan endpoint Express pada `apps/api`.

## Boundary notes

- **Lingkungan Deployment**:
  - Branch `main` terikat ke Vercel Preview environment.
  - Branch `production` terikat ke Vercel Production environment.
- **Batasan Skema**:
  - Setiap migrasi skema database di masa mendatang harus diaplikasikan ke Production database (`npm run db:migrate:prod`) SEBELUM PR rilis `main` → `production` di-merge.
