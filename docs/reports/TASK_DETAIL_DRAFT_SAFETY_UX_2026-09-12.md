# Agent Report — Task Detail Draft Safety UX

## Task

`TASK-DETAIL-DRAFT-SAFETY-UX` — cegah perubahan Task dan Ringkasan Produk hilang saat pengguna berpindah tab atau menutup detail, serta tampilkan aksi footer sesuai konteks.

## Outcome

- Detail Task sekarang mendeteksi perubahan yang belum disimpan pada tab Ringkasan dan Ringkasan Produk.
- Perpindahan tab, tombol tutup, backdrop, dan Escape meminta konfirmasi sebelum membuang draf pada bagian aktif.
- Refresh atau penutupan tab browser memicu perlindungan bawaan browser ketika ada draf.
- Ringkasan Produk menampilkan peringatan draf dan hanya mengaktifkan `Simpan Versi Baru` jika isi benar-benar berubah.
- Footer detail hanya menampilkan aksi penyimpanan Task pada tab Ringkasan; tab lain menampilkan `Tutup Detail` agar konteks aksi tidak membingungkan.

## Source of truth and impact

- **Applicable SSoT:** [`docs/2_WORKFLOW_AND_ROLES.md`](../2_WORKFLOW_AND_ROLES.md), [`docs/3_UI_ATOMIC_DESIGN_SYSTEM.md`](../3_UI_ATOMIC_DESIGN_SYSTEM.md), dan [`docs/4_AGENT_DEV_GUIDELINES.md`](../4_AGENT_DEV_GUIDELINES.md).
- **Policy IDs:** `DOMAIN-004`, `FLOW-002`, `UI-001`, `UI-002`, `TEST-001`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** Tidak ada perubahan API atau kontrak persisten. Ada penambahan kontrak komponen internal `Drawer`: penutupan dapat ditolak dengan nilai balik `false`, dan penanganan Escape dapat dinonaktifkan saat dialog anak aktif.
- **Authorization impact:** Tidak ada. Pemeriksaan peran dan otorisasi yang ada tetap digunakan.
- **Migration risk:** Tidak ada perubahan schema atau migrasi.

## Changed files

- `apps/web/src/components/ui/molecules/Drawer.tsx` — mendukung penolakan penutupan dan memberi dialog anak kepemilikan atas tombol Escape.
- `apps/web/src/components/ui/molecules/__tests__/Drawer.test.tsx` — menguji penutupan yang ditolak dan Escape milik dialog anak.
- `apps/web/src/components/ui/organisms/TaskDetailDrawer.tsx` — mendeteksi draf, meminta konfirmasi, melindungi refresh browser, dan menampilkan footer kontekstual.
- `apps/web/src/components/ui/organisms/__tests__/TaskDetailDrawer.test.tsx` — menguji perlindungan draf saat menutup detail dan berpindah tab.
- `apps/web/src/components/ui/organisms/taskDetail/TaskDetailProductBriefTab.tsx` — melacak perubahan Ringkasan Produk, menampilkan peringatan, dan mencegah penyimpanan versi identik.
- `apps/web/src/components/ui/organisms/taskDetail/__tests__/TaskDetailProductBriefTab.test.tsx` — menguji status draf dan siklus penyimpanan.
- `TODO.md` — mencatat status dan bukti implementasi.

## Validation

- `npm exec prettier -- --check <6 berkas terdampak>` — lulus; seluruh berkas sesuai Prettier.
- `npm exec eslint -- <6 berkas terdampak>` — lulus; 0 error dan 0 warning.
- `npm --prefix apps/web run test -- <3 berkas tes terkait>` — lulus; 3 berkas, 42 tes, 0 gagal, 0 dilewati.
- `npm --prefix apps/web run typecheck` — lulus; TypeScript menghasilkan 0 error.
- `npm --prefix apps/web run test` — lulus; 77 berkas, 401 tes, 0 gagal, 0 dilewati. Peringatan lama tetap muncul untuk pembaruan React yang belum dibungkus `act(...)` pada beberapa suite dan tombol bersarang di galeri `DateRangePicker`; tidak ada yang berasal dari kegagalan fitur ini.
- `npm run build:web` — lulus; TypeScript dan build produksi Vite berhasil, 1.701 modul ditransformasi.
- `git diff --check` — lulus; tidak ada whitespace error.
- Pemeriksaan browser lokal terautentikasi pada workspace pengembangan `essensial` — lulus pada viewport desktop 1.440×900 dan ponsel 390×844. Dialog tampil untuk draf Task dan Ringkasan Produk, Escape menutup dialog tanpa menutup detail, tombol simpan versi aktif hanya setelah ada perubahan, dan footer non-Ringkasan hanya menampilkan `Tutup Detail`.
- Log browser selama pemeriksaan — 0 error dan 0 warning.
- Draf pemeriksaan dibuang melalui dialog tanpa menekan aksi simpan; tidak ada data Task/Ringkasan Produk yang dimutasi. Sesi login pengembangan ditutup setelah validasi dan server web lokal dihentikan.

## Risks or follow-up

- Perlindungan browser yang ditambahkan mencakup refresh/penutupan tab. Navigasi internal aplikasi dari luar drawer perlu dievaluasi terpisah bila kelak detail Task tidak lagi memblokir interaksi halaman di belakangnya.
- Temuan audit UX lain—konsistensi label metrik, bahasa, hierarki seluler, input QA berulang, dan semantik aksesibilitas tab—tetap menjadi slice terpisah.

## TODO update

- `TASK-DETAIL-DRAFT-SAFETY-UX` → `Done` — implementasi, validasi otomatis, dan pemeriksaan browser desktop/ponsel selesai.
