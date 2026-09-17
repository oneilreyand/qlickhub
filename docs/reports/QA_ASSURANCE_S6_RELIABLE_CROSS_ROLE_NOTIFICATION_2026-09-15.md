## Task

QA-ASSURANCE-S6-RELIABLE-CROSS-ROLE-NOTIFICATION — transactional notification outbox untuk QA Sign-off dan Release Decision.

## Outcome

S6 telah memiliki fondasi outbox persisten. Mutasi QA Sign-off, Release Decision, Bug Resolution Event, Bug Retest Attempt, dan handoff Bug legacy sekarang memasukkan baris outbox di transaksi bisnis yang sama, menggunakan event key idempotent per penerima, dan menjadwalkan pengiriman setelah transaksi berhasil commit. Target penerima mencakup QA signer/assignee, Developer terkait, PO, Owner, dan Admin; actor dikecualikan dan penerima dideduplikasi per user. Status `pending`, `processing`, `delivered`, `failed`, atau `dead_letter`, jumlah percobaan, waktu lease/retry berikutnya, dead-letter timestamp, dan error terakhir tersimpan untuk audit. Delivery in-app memakai idempotency key yang sama sehingga retry/concurrent worker tidak membuat notifikasi duplikat; dispatch memakai `FOR UPDATE SKIP LOCKED`, lease lima menit, batas delapan percobaan, dan `dispatchDue` tersedia untuk scheduler terkelola.

## Source of truth and impact

- **Applicable SSoT:** [`docs/1_ARCHITECTURE.md`](../1_ARCHITECTURE.md), [`docs/2_WORKFLOW_AND_ROLES.md`](../2_WORKFLOW_AND_ROLES.md), [`docs/adr/ADR-014-QA-EVIDENCE-EXECUTION-AND-RELEASE-ASSURANCE.md`](../adr/ADR-014-QA-EVIDENCE-EXECUTION-AND-RELEASE-ASSURANCE.md)
- **Policy IDs:** `AUTH-009`, `QA-009`, `RELEASE-003`, `DATA-001`, `DATA-002`, `CONTRACT-001`, `TEST-001`
- **Data/interface impact:** Migration 77 menambah tabel `notification_outbox`; migration 78 menambah nullable unique `notifications.idempotency_key`; migration 79 menambah state `processing`; migration 80 menambah state `dead_letter` dan timestamp-nya; model dan service baru tidak mengubah kontrak response QA/release.
- **Authorization impact:** Tidak ada perluasan hak mutasi. Penerima dibatasi membership Workspace aktif dan actor tidak diberi notifikasi dirinya sendiri.
- **Migration risk:** Migration 77–80 lulus pada PostgreSQL test dan verifier clean/release disposable. Tidak ada migration Production/Preview yang dijalankan.

## Changed files

- `apps/api/src/db/migrations/20260915000077-create-notification-outbox.cjs` — tabel outbox, constraint, unique event-recipient, dan indeks dispatch; Task delete hanya mengosongkan `task_id` agar Workspace audit scope tetap valid.
- `apps/api/src/db/migrations/20260915000078-add-notification-idempotency-key.cjs` — unique key untuk deduplikasi notifikasi in-app saat retry/concurrency.
- `apps/api/src/db/migrations/20260915000079-add-notification-outbox-processing-state.cjs` — state processing untuk lease dan safe concurrent worker claim.
- `apps/api/src/db/migrations/20260915000080-add-notification-outbox-dead-letter-state.cjs` — terminal state setelah retry habis dan visibility timestamp.
- `apps/api/src/db/models/notificationOutbox.ts` — model Sequelize status delivery/retry.
- `apps/api/src/db/models/notification.ts` — field idempotency key untuk notification delivery.
- `apps/api/src/db/models/index.ts` — export model.
- `apps/api/src/modules/notifications/reliableNotificationOutboxService.ts` — enqueue atomik, deduplikasi, dispatch, backoff, dan pencatatan error.
- `apps/api/src/jobs/notificationOutboxWorker.ts` — worker CLI batch untuk cron/Job runner terkelola dan ringkasan delivery.
- `apps/api/src/jobs/notificationOutboxAdmin.ts` — CLI internal untuk summary, inspeksi dead-letter, dan requeue berbasis UUID eksplisit.
- `apps/api/package.json`, `package.json` — command `notifications:dispatch` dan `notifications:admin` tanpa endpoint browser.
- `apps/api/package.json` — command `db:verify:notification-outbox` untuk regression PostgreSQL S6 terarah.
- `apps/api/src/modules/notifications/reliableNotificationOutboxService.ts` — summary status, daftar dead-letter, dan requeue manual berbasis ID untuk observability/recovery internal.
- `apps/api/src/modules/releaseDecisions/releaseDecisionService.ts` — enqueue notification pada transaksi QA Sign-off/Release Decision dan resolver penerima lintas peran.
- `apps/api/src/modules/bugs/bugService.ts` — enqueue notification atomik untuk Bug create/status, Developer Resolution Event, dan QA Retest Attempt; mengganti jalur FCM langsung yang tidak durable.
- `apps/api/src/modules/notifications/__tests__/notificationOutboxIntegration.test.ts` — regression PostgreSQL untuk deduplikasi recipient, idempotent re-dispatch, concurrent dispatcher claim, recovery lease `processing` kedaluwarsa, dead-letter visibility/requeue, serta Task deletion yang mempertahankan Workspace scope outbox.
- `apps/api/scripts/verifyCleanMigrations.cjs` — clean-database verifier kini mewajibkan migration 71–80 serta memeriksa schema/constraint inti outbox.
- `apps/api/scripts/verifyReleaseLifecycle.cjs` — lifecycle verifier memakai test source aktif `releaseDecisions`, mencakup cancellation/outbox regression, dan mewajibkan schema 71–80.

## Validation

- `npm --prefix packages/contracts run build` — lulus.
- `npm --prefix apps/api run build` — lulus setelah resolver penerima diperluas.
- `npm --prefix apps/web run build` — lulus, Vite mentransformasi 1.710 modul.
- `npm run docs:check` — lulus, 5/5 pemeriksaan dokumentasi.
- `git diff --check` — lulus.
- `node --check apps/api/src/db/migrations/20260915000077-create-notification-outbox.cjs` — lulus.
- `node --check apps/api/src/db/migrations/20260915000078-add-notification-idempotency-key.cjs` — lulus.
- `node --check apps/api/src/db/migrations/20260915000079-add-notification-outbox-processing-state.cjs` — lulus.
- `node --check apps/api/src/db/migrations/20260915000080-add-notification-outbox-dead-letter-state.cjs` — lulus.
- `npm --prefix apps/api run build` — lulus, termasuk test outbox baru.
- `npm run lint` — lulus, 0 error dan 21 warning lama di luar perubahan outbox.
- `npm run typecheck` — lulus untuk contracts, API, dan web.
- `npm run notifications:dispatch` — tersedia sebagai worker command; belum dieksekusi karena membutuhkan database dengan migration 77–80.
- `getDeliverySummary`/`listDeadLetters` — tersedia untuk monitoring internal; belum dieksekusi terhadap PostgreSQL pada sesi ini.
- `requeueDeadLetters(ids)` — recovery manual eksplisit; tidak ada replay otomatis dan tidak diekspos sebagai privilege browser.
- `npm run notifications:admin -- summary|dead-letters|requeue <outbox-id...>` — mekanisme operasi server-side; belum dieksekusi karena memerlukan database dengan migration 77–80.
- `npm --prefix apps/api run db:migrate:test` — lulus migration 77–80 pada `qa_management_test`.
- `npm --prefix apps/api run db:verify:notification-outbox` — lulus PostgreSQL 6/6, 0 gagal, 0 skipped setelah retry berizin; run sandbox pertama tidak dapat menghubungi localhost (`EPERM`, 6 test cancelled), bukan kegagalan implementasi.
- `npm --prefix apps/api run db:verify:clean-migrations` — lulus migration 17–81 pada database disposable `qa_management_phase0_verify_13390`.
- `npm --prefix apps/api run db:verify:release-lifecycle` — lulus migration 17–81 dan 24/24 test pada database disposable `qa_management_release_verify_14339`.
- `npm --prefix apps/api run test:integration` — suite penuh 417/439 pass, 22 fail, 0 skipped. Kegagalan mencakup intake Test Case/evidence, dependency QA, E2E lifecycle, serta policy Bug/Sign-off; hasil terarah S6 di atas tetap lulus.

## Risks or follow-up

- PostgreSQL test/clean verifier sudah membuktikan idempotensi, concurrent claim, lease recovery, dead-letter/requeue, dan scope Workspace. Sebelum Production, tuntaskan kegagalan suite penuh dan jalankan smoke terhadap jalur notifikasi autentik.
- Jadwalkan command `npm run notifications:dispatch` pada job runner deployment non-persistent/serverless dan monitor exit code/dead-letter count; repository belum memiliki konfigurasi scheduler tersebut, sehingga retry yang tertunda belum dijamin berjalan otomatis di Production.

## TODO update

- `QA-ASSURANCE-S6-RELIABLE-CROSS-ROLE-NOTIFICATION` → `In progress` sampai scheduler Production dan full verification tersedia; blocker usage-limit PostgreSQL lokal telah selesai.
