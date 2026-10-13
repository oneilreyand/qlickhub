# RELEASE-DEADLOCK-A1-A2 — Data, API, and Shared Contracts

**Applicable Policy IDs:** DOC-005, RELEASE-003, RELEASE-004

## Data and relations

Tidak ada tabel atau migrasi baru. Sign-off `rejected` memakai `qa_sign_offs` yang sudah ada dengan
snapshot readiness berisi kode gate yang gagal.

## API and executable contract

Endpoint tetap: `POST /workspaces/:id/features/:featureId/qa-sign-offs` dan
`.../release-decisions` (`packages/contracts/src/releaseDecision.ts`). Phase 1 tidak mengubah kontrak.
Phase 2 menambah nilai enum gate `unverified_bugs`.

## Boundary notes

Terdampak: service release decision, panel persetujuan QA. Tidak terdampak: gate bukti QA, alur QA
selesai, baseline.
