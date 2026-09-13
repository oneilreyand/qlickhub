# Agent Report — Task Hub Natural Indonesian Copy

## Task

`TASK-HUB-NATURAL-INDONESIAN-COPY` — tuntaskan copy Indonesia yang masih bercampur Inggris pada Task Hub, koleksi Task, prioritas, pemilih rentang tanggal, dan presentasi gate kesiapan rilis.

## Outcome

- Filter jadwal sekarang menjelaskan cakupan Feature dalam bahasa Indonesia yang singkat dan natural.
- Koleksi Task memakai `grup status`, prioritas `Rendah/Sedang/Tinggi/Mendesak`, `Tanpa Folder`, `ID / Judul Task`, `Delivery & Rilis`, dan aksi `Lihat Detail` termasuk label aksesibilitasnya.
- Label dan alasan gate kesiapan rilis diterjemahkan saat ditampilkan pada Task Hub, detail Task, My Tasks, Laporan, dan Keputusan Rilis. Payload serta snapshot backend tetap utuh.
- Pemilih rentang tanggal sekarang sepenuhnya berbahasa Indonesia dan tidak lagi menempatkan tombol hapus di dalam tombol pemilih.
- Istilah produk yang sudah lazim—Task, Feature, Requirement, Test Case, Test Run, Subtask, Bug, QA, Delivery, dan QA Sign-off—dipertahankan agar copy tidak terasa dipaksakan.

## Source of truth and impact

- **Applicable SSoT:** [`docs/3_UI_ATOMIC_DESIGN_SYSTEM.md`](../3_UI_ATOMIC_DESIGN_SYSTEM.md) dan [`docs/4_AGENT_DEV_GUIDELINES.md`](../4_AGENT_DEV_GUIDELINES.md).
- **Policy IDs:** `UI-001`, `UI-002`, `TEST-001`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** Tidak ada perubahan API, payload, atau data persisten. Helper frontend menerjemahkan label/alasan gate berdasarkan kode dan pesan backend ketika dirender; pesan baru yang belum dipetakan tetap ditampilkan tanpa diubah.
- **Authorization impact:** Tidak ada.
- **Migration risk:** Tidak ada perubahan schema atau migrasi.

## Changed files

- `apps/web/src/lib/i18n/indonesianCopy.ts` — menambahkan pemetaan copy gate kesiapan rilis untuk lapisan presentasi.
- `apps/web/src/lib/i18n/__tests__/indonesianCopy.test.ts` — menguji label, alasan dinamis, dan fallback pesan gate.
- `apps/web/src/components/ui/molecules/ReleaseReadinessSignal.tsx` — menampilkan gate gagal menggunakan copy Indonesia.
- `apps/web/src/components/ui/molecules/__tests__/ReleaseReadinessSignal.test.tsx` — menguji alasan dan label yang sudah diterjemahkan.
- `apps/web/src/components/ui/organisms/ReleaseAssurancePanel.tsx` — menampilkan snapshot gate dengan copy Indonesia yang sama.
- `apps/web/src/components/ui/organisms/__tests__/ReleaseAssurancePanel.test.tsx` — menyelaraskan bukti snapshot/override dengan copy baru.
- `apps/web/src/components/ui/organisms/TaskCollection.tsx` — menormalkan label koleksi, prioritas, folder, kolom, aksi, dan aksesibilitas.
- `apps/web/src/components/ui/organisms/__tests__/TaskCollection.test.tsx` — menguji copy dan interaksi keyboard yang baru.
- `apps/web/src/components/ui/organisms/taskHub/TaskHubDatePresetBar.tsx` — menerjemahkan penjelasan cakupan jadwal.
- `apps/web/src/components/ui/organisms/taskHub/__tests__/TaskHubDatePresetBar.test.tsx` — menguji copy dan pemilihan preset.
- `apps/web/src/components/ui/molecules/DateRangePicker.tsx` — menerjemahkan seluruh popover serta memisahkan tombol hapus dari tombol pemilih.
- `apps/web/src/components/ui/molecules/__tests__/DateRangePicker.test.tsx` — menguji copy, preset, penghapusan, dan struktur tombol yang valid.
- `apps/web/src/components/ui/organisms/__tests__/TaskReportDashboard.test.tsx` dan `apps/web/src/components/ui/organisms/myTasks/__tests__/MyTaskFeatureContext.test.tsx` — menyelaraskan konsumen readiness bersama.
- `TODO.md` — mencatat scope, status, dan bukti implementasi.

## Validation

- `npm --prefix apps/web run test -- <9 berkas tes fokus>` — lulus; 9 berkas, 50 tes, 0 gagal, 0 dilewati.
- `npm --prefix apps/web run test` — lulus; 80 berkas, 422 tes, 0 gagal, 0 dilewati. Peringatan lama React `act(...)` tetap muncul pada beberapa suite asynchronous. Peringatan tombol bersarang `DateRangePicker` yang sebelumnya muncul di galeri komponen sudah tidak muncul.
- `npm --prefix apps/web run typecheck` — lulus; 0 error TypeScript.
- `npm exec eslint -- <14 berkas implementasi/tes utama>` — lulus; 0 error dan 0 warning.
- `npm run build:web` — lulus; TypeScript dan Vite Production build berhasil, 1.701 modul ditransformasi.
- Audit string runtime terarah — tidak menemukan lagi copy sumber `Feature schedule scope`, `Choose which Features`, `Inspect task`, `Task ID / Title`, `Delivery & Release`, `status group`, `Unfiled`, atau label prioritas Inggris pada komponen runtime yang diperbaiki. String alasan Inggris hanya tersisa sebagai pola input backend di helper penerjemah.
- Pemeriksaan browser lokal terautentikasi pada workspace pengembangan `essensial` — lulus pada viewport desktop 1.440×900 dan ponsel 390×844. Filter jadwal, tabel/kartu Task, alasan gate, dan popover tanggal tampil utuh dengan 0 error/warning browser.
- Tidak ada aksi simpan atau mutasi data produk selama pemeriksaan browser. Sesi pengembangan ditutup dan server web lokal dihentikan setelah validasi.

## Risks or follow-up

- Jika backend kelak menambahkan alasan gate baru, frontend sengaja menampilkan pesan tersebut apa adanya sampai pemetaan Indonesia ditambahkan; fallback ini mencegah informasi gate hilang.
- Copy developer-facing pada Component Gallery dan istilah status workflow yang sengaja dipertahankan di panduan bukan bagian dari slice ini.
- Peringatan React `act(...)` lama pada suite asynchronous tetap menjadi pekerjaan pemeliharaan tes terpisah.

## TODO update

- `TASK-HUB-NATURAL-INDONESIAN-COPY` → `Done`.
