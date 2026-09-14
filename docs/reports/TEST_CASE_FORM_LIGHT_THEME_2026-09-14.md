## Task

TEST-CASE-FORM-LIGHT-THEME — memperbaiki permukaan gelap permanen pada form “Buat Test Case Baru” ketika aplikasi memakai tema terang.

## Outcome

Form Test Case sekarang menggunakan atom dan token tema bersama untuk label, input, dropdown, daftar Requirement, kontrol langkah, pesan error, dan footer. Tema terang tidak lagi menampilkan dropdown atau panel Requirement berwarna hitam, sedangkan tema gelap tetap konsisten. Dropdown memiliki label yang terhubung, pilihan Requirement mengekspos status terpilih, dan tombol hapus langkah memiliki nama aksesibel serta target sentuh 44px.

## Source of truth and impact

- **Applicable SSoT:** `docs/2_WORKFLOW_AND_ROLES.md` §5 untuk lifecycle Test Case; `docs/3_UI_ATOMIC_DESIGN_SYSTEM.md` untuk Atomic Design, token Stitch, tema, responsivitas, dan aksesibilitas; `docs/4_AGENT_DEV_GUIDELINES.md` untuk lifecycle verifikasi.
- **Policy IDs:** `QA-001`, `UI-001`, `UI-002`, `TEST-001`, `DOC-003`.
- **Data/interface impact:** None. Payload dan service Test Case tidak berubah.
- **Authorization impact:** None. Aturan authoring, review, dan aktivasi Test Case tidak berubah.
- **Migration risk:** None. Tidak ada schema, migrasi, atau data persisten yang berubah.

## Changed files

- `apps/web/src/components/ui/organisms/myTasks/TestCaseFormModal.tsx` — mengganti warna gelap permanen dengan atom `Select`, `Alert`, `IconButton`, dan pasangan token light/dark yang sudah ada.
- `apps/web/src/components/ui/organisms/myTasks/__tests__/TestCaseFormModal.test.tsx` — menambahkan regresi kontrak tema dan label aksesibel pada tiga dropdown.
- `TODO.md` — mencatat lifecycle pekerjaan dan evidence penyelesaian.
- `docs/reports/TEST_CASE_FORM_LIGHT_THEME_2026-09-14.md` — mencatat bukti implementasi dan validasi.

## Validation

- `npm --prefix apps/web run test -- --run src/components/ui/organisms/myTasks/__tests__/TestCaseFormModal.test.tsx` sebelum perbaikan — **fail** 0/1 seperti diharapkan; 16 elemen masih memakai token gelap permanen.
- Perintah fokus untuk `TestCaseFormModal.test.tsx` dan `QaTestingDesk.test.tsx` setelah perbaikan — **pass** 14/14 test pada 2/2 file; 0 skipped.
- `npm --prefix apps/web run typecheck` — **pass**, 0 error.
- `npm --prefix apps/web run test` — **pass** 461/461 test pada 88/88 file; 0 failed, 0 skipped. Output masih memuat peringatan React `act(...)` lama pada beberapa suite yang tidak diubah.
- `npm run build` — **pass** untuk contracts, API, dan web; Vite mentransformasi 1.710 modul.
- `npm run lint` — **pass** dengan 0 error dan 21 warning lama pada file yang tidak disentuh.
- `npm run docs:check` — **pass** 5/5 test; 0 failed, 0 skipped; documentation governance passed.
- Pemeriksaan format pada form, regresi, dan `TODO.md` — **pass**; seluruh file cocok dengan Prettier.
- Visual lokal pada Chrome — **pass** untuk light dan dark pada desktop 1.624×969 serta mobile 390×844. Tidak ada permukaan hitam yang tersisa pada kondisi light; layout tetap dapat digulir pada mobile.
- Inspeksi read-only Production sebelum perbaikan — gejala pengguna terkonfirmasi pada tiga dropdown dan panel Requirement. Modal kemudian ditutup kembali; tidak ada form yang dikirim atau data Production yang dimutasi.

## Risks or follow-up

- Perbaikan belum dirilis ke Production; deployment memerlukan tugas rilis terpisah atau instruksi eksplisit pengguna.

## TODO update

- `TEST-CASE-FORM-LIGHT-THEME` → `Done`.
