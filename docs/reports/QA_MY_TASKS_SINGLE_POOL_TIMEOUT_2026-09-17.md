# QA-MY-TASKS-SINGLE-POOL-TIMEOUT Laporan Eksekusi — 2026-09-17

## Task

Hilangkan `500 Internal Server Error` dengan detail `Operation timeout` ketika akun QA membuka My Tasks.

## Outcome

Diagnosis menemukan self-deadlock deterministik pada pool Production berkapasitas satu koneksi. `WorkQueueService` membuka transaksi dan memegang satu koneksi, tetapi jalur QA memanggil `bugService.listBugs()` tanpa meneruskan transaksi. Pembacaan membership, Bug, QA Subtask, Resolution Event, dan Retest Attempt kemudian mencoba mengambil koneksi kedua sampai batas acquire 30 detik dan menghasilkan pesan `Operation timeout` dari `sequelize-pool`.

`bugService.listBugs()` sekarang menerima transaksi opsional dan meneruskannya ke seluruh pembacaan terkait. Jalur antrean QA memberikan transaksi Work Queue yang sedang aktif, sehingga seluruh query antrean memakai satu koneksi tanpa mengubah hasil, schema, kontrak HTTP, data bisnis, atau aturan akses.

## Source of truth and impact

- **Applicable SSoT:** `docs/1_ARCHITECTURE.md`, `docs/2_WORKFLOW_AND_ROLES.md`, dan `docs/4_AGENT_DEV_GUIDELINES.md`.
- **Policy IDs:** `AUTH-002`, `AUTH-009`, `DATA-001`, `TEST-001`, `DOC-004`.
- **Data/interface impact:** Tidak ada perubahan schema, migration, data, atau response shape. Perubahan internal menambahkan propagasi transaksi opsional pada pembacaan Bug.
- **Authorization impact:** Tidak ada. Pemeriksaan membership dan scope QA yang sama tetap dijalankan, kini dalam transaksi yang sama.
- **Migration risk:** Tidak ada migration.

## Changed files

- `apps/api/src/modules/bugs/bugService.ts` — menerima transaksi opsional dan menggunakannya pada seluruh query `listBugs()`.
- `apps/api/src/modules/workQueue/workQueueService.ts` — meneruskan transaksi Work Queue ke pembacaan antrean retest QA.
- `apps/api/src/modules/workQueue/__tests__/workQueueApiIntegration.test.ts` — membuktikan seluruh query SELECT service antrean QA memakai satu transaksi yang sama.
- `TODO.md` — mencatat status perbaikan Production.
- `docs/reports/QA_MY_TASKS_SINGLE_POOL_TIMEOUT_2026-09-17.md` — mencatat diagnosis, dampak, dan bukti validasi.

## Validation

- `npm --prefix apps/api run build` — lulus, TypeScript API tanpa error.
- `NODE_ENV=test node --test apps/api/dist/modules/workQueue/__tests__/workQueueApiIntegration.test.js` — lulus 4/4, gagal 0, dilewati 0, menggunakan PostgreSQL test; mencakup planner, Developer, QA, membership, isolasi Workspace, dan invariant satu transaksi untuk seluruh SELECT antrean QA.
- `NODE_ENV=test node --test apps/api/dist/modules/bugs/__tests__/bugApiIntegration.test.js` — lulus 6/6, gagal 0, dilewati 0, menggunakan PostgreSQL test. Warning deprecation `pg` tentang query paralel sudah ada pada skenario formal retest dan tidak berasal dari perubahan ini.
- `npx eslint apps/api/src/modules/bugs/bugService.ts apps/api/src/modules/workQueue/workQueueService.ts apps/api/src/modules/workQueue/__tests__/workQueueApiIntegration.test.ts` — lulus tanpa error atau warning.
- `npm run docs:check` — lulus 5/5 test governance dan pemeriksaan dokumentasi.
- `git diff --check` — lulus.
- Vercel Production deployment `dpl_HvH8xV5PFQT4Yx75brBUwY7EVr8p` — `READY` dan dialias ke `https://qlickhub.vercel.app`; remote build menyelesaikan contracts/API TypeScript serta Vite build 1.711 modul.
- `GET https://qlickhub.vercel.app/v1/health` setelah deployment — HTTP `200`, service `ok`, database `connected`.
- Percobaan pertama focused Work Queue di sandbox — tidak dapat terhubung karena kebijakan jaringan (`EPERM`), bukan kegagalan implementasi; pengujian yang sama lulus setelah akses PostgreSQL test diizinkan.

## Risks or follow-up

- Pengguna melanjutkan pemeriksaan ke alur eksekusi QA setelah deployment; tidak ada laporan timeout lanjutan pada navigasi tersebut.
- Pool maksimum satu tetap dipertahankan sesuai arsitektur Vercel/Supabase; perbaikan tidak menambah tekanan koneksi.

## TODO update

- `QA-MY-TASKS-SINGLE-POOL-TIMEOUT` → `Done`.
