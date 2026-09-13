## Task

PRODUCTION-RELEASE-TASK-USABILITY-LOCALIZATION — commit seluruh perubahan lokal terverifikasi untuk keamanan draf Task, copy Indonesia natural, aksesibilitas tab, dan dokumentasi rencana SDLC; deploy exact SHA ke Vercel Production; lalu verifikasi runtime dan status migrasi tanpa mengubah data Production.

## Outcome

Commit aplikasi `e4d0b680df0faef7dbfb076c0bcfbc35c6ba1270` telah dipush ke `origin/main` dan dideploy melalui integrasi Git Vercel sebagai deployment Production `dpl_DPksT13QFH7yZEEZfAF8bS3AXa2N`. Deployment berstatus `READY`/`PROMOTED`, menggunakan Node.js 24.x, dan memegang alias kanonikal `https://qlickhub.vercel.app`.

Production sekarang memuat perlindungan draf Task/Ringkasan Produk, copy Indonesia yang lebih natural, tab aksesibel dengan navigasi keyboard, dan seluruh dokumentasi rencana SDLC. Tidak ada migrasi atau mutasi data Production yang dijalankan.

## Source of truth and impact

- **Applicable SSoT:** `docs/DEPLOYMENT_AND_ENVIRONMENTS.md`, `docs/2_WORKFLOW_AND_ROLES.md`, `docs/3_UI_ATOMIC_DESIGN_SYSTEM.md`, dan `docs/4_AGENT_DEV_GUIDELINES.md`.
- **Policy IDs:** `DATA-001`, `DATA-002`, `UI-001`, `UI-002`, `TEST-001`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** tidak ada perubahan API, kontrak backend, atau data persisten. Perubahan interface hanya pada presentasi frontend dan prop opsional komponen bersama.
- **Authorization impact:** tidak ada. Otorisasi backend dan visibilitas berbasis peran tidak diperluas.
- **Migration risk:** tidak ada schema atau migrasi baru. Audit baca-saja menunjukkan seluruh 51 migrasi kanonikal Production berstatus `up`; tidak ada perintah migrasi yang dijalankan.

## Changed files

- `apps/web/src/components/ui/molecules/Drawer.tsx` dan `apps/web/src/components/ui/organisms/TaskDetailDrawer.tsx` — melindungi draf saat pengguna menutup detail atau berpindah bagian.
- `apps/web/src/components/ui/organisms/taskDetail/TaskDetailProductBriefTab.tsx` — melaporkan status perubahan Ringkasan Produk kepada drawer induk.
- `apps/web/src/lib/i18n/indonesianCopy.ts`, komponen Task Hub, dan komponen readiness — menampilkan copy Indonesia natural tanpa mengubah payload backend.
- `apps/web/src/components/ui/molecules/DateRangePicker.tsx` — menerjemahkan kontrol tanggal dan menghapus struktur tombol bersarang.
- `apps/web/src/components/ui/molecules/Tabs.tsx` dan seluruh konsumennya — menambahkan semantik tab, roving focus, ArrowLeft/ArrowRight, Home/End, dan nama konteks.
- Tes frontend terkait — mencakup keamanan draf, copy, DateRangePicker, readiness, dan pola tab aksesibel.
- `docs/plans/SDLC_QUALITY_AND_RELEASE_PLAN.md` dan `docs/features/SDLC_QUALITY_AND_RELEASE.md` — mendokumentasikan rencana P0–P6 dan keputusan Draft K1–K10.
- `TODO.md` dan laporan slice terkait — mencatat status serta bukti pekerjaan.

## Validation

- `npm ci` — upaya sandbox pertama gagal karena DNS dibatasi; pengulangan dengan akses jaringan lulus dan memasang 741 paket dari lockfile. Terdapat empat peringatan paket deprecated dan dua kerentanan tingkat sedang pada dependency pengembangan; tidak dijalankan `npm audit fix --force` karena memerlukan upgrade mayor terpisah.
- `npm run validate` — lulus: documentation governance 5/5, seluruh typecheck contracts/API/web, dan lint 0 error dengan 22 warning lama.
- `npm run env:check` — lulus dengan 0 warning; tidak ada nilai environment yang dicetak.
- `npm --prefix apps/web run test` — lulus 81/81 file dan 426/426 tes; 0 gagal dan 0 dilewati. Warning React `act(...)` lama tetap muncul pada beberapa tes WorkspaceSettings, QA desk, Header/NotificationBell, dan TaskTimeline.
- `npm run build` — build Production contracts, API, dan web lulus; Vite mentransformasi 1.701 modul.
- Pemeriksaan Prettier seluruh file staged — lulus.
- `git diff --cached --check` dan `git diff HEAD^ HEAD --check` — lulus tanpa temuan whitespace.
- Pemeriksaan pola secret pada staged diff — tidak menemukan URL PostgreSQL, private key, atau assignment secret. Tidak ada file `.env` dalam commit.
- `../../node_modules/.bin/sequelize-cli db:migrate:status --env production` dari `apps/api` — audit baca-saja lulus; 51/51 migrasi kanonikal Production berstatus `up`. Tidak ada migrasi dijalankan.
- `git push origin main` — commit `e4d0b68` berhasil dipush dari `8a61d25` ke `origin/main`.
- Metadata Vercel — deployment `dpl_DPksT13QFH7yZEEZfAF8bS3AXa2N` menargetkan Production, berstatus `READY`/`PROMOTED`, memiliki alias kanonikal, dan mencantumkan Git source `main` SHA `e4d0b680df0faef7dbfb076c0bcfbc35c6ba1270`.
- Smoke Production — `/`, `/login`, dan `/v1` mengembalikan 200; `/v1/health` mengembalikan status `ok` dan database `connected`; request tanpa sesi ke `/v1/workspaces` mengembalikan 401.
- Smoke CORS — origin Production yang sah menerima 204 dan header allow-origin yang tepat; origin asing menerima 401 tanpa header allow-origin.
- Inspeksi artefak aktif — bundle Production memuat `Bagian detail Task`, `Perubahan belum disimpan`, `Buang Perubahan`, `Semua Tanggal`, label DateRangePicker Indonesia, copy kesiapan rilis Indonesia, serta label konteks tab My Tasks.

## Risks or follow-up

- Perjalanan Production terautentikasi tidak dijalankan karena sesi/kredensial Production tidak digunakan dalam rilis ini. Metadata deployment, runtime publik, database, authorization guard, CORS, dan artefak aktif sudah terverifikasi.
- Dua kerentanan dependency pengembangan tingkat sedang dan 22 warning lint lama perlu slice pemeliharaan terpisah agar tidak mencampur upgrade mayor dengan release fitur.
- Target rollback aplikasi adalah deployment `dpl_7r5qwKjWxfcPbz47TePvyz8oiKWp`, SHA `8a61d2535dfe2dce80c379b54abc38467d3d2b74`, yang berstatus `READY`/`PROMOTED` sebelum release ini.

## TODO update

- `PRODUCTION-RELEASE-TASK-USABILITY-LOCALIZATION` → `Done`.
