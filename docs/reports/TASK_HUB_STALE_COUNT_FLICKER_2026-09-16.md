## Task

TASK-HUB-STALE-COUNT-FLICKER — telusuri dan hilangkan kilasan empat Task yang kemudian berubah
menjadi satu hasil pada Task Hub Production.

## Outcome

Reproduksi baca-saja pada Production membuktikan angka empat bukan empat root Feature yang hilang.
Saat berpindah dari Ringkasan ke Task Hub pada Workspace `kerjaa`, store frontend masih membawa hasil
Ringkasan berupa satu root Feature dan tiga Subtask. Task Hub merender empat record itu selama request
`rootOnly=true` berjalan, kemudian menampilkan satu root Feature setelah respons baru selesai.

Task Hub kini menyaring presentasinya ke root Feature milik Workspace aktif. State daftar juga
mencatat scope dan request aktif: perubahan scope mengosongkan hasil lama selama loading, sedangkan
respons request yang sudah kedaluwarsa tidak dapat menimpa request terbaru. Ini juga mencegah data
Workspace sebelumnya berkedip ketika pengguna berpindah Workspace.

## Source of truth and impact

- **Applicable SSoT:** [Architecture](../1_ARCHITECTURE.md), terutama definisi Feature sebagai root
  Task dan satu tingkat Subtask; [UI Design System](../3_UI_ATOMIC_DESIGN_SYSTEM.md), terutama Task
  Hub dan `TaskCollection`.
- **Policy IDs:** `DOMAIN-002`, `DATA-001`, `UI-001`, `TEST-001`.
- **Data/interface impact:** tidak ada. Kontrak API tetap sama dan tidak ada data yang dibuat,
  diubah, atau dihapus.
- **Authorization impact:** tidak ada. Backend tetap menentukan cakupan data sesuai membership dan
  role Workspace.
- **Migration risk:** tidak ada schema atau migrasi.

## Changed files

- `apps/web/src/store/taskSlice.ts` — memisahkan hasil berdasarkan scope request dan mengabaikan
  completion request daftar yang sudah kedaluwarsa.
- `apps/web/src/store/__tests__/taskSlice.test.ts` — mengunci regresi empat record menjadi satu dan
  race antar-Workspace.
- `apps/web/src/components/ui/organisms/TaskHubDashboardTemplate.tsx` — menggunakan root Feature
  Workspace aktif untuk metrik, jumlah folder, daftar, timeline, dan readiness.
- `TODO.md` — mencatat status dan bukti pekerjaan.

## Validation

- Pemeriksaan browser Production terautentikasi, baca-saja — berhasil mereproduksi Ringkasan → Task
  Hub pada `kerjaa`: angka awal 4 lalu menjadi 1; hasil akhir adalah `billing v3` dengan ringkasan
  `0 / 3 Subtask`. Workspace browser dikembalikan ke `essensial`; tidak ada mutasi Production.
- `npm run test --workspace=@qlick/web -- src/store/__tests__/taskSlice.test.ts` — 5/5 lulus; tes
  regresi baru gagal sebelum perbaikan lalu lulus setelah perbaikan.
- `npm run test --workspace=@qlick/web -- src/store/__tests__/taskSlice.test.ts src/components/ui/organisms/__tests__/TaskHubMetrics.test.tsx src/components/ui/organisms/__tests__/TaskCollection.test.tsx`
  — 12/12 lulus pada 3 file.
- `npm run test --workspace=@qlick/web` — 474/476 lulus pada 90 file; 2 failure ada di
  `BugExperiencePanel.test.tsx`: pengiriman resolution notes Developer tidak memanggil mock yang
  diharapkan dan tombol verifikasi QA retest tidak ditemukan. File runtime maupun tes Bug tidak
  disentuh oleh perubahan ini, dan kegagalan yang sama telah tercatat sebelum pekerjaan ini.
- `npm run build` — lulus untuk contracts, API, dan web; Vite membangun 1.711 modul.
- `npm run docs:check` — 5/5 tes dokumentasi lulus dan governance check lulus.
- `npx prettier --write apps/web/src/store/taskSlice.ts apps/web/src/store/__tests__/taskSlice.test.ts apps/web/src/components/ui/organisms/TaskHubDashboardTemplate.tsx`
  — lulus.
- `git diff --check` — lulus.

## Risks or follow-up

- Perbaikan masih lokal dan belum dideploy, sehingga versi Production tetap dapat memperlihatkan
  kilasan sampai rilis berikutnya.
- Dua failure Bug retest pada suite frontend tetap menjadi pekerjaan terpisah dan tidak diperbaiki
  dalam scope Task Hub ini.

## TODO update

- `TASK-HUB-STALE-COUNT-FLICKER` → `Done` (local fix; belum dideploy).
