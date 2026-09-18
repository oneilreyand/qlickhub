# QA-TEST-EXECUTION-ACTION-CLARITY Laporan Eksekusi — 2026-09-17

## Task

Perjelas fungsi aksi memulai pekerjaan QA, menjalankan Test Case, dan mencatat Hasil Pengujian; perbarui form Result agar evidence wajib dapat diunggah langsung.

## Outcome

Audit menemukan dua tombol bernama **Mulai Pengujian** dengan efek berbeda. Tombol header hanya memindahkan status Subtask QA dari `todo` ke `in_progress`, sedangkan tombol pada kartu Test Case membuat `TestRun` persisten. Saat Run sudah aktif, UI juga tetap menawarkan Run baru bersamaan dengan **Catat Hasil**, walaupun completion gate meminta Run aktif diselesaikan.

Alur kini memakai istilah dan tindakan yang berbeda:

- **Mulai Pekerjaan QA** memulai status Subtask QA.
- **Jalankan Test Case** membuat satu Test Run pada Siklus Pengujian terpilih.
- Ketika Run aktif, kartu hanya menawarkan **Catat Hasil** dan tidak menawarkan Run baru.
- Dialog Run menampilkan Test Case, build, dan lingkungan sebagai konteks hanya-baca dari Siklus Pengujian; QA tidak lagi diminta mengetik ulang nilai yang backend wajibkan identik.
- Dialog Hasil menampilkan Test Case serta build/lingkungan Run, memakai token tema terang/gelap yang konsisten, dan menyediakan unggah gambar/video maksimal 15 MB langsung sebagai `qa_evidence`. Bukti yang berhasil diunggah otomatis dipilih untuk Result.
- Perbaikan lanjutan 2026-09-18 menutup kondisi diam-diam ketika QA menekan **Jalankan Test Case** tanpa Siklus Pengujian aktif. UI sekarang langsung membuka form **Buat Siklus Pengujian**; setelah Siklus tersimpan, dialog Run untuk Test Case semula otomatis dilanjutkan.

## Source of truth and impact

- **Applicable SSoT:** `docs/2_WORKFLOW_AND_ROLES.md` bagian Hasil Uji Imutabel; `docs/3_UI_ATOMIC_DESIGN_SYSTEM.md`; `docs/features/QA_PROGRESSIVE_DISCLOSURE.md`; `docs/features/SDLC_QUALITY_AND_RELEASE.md`.
- **Policy IDs:** `AUTH-009`, `QA-007`, `QA-008`, `UI-001`, `UI-002`, `TEST-001`, `DOC-004`.
- **Data/interface impact:** Tidak ada kontrak atau schema baru. Upload memakai endpoint Task Attachment yang ada dengan kategori `qa_evidence`; Result tetap memakai payload yang sama.
- **Authorization impact:** Tidak ada. Backend tetap membatasi eksekusi dan upload Subtask kepada QA assignee.
- **Migration risk:** Tidak ada migration atau backfill.

## Changed files

- `apps/web/src/components/ui/organisms/myTasks/QaTestingDesk.tsx` — membedakan tindakan Subtask/Run, menghilangkan input scope Run redundan, menampilkan satu next action, memperbarui form Result, mengintegrasikan upload evidence existing, dan meneruskan Test Case yang tertunda setelah pembuatan Siklus.
- `apps/web/src/components/ui/organisms/myTasks/__tests__/QaTestingDesk.test.tsx` — mengunci label, konteks read-only, exclusivity aksi Run/Result, upload evidence langsung, serta alur klik Run tanpa Siklus hingga dialog Run terbuka.
- `TODO.md` — mencatat task dan status validasi.
- `docs/reports/QA_TEST_EXECUTION_ACTION_CLARITY_2026-09-17.md` — laporan perubahan dan evidence.

## Validation

- `npm --prefix apps/web run test -- --run src/components/ui/organisms/myTasks/__tests__/QaTestingDesk.test.tsx` — tes regresi baru awalnya gagal karena klik Run tanpa Siklus tidak membuka dialog; setelah perbaikan lulus 24/24, gagal 0, dilewati 0. Warning React `act(...)` lama tetap muncul pada test anti-self-approval yang tidak disentuh.
- `npm --prefix apps/web run test -- --run` — lulus 492/492 pada 90 file, gagal 0, dilewati 0. Warning React `act(...)` lama muncul pada beberapa test dan tidak berasal dari perubahan ini.
- `npm --prefix apps/web run typecheck` — lulus tanpa error.
- `npx eslint apps/web/src/components/ui/organisms/myTasks/QaTestingDesk.tsx apps/web/src/components/ui/organisms/myTasks/__tests__/QaTestingDesk.test.tsx` — lulus tanpa error atau warning.
- `npm --prefix apps/web run build` — lulus; Vite membangun 1.711 modul.
- `npm run docs:check` — lulus 5/5 test governance dan pemeriksaan dokumentasi.
- `git diff --check` — lulus.
- Vercel Production deployment awal `dpl_EFguwD6dvyZ641ct2AigAGnCxQ2P`, lalu deployment perbaikan Run tanpa Siklus `dpl_BxGBxkpfzUMVjMuZTdMxDZQxv7zE` — `READY` dan dialias ke `https://qlickhub.vercel.app`; remote build menyelesaikan contracts/API TypeScript dan Vite build 1.711 modul.
- `GET https://qlickhub.vercel.app/v1/health` setelah deployment — HTTP `200`, service `ok`, database `connected`.
- Browser Production `/my-tasks` — Workspace `kerjaa`, antrean tersimpan, dan panel aplikasi berhasil dimuat ulang tanpa error pada sesi Owner baca-saja.

## Risks or follow-up

- Upload `qa_evidence` bersifat formal dan immutable sejak tersimpan. Form menjelaskan hal ini; jika pengguna menutup dialog setelah upload tetapi sebelum mencatat Result, attachment tetap tersimpan dan dapat dipilih pada percobaan berikutnya.
- Visual Production dialog Run/Result terautentikasi sebagai QA assignee pada desktop/mobile masih menunggu konfirmasi pengguna setelah hard refresh; perilaku tanpa Siklus sudah dikunci oleh tes regresi dari klik hingga dialog Run lanjutan.

## TODO update

- `QA-TEST-EXECUTION-ACTION-CLARITY` → `In progress` sampai pengguna mengonfirmasi visual smoke Production sebagai QA assignee.
