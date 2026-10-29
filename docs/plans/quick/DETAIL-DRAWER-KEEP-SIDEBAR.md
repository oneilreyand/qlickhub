# QUICK — DETAIL-DRAWER-KEEP-SIDEBAR Detail task tidak menutupi Sidebar di desktop

**Status:** Menunggu persetujuan
**WRA:** 4/16 — satu lapisan frontend (1), satu konsumen drawer detail lewat prop opt-in (1), unit test serta UAT lokal Light/Dark tiga viewport (2). Tidak ada perubahan API, kontrak, data, otorisasi, migrasi, atau dependensi eksternal.

Status yang diizinkan: Draft, Menunggu persetujuan, Disetujui, Selesai, Blocked.

**Revisi 2026-10-29:** cakupan disesuaikan setelah drawer detail Tugas Saya dihapus di P4c-5; persetujuan 2026-10-27 untuk cakupan lama tidak berlaku otomatis.

## Problem

- Gejala: saat detail task/Feature dibuka di desktop, panel detail menutupi seluruh layar termasuk Sidebar (dan Header), sehingga pengguna kehilangan konteks workspace/folder.
- Bukti:
  - `apps/web/src/components/ui/organisms/TaskDetailDrawer.tsx` baris 169 memanggil `Drawer` dengan `defaultFullScreen={true}` (satu pemanggilan setelah refactor; dipakai `TaskHubDashboardTemplate`, `FeatureDetailPage`, `TaskDeepLinkPage`).
  - `MyTaskDetailWorkspaceDrawer.tsx` sudah dihapus di P4c-5; detail di `/my-tasks` kini halaman kerja, bukan drawer, sehingga tidak termasuk cakupan.
  - `apps/web/src/components/ui/molecules/Drawer.tsx` baris 162: wrapper `fixed inset-0` (`z-50`, atau `z-20` bila `preserveAppHeader`); baris 165–189: backdrop dan panel mulai dari kiri layar, panel full screen `max-w-full`.
  - `apps/web/src/components/layout/AppLayout.tsx`: Sidebar desktop adalah `aside` `w-60` (240px) pada `lg`, tanpa z-index, sehingga berada di bawah overlay.
  - Belum ada observasi browser terautentikasi (E4) dari kondisi sekarang.
- Penyebab: terkonfirmasi dari kode. `Drawer` hanya punya opsi menjaga Header (`preserveAppHeader`), tidak ada opsi menjaga Sidebar; mode full screen berarti lebar viewport, bukan lebar area konten.

## Perubahan

- Tambah prop opt-in `preserveAppSidebar` pada `Drawer` (default `false`, mengikuti pola `preserveAppHeader`). Bila aktif pada `lg` ke atas:
  - backdrop dan panel dimulai dari `lg:left-60`, sehingga Sidebar tetap terlihat tanpa diredupkan;
  - mode full screen mengisi area konten di kanan Sidebar, bukan seluruh viewport;
  - area di atas Sidebar tetap bagian dari overlay modal: klik di sana diperlakukan sama seperti klik backdrop (permintaan tutup), sehingga guard perubahan belum disimpan (`handleRequestClose` / `pendingNavigation`) tetap berlaku; setelah detail tertutup, Sidebar dipakai seperti biasa;
  - focus trap, `aria-modal`, Escape, dan pengembalian fokus tidak berubah.
- Di bawah `lg` (phone/tablet) perilaku tetap seperti sekarang: full screen, karena Sidebar sudah tersembunyi di balik menu.
- Aktifkan prop pada `TaskDetailDrawer` (satu pemanggilan).
- File/path: `Drawer.tsx`, `TaskDetailDrawer.tsx`, test terkait, Quick Card ini, laporan di `docs/reports/`, dan `TODO.md`.
- Bukan scope:
  - navigasi langsung lewat Sidebar ketika detail terbuka. Ini butuh guard navigasi route; app memakai `BrowserRouter` sehingga `useBlocker` tidak tersedia tanpa migrasi ke data router, jadi dipisah menjadi task lanjutan bila diinginkan;
  - drawer lain (`MyTasksDashboard` detail Bug, folder drawer mobile Task Hub, Galeri Komponen);
  - isi/tab detail task, Header, Sidebar, token warna, API, data, RBAC, kontrak, migrasi.

## Acceptance Criteria → bukti

| AC                                                                                                                                                                                                                     | Bukti yang dibutuhkan (E-level) | Perintah / observasi                                                             |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------- |
| AC-1: Di ≥1024px, detail task yang dibuka lewat `TaskDetailDrawer` tidak menutupi Sidebar, baik mode panel maupun full screen.                                                                                         | E2, E4                          | Unit test class `Drawer` dengan `preserveAppSidebar`; UAT 1440×900 dan 1024×768. |
| AC-2: Klik di area Sidebar saat detail terbuka menjalankan permintaan tutup yang sama dengan backdrop; bila ada draft belum disimpan, dialog konfirmasi yang ada muncul dan tidak ada perubahan yang hilang diam-diam. | E2, E4                          | Unit test handler tutup; UAT edit deskripsi lalu klik Sidebar.                   |
| AC-3: Di <1024px perilaku drawer tidak berubah (full screen, tanpa overflow horizontal).                                                                                                                               | E2, E4                          | Unit test; UAT 390×844 dan 768×1024.                                             |
| AC-4: Konsumen `Drawer` lain tidak berubah, focus trap/Escape tetap berfungsi, dan Light/Dark tetap memakai token yang ada.                                                                                            | E2, E4                          | Test Drawer existing; typecheck, build, `theme:check`; UAT Light/Dark.           |

## Approval Window

- Task / baseline: DETAIL-DRAWER-KEEP-SIDEBAR @ `main` (setelah PR #76), cabang baru dari `main`.
- Path yang diizinkan: `apps/web/src/components/ui/molecules/Drawer.tsx`, `apps/web/src/components/ui/organisms/TaskDetailDrawer.tsx`, test terkait, `docs/plans/quick/`, `docs/reports/`, dan `TODO.md`.
- Urutan aksi: test regresi → edit → test/typecheck/build/theme → UAT lokal baca-saja → quality review → commit → push dan PR baru ke `main`. Tier diperiksa; tidak ada deploy.
- Masa berlaku dan stop condition: hanya posisi/lebar drawer detail terhadap Sidebar desktop; berhenti dan minta keputusan baru bila perlu mengubah router, struktur AppLayout/Sidebar, perilaku focus trap, drawer lain, token, API, data, atau RBAC.

**Disetujui:** belum. Persetujuan 2026-10-27 untuk cakupan lama (dua konsumen, PR #58) tidak dipakai ulang; menunggu persetujuan Owner untuk cakupan yang direvisi.

## Hasil

- Belum dieksekusi.
