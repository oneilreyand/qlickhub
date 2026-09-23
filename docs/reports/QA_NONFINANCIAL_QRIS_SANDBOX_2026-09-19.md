## Task

QA-NONFINANCIAL-QRIS-SANDBOX — menyediakan target QRIS sandbox terisolasi untuk eksekusi QA tanpa gateway atau perpindahan dana nyata.

## Outcome

Production sekarang memiliki target QA-only yang selalu membuat transaksi `0` IDR dan tidak
menghubungi penyedia pembayaran. Transaksi harus berasal dari Test Run QA aktif pada kandidat
`sandbox:qris:*`, disimpan di PostgreSQL, dan hanya dapat berakhir pada status simulasi `paid`,
`failed`, atau `expired`.

Smoke test terautentikasi membuat Test Cycle `qris-sandbox-2026.09.19`, Test Run TC-BE-02, lalu
transaksi sandbox `qris-sbx-a0b48e80-4645-439f-90ca-203b9e7b2aee`. Status berubah dari `pending`
ke `expired`. Setelah memuat ulang aplikasi, pemanggilan ulang dengan kunci idempotensi yang sama
mengembalikan referensi dan status `expired` yang sama. Tidak ada gateway pembayaran, dana,
Test Result, Bug, Retest, atau video evidence yang dibuat.

## Source of truth and impact

- **Applicable SSoT:** [Architecture](../1_ARCHITECTURE.md), [Workflow](../2_WORKFLOW_AND_ROLES.md), dan [Agent Guidelines](../4_AGENT_DEV_GUIDELINES.md).
- **Policy IDs:** `AUTH-009`, `QA-001`, `QA-002`, `QA-006`, `QA-007`, `DATA-001`, `DATA-005`, `CONTRACT-001`, `TEST-001`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** Tabel additive `qris_sandbox_transactions`, contract Zod, tiga endpoint Workspace-scoped, dan kontrol pada riwayat Test Run QA.
- **Authorization impact:** Hanya QA aktif yang dapat membuat atau menyimulasikan transaksi miliknya; pembacaan mengikuti kebijakan pembacaan Test Management Workspace.
- **Migration risk:** Migration additive `20260918000084-create-qris-sandbox-transactions.cjs` telah diterapkan ke Production bersama migration trigger pendukung `20260918000083-allow-scoped-qa-test-case-activation.cjs`. Preflight memastikan tabel belum ada dan kedua nama migration belum tercatat; verifikasi setelah eksekusi menemukan tabel dan dua migration tercatat.

## Changed files

- `packages/contracts/src/qrisSandbox.ts` dan `packages/contracts/src/index.ts` — contract input, status, dan respons sandbox.
- `apps/api/src/db/migrations/20260918000084-create-qris-sandbox-transactions.cjs` — tabel PostgreSQL, foreign key, check nominal/mata uang, unique idempotensi, dan indeks.
- `apps/api/src/db/models/qrisSandboxTransaction.ts` serta `apps/api/src/db/models/associations/qaAssociations.ts` — model dan relasi Sequelize.
- `apps/api/src/modules/qrisSandbox/` dan `apps/api/src/app.ts` — endpoint terautentikasi, policy, persistence, dan simulasi final.
- `apps/web/src/lib/api/qrisSandboxService.ts` serta `apps/web/src/components/ui/organisms/myTasks/QaTestingDesk.tsx` — kontrol QA yang eksplisit nonfinansial dan tidak menyetel hasil QA otomatis.
- `apps/api/src/modules/testManagement/__tests__/testManagementApiIntegration.test.ts` — integration test PostgreSQL untuk QRIS sandbox tanpa mencemari riwayat test lain.
- `apps/api/scripts/verifyCleanMigrations.cjs` — verifikasi migration bersih untuk tabel, constraint, index, dan idempotensi sandbox.
- `docs/features/QA_NONFINANCIAL_QRIS_SANDBOX.md` — Feature Knowledge Card aktif.

## Validation

- `npm --prefix packages/contracts run typecheck` — passed, exit 0.
- `npm --prefix apps/api run typecheck` — passed, exit 0.
- `npm --prefix apps/web run typecheck` — passed, exit 0.
- `npm --prefix apps/web run build` — passed, exit 0; 1,715 modules transformed; tidak ada kegagalan build.
- `git diff --check` — passed sebelum deployment UI.
- Production migration preflight/apply/postflight — passed melalui SQL Editor Production; tabel tersedia dan dua migration relevan tercatat.
- Vercel Production deployment `dpl_6LiQgFzzVgV6F2LQzeCu6QawaUuf` — Ready dan dialias ke `https://qlickhub.vercel.app`.
- Production authenticated UI smoke — passed: Test Cycle/Test Run persisten, transaksi Rp0 dibuat, status `pending → expired`, dan pemanggilan ulang setelah reload mempertahankan referensi/status final yang sama.
- Production unauthenticated endpoint check — passed: endpoint transaksi mengembalikan `401` tanpa sesi.
- `NODE_ENV=test node --test apps/api/dist/modules/testManagement/__tests__/testManagementApiIntegration.test.js` — passed, 10/10; menggunakan PostgreSQL test lokal disposable. Mencakup validasi nominal, role, scope Workspace, idempotensi sama/konflik, persistensi, status final, dan read policy. Satu peringatan deprecation driver `pg` dan satu pesan FCM tanpa token aktif muncul, tanpa kegagalan tes.
- `npm --prefix apps/api run db:verify:clean-migrations` — passed; membuat, memigrasikan, memverifikasi, lalu menghapus database disposable. Migration 83–84 serta tabel, constraint nominal/mata uang, unique idempotensi, dan index sandbox terverifikasi.

## Risks or follow-up

- Status sandbox tidak boleh dipakai sebagai Test Result atau evidence. QA harus menjalankan skenario nyata dan mengunggah evidence yang benar-benar direkam sebelum mencatat Result, Bug, atau Retest.
- Rollback aplikasi tidak menjalankan down migration otomatis.

## TODO update

- `QA-NONFINANCIAL-QRIS-SANDBOX` → `Done`.
