# QA-DESK-SIMPLIFY — Data, API, and Shared Contracts

**Applicable Policy IDs:** DOC-005, FLOW-005, QA-001

## Data and relations

| Perubahan                                                                                                                       | Sumber                                                                                   | Risiko                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Baseline otomatis menulis `feature_readiness_baselines`, `..._requirements`, `task_activity`                                    | `featureReadinessService.ensureAutoBaseline`                                             | Dipicu dari 4 jalur tulis (Brief approve, Requirement/AC, link, create task) di transaksi yang sama |
| Backfill baseline sekali jalan, `mode='observation'`, `snapshot_json.backfilled=true`                                           | Migrasi `20261012000087-backfill-approved-feature-readiness-baselines.cjs`               | `down()` melewati baseline yang sudah dipakai `qa_test_cycles` (rollback parsial)                   |
| Fungsi trigger `validate_test_case_version_update` mengizinkan ubah `definition_snapshot` pada versi `active` tanpa `test_runs` | Migrasi `20261013000088-allow-unexecuted-active-test-case-version-definition-update.cjs` | `down()` mengembalikan fungsi lama                                                                  |
| Hapus test case 0 run: versi, mapping AC, link Requirement dihapus dalam satu transaksi; snapshot audit di activity Feature     | `testManagementService.deleteTestCase`                                                   | Hard delete; hanya bila tidak ada `test_runs`                                                       |

Tidak ada tabel atau kolom baru.

## API and executable contract

Kontrak: `packages/contracts/src/testManagement.ts` (semua perubahan additive/opsional).

| Endpoint                                                 | Perubahan                                                                                                 |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `POST /workspaces/:ws/test-cases`                        | `qaSubtaskId` opsional → test case dibuat `active` bila scope valid, 422 bila tidak                       |
| `PATCH /workspaces/:ws/test-cases/:id`                   | `qaSubtaskId` opsional; QA dapat mengedit test case `active` dalam scope                                  |
| `DELETE /workspaces/:ws/test-cases/:id`                  | Baru; 204, 403, 409 bila sudah ada run                                                                    |
| `POST /workspaces/:ws/test-cases/validate-scope`         | Baru; pratinjau validitas scope sebelum simpan                                                            |
| `POST /workspaces/:ws/features/:featureTaskId/remind-po` | Baru; notifikasi PO via outbox, maks 1× per 24 jam per Feature (429)                                      |
| `POST /workspaces/:ws/test-cases/import/commit`          | `qaSubtaskId` opsional, perilaku sama dengan create                                                       |
| QA workflow summary                                      | Blocker `feature_baseline_missing`, next action `await_baseline`, `blockerReason`, `isBaselineSuperseded` |
| Task test execution                                      | `latestVersionId`, `needsRetest` per test case                                                            |

Kode error trigger PostgreSQL `P0001` dipetakan ke 409 (`apps/api/src/http/problemDetails.ts`).

## Boundary notes

- Backend + DB + contract saja. UI drawer QA (Prompt A dan C) ada di Feature terpisah.
- Tidak mengubah QA sign-off, PO release decision, atau gate `readinessGateEvaluator`.
- Web masih memakai field lama; field baru opsional sehingga web lama tetap kompatibel.
