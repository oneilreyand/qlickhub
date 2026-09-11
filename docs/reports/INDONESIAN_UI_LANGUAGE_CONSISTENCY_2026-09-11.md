## Task

INDONESIAN-UI-LANGUAGE-CONSISTENCY — menormalkan copy frontend, label aksesibilitas, dan format tanggal ke bahasa Indonesia yang alami.

## Outcome

Copy pada alur utama aplikasi web kini menggunakan bahasa Indonesia yang konsisten dan tetap natural. Istilah domain yang sudah menjadi bahasa produk—Workspace, Task, Subtask, Requirement, Test Case, Bug, QA, Product Owner, Developer, Frontend, Backend, Quality Gate, Handoff, Review, Retest, dan Delivery—dipertahankan agar tidak terasa janggal atau mengubah makna teknis.

Perubahan mencakup autentikasi, navigasi, Task Hub, detail Task/Subtask, My Tasks, QA desk, traceability, release assurance, laporan, onboarding, notifikasi, dialog, empty/error state, label aksesibilitas, dan locale tanggal `id-ID`. Helper `apps/web/src/lib/i18n/indonesianCopy.ts` menjadi tempat pemetaan pesan validasi jadwal yang dikembalikan backend.

## Source of truth and impact

- **Applicable SSoT:** [`docs/3_UI_ATOMIC_DESIGN_SYSTEM.md`](../3_UI_ATOMIC_DESIGN_SYSTEM.md), [`docs/1_ARCHITECTURE.md`](../1_ARCHITECTURE.md), [`docs/2_WORKFLOW_AND_ROLES.md`](../2_WORKFLOW_AND_ROLES.md), [`docs/4_AGENT_DEV_GUIDELINES.md`](../4_AGENT_DEV_GUIDELINES.md)
- **Policy IDs:** `UI-001`, `UI-002`, `DOC-003`, `DOC-004`
- **Data/interface impact:** None. Tidak ada perubahan API contract, payload, persisted data, atau backend interface.
- **Authorization impact:** None. Hanya copy presentasi dan label aksesibilitas yang berubah.
- **Migration risk:** None. Tidak ada schema atau migration yang diubah.

## Changed files

- `apps/web/index.html`, `apps/web/src/pages/*`, dan `apps/web/src/app/App.tsx` — bahasa dokumen, judul halaman, loading, autentikasi, dan route fallback.
- `apps/web/src/components/layout/*` dan `apps/web/src/components/auth/*` — navigasi, menu workspace, session, dan label aksesibilitas.
- `apps/web/src/components/ui/atoms/*` dan `apps/web/src/components/ui/molecules/*` — komponen bersama, dialog, editor, status badge, media, pencarian, tanggal, dan snackbar.
- `apps/web/src/components/ui/organisms/*` — Task Hub, Task detail, Task/Subtask, QA, Bug, laporan, settings, onboarding, traceability, release assurance, dan workflow guide.
- `apps/web/src/components/ui/organisms/myTasks/*`, `taskDetail/*`, `taskHub/*`, dan `features/notifications/*` — alur kerja role, QA, delivery, dan notifikasi.
- `apps/web/src/lib/i18n/indonesianCopy.ts` — pemetaan pesan validasi jadwal ke copy Indonesia yang natural.
- `TODO.md` — mencatat task selesai setelah copy produksi dan ekspektasi test UI diselaraskan.

## Validation

- `git diff --check` — passed.
- `npm run typecheck --workspace=@qlick/web` — passed.
- `npm run build --workspace=@qlick/web` — passed; Vite mentransformasi 1.701 modul dan menghasilkan bundle produksi.
- Locale audit `rg -n "en-US|toLocaleDateString\(\)|toLocaleString\(\)" apps/web/src` — tidak menemukan locale tanggal Inggris atau pemanggilan tanggal tanpa locale; satu `toLocaleString()` tersisa pada `AnimatedCounter` hanya untuk format angka.
- `npm test --workspace=@qlick/web -- --run` — passed; 152/152 test files dan 392/392 test cases lulus.
- `npm run validate` — passed; docs governance, lint (0 error; 23 warning yang sudah ada), dan seluruh typecheck lulus.
- `npm run build` — passed; contracts, API, dan frontend production build berhasil; Vite mentransformasi 1.701 modul.
- `git diff --check` — passed.
- Commit `e555e44` — pushed ke `main`.
- Vercel production deployment `dpl_4MNS8DYYvHenQTNoqtm6spxcFLLF` — `Ready`, alias `https://qlickhub.vercel.app` aktif.
- Smoke check production — `/` `200`, `/login` `200`, `/v1/health` `200`, `/v1/workspaces` `401` tanpa sesi (guard autentikasi aktif).
- Warnings: beberapa test masih menghasilkan peringatan React `act(...)` pada komponen asynchronous yang sudah ada sebelumnya.

## Risks or follow-up

- Component Gallery masih berisi label demonstrasi berbahasa Inggris karena sifatnya developer-facing, bukan copy runtime utama aplikasi.

## TODO update

- `INDONESIAN-UI-LANGUAGE-CONSISTENCY` → **Production released**
