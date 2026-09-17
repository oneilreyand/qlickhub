## Task

QA-ASSURANCE-S7A-WORKSPACE-ROLLOUT-CONTROLS — konfigurasi rollout QA assurance per Workspace tanpa hard gate otomatis.

## Outcome

S7A menyediakan konfigurasi persisted satu-per-Workspace dengan mode aman default `observe`, serta mode `warn` dan `enforce` yang hanya dapat diubah oleh Owner/Admin dengan alasan audit. Workspace baru menerima setting dalam transaksi pembuatannya; migration backfill menyediakan `observe` untuk Workspace yang telah ada. Setiap perubahan nyata menambah event audit dari mode lama ke mode baru, sedangkan permintaan mode yang sama tidak membuat event duplikat. Slice ini sengaja belum mengubah lifecycle QA atau Release: `warn`/`enforce` tetap konfigurasi rollout sampai keputusan pilot berikutnya.

## Source of truth and impact

- **Applicable SSoT:** [`docs/1_ARCHITECTURE.md`](../1_ARCHITECTURE.md), [`docs/2_WORKFLOW_AND_ROLES.md`](../2_WORKFLOW_AND_ROLES.md), [`docs/adr/ADR-014-QA-EVIDENCE-EXECUTION-AND-RELEASE-ASSURANCE.md`](../adr/ADR-014-QA-EVIDENCE-EXECUTION-AND-RELEASE-ASSURANCE.md)
- **Policy IDs:** `AUTH-009`, `QA-009`, `RELEASE-003`, `DATA-001`, `DATA-002`, `CONTRACT-001`, `TEST-001`, `DOC-002`, `DOC-003`, `DOC-004`
- **Data/interface impact:** Migration 81 menambah `qa_assurance_rollout_settings` dan event audit `qa_assurance_rollout_events`; shared contract serta endpoint authenticated GET/PATCH ditambahkan.
- **Authorization impact:** Semua member Workspace aktif dapat membaca setting. Hanya Owner/Admin aktif dapat memutasi; route guard dilapisi policy/service enforcement dan alasan minimal 10 karakter divalidasi sebelum mutasi.
- **Migration risk:** Additive dan default-safe. Migration/backfill lulus pada database PostgreSQL uji disposable; migrasi 81 juga lulus pada database test. Tidak ada migration Preview/Production dijalankan.

## Changed files

- `packages/contracts/src/workspace.ts` dan `packages/contracts/src/contracts.test.ts` — mode, read model, input mutation, serta validasi regresi rollout.
- `apps/api/src/db/migrations/20260915000081-create-qa-assurance-rollout-settings.cjs` — setting, audit event, FK, mode/reason constraint, index, dan backfill `observe`.
- `apps/api/src/db/models/qaAssuranceRolloutSettings.ts`, `apps/api/src/db/models/qaAssuranceRolloutEvent.ts`, `apps/api/src/db/models/index.ts` — mapping Sequelize untuk persistence rollout; model event kini memberi default timestamp agar validasi Sequelize sesuai default database.
- `apps/api/src/modules/workspaces/internal/qaAssuranceRollout.ts` dan `workspaceService.ts` — read/mutation bertransaksi dengan row lock dan no-op idempotent.
- `apps/api/src/modules/workspaces/workspaceController.ts`, `workspaceRoutes.ts`, dan `workspacePolicy.ts` — endpoint authenticated serta RBAC Owner/Admin.
- `apps/api/src/modules/workspaces/internal/workspaceLifecycle.ts` — membuat default setting dalam transaksi Workspace baru.
- `apps/api/src/modules/workspaces/__tests__/qaAssuranceRolloutApiIntegration.test.ts` — scenario PostgreSQL untuk read, Owner/Admin, no-op, event audit, serta penolakan PO/Developer/QA.
- `apps/api/scripts/verifyCleanMigrations.cjs` dan `apps/api/scripts/verifyReleaseLifecycle.cjs` — verifier sekarang mewajibkan schema/migration S7A dan regression integration-nya.
- `docs/features/QA_ASSURANCE_WORKSPACE_ROLLOUT_CONTROLS.md` — Feature Knowledge Card slice S7A.

## Validation

- `node --check apps/api/src/db/migrations/20260915000081-create-qa-assurance-rollout-settings.cjs` — lulus.
- `node --check apps/api/scripts/verifyCleanMigrations.cjs` — lulus.
- `node --check apps/api/scripts/verifyReleaseLifecycle.cjs` — lulus.
- `npm --prefix packages/contracts test -- --test-name-pattern='QA assurance Workspace rollout contracts'` — lulus, 72/72 test, 0 fail, 0 skipped.
- `npm --prefix packages/contracts run build` — lulus.
- `npm --prefix apps/api run build` — lulus.
- `npm run typecheck` — lulus untuk contracts, API, dan web.
- `npm run lint` — lulus, 0 error dan 21 warning lama di luar perubahan S7A.
- `npm run docs:check` — lulus, 5/5 pemeriksaan dokumentasi.
- `git diff --check` — lulus.
- `npm --prefix apps/api run db:verify:clean-migrations` — lulus, migration 17–81 termasuk backfill 81 pada database disposable `qa_management_phase0_verify_13390`; database uji dibersihkan setelah verifikasi.
- `npm --prefix apps/api run db:migrate:test` — lulus, migration 77–81 pada PostgreSQL test `qa_management_test`.
- `NODE_ENV=test node --test dist/modules/workspaces/__tests__/qaAssuranceRolloutApiIntegration.test.js` (dari `apps/api`) — lulus 4/4, 0 gagal, 0 skipped setelah perbaikan default timestamp model event. Run awal gagal 1/4 karena `changedAt` tidak terisi di validasi Sequelize; kegagalan tersebut sudah diperbaiki dan diulang.
- `npm --prefix apps/api run db:verify:release-lifecycle` — lulus migration 17–81 dan 24/24 test pada database disposable `qa_management_release_verify_14339`, 0 gagal, 0 skipped.
- `npm --prefix packages/contracts test` — lulus 72/72, 0 gagal, 0 skipped setelah retry dengan izin lingkungan karena run sandbox awal gagal membuka Unix pipe sementara (`EPERM`).
- `npm run docs:check` — lulus 5/5, 0 gagal, 0 skipped pada verifikasi terbaru.
- `npm --prefix apps/api run test:integration` — suite penuh 417/439 pass, 22 fail, 0 skipped. Kegagalan mencakup intake Test Case/evidence, dependency QA, E2E lifecycle, serta policy Bug/Sign-off; hasil S7A terarah dan lifecycle verifier di atas tetap lulus.

## Risks or follow-up

- Akses PostgreSQL uji telah tersedia dan evidence migration/integration S7A sudah diperoleh. Sebelum deploy, tuntaskan kegagalan suite API penuh dan konflik gate S5 yang belum mengikuti mode rollout per Workspace.
- Tentukan hasil pilot dan definisi operasional `warn` sebelum mengaktifkan `enforce` sebagai lifecycle gate; S7A tidak membuat perubahan perilaku gate.
- UI Workspace rollout S7B sudah diimplementasikan terpisah; validasi visual desktop/mobile terautentikasi dan Production smoke masih diperlukan.

## TODO update

- `QA-ASSURANCE-S7A-WORKSPACE-ROLLOUT-CONTROLS` → `Done` untuk slice backend lokal yang telah diverifikasi; paket QA Assurance dan deploy Production tetap terbuka.
