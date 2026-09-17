## Task

QA-ASSURANCE-S7B-WORKSPACE-ROLLOUT-UI — tampilkan dan kelola konfigurasi rollout QA assurance pada Workspace Settings.

## Outcome

Workspace Settings sekarang memiliki card Rollout QA Assurance yang memuat mode persisted dari API terautentikasi. Owner/Admin aktif dapat memilih mode baru dan menyimpan alasan minimal 10 karakter; PO, Developer, dan QA dapat menemukan halaman melalui Header/Sidebar, membaca mode yang sama, dan hanya melihat kontrol disabled tanpa form mutasi. `observe`, `warn`, dan `enforce` dijelaskan dengan jujur: mode `enforce` belum mengaktifkan hard gate pada S7B. Tidak ada fallback data browser atau kalkulasi readiness di React.

## Source of truth and impact

- **Applicable SSoT:** [`docs/1_ARCHITECTURE.md`](../1_ARCHITECTURE.md), [`docs/2_WORKFLOW_AND_ROLES.md`](../2_WORKFLOW_AND_ROLES.md), [`docs/3_UI_ATOMIC_DESIGN_SYSTEM.md`](../3_UI_ATOMIC_DESIGN_SYSTEM.md), [`docs/adr/ADR-014-QA-EVIDENCE-EXECUTION-AND-RELEASE-ASSURANCE.md`](../adr/ADR-014-QA-EVIDENCE-EXECUTION-AND-RELEASE-ASSURANCE.md)
- **Policy IDs:** `AUTH-009`, `QA-009`, `RELEASE-003`, `DATA-001`, `CONTRACT-001`, `UI-001`, `UI-002`, `TEST-001`, `DOC-002`, `DOC-003`, `DOC-004`
- **Data/interface impact:** Tidak ada schema, migration, atau response shape baru. Web client memakai contract S7A dan endpoint GET/PATCH rollout yang sudah ada.
- **Authorization impact:** UI memperluas discoverability read-only untuk active Developer/QA dan tidak memberi capability baru; backend tetap menentukan akses baca/mutasi. Hanya Owner/Admin memperoleh Select/textarea/button aktif.
- **Migration risk:** S7B tidak punya migration. Namun fungsi runtime bergantung pada migration 81 S7A yang belum terverifikasi terhadap PostgreSQL; tidak ada Preview/Production mutation.

## Changed files

- `apps/web/src/lib/api/workspaceService.ts` dan `apps/web/src/lib/api/__tests__/workspaceService.test.ts` — API client GET/PATCH rollout yang memakai shared contract.
- `apps/web/src/components/ui/organisms/QaAssuranceRolloutCard.tsx` dan test-nya — organism Atomic Design dengan state loading, missing, error/retry, Owner/Admin mutation, dan member read-only.
- `apps/web/src/features/workspaces/index.ts` — export organism pada feature boundary.
- `apps/web/src/pages/WorkspaceSettingsPage.tsx` dan test-nya — load/save backend, snackbar hasil mutation, serta tampilan read-only Developer.
- `apps/web/src/components/layout/Header.tsx`, `Sidebar.tsx`, dan tests — seluruh role Workspace dapat menemukan halaman Settings; Galeri Komponen tetap Owner-only.
- `docs/3_UI_ATOMIC_DESIGN_SYSTEM.md` dan `docs/features/QA_ASSURANCE_WORKSPACE_ROLLOUT_UI.md` — canonical route/UI contract dan Feature Knowledge Card S7B.

## Validation

- `npm --prefix apps/web test -- Header Sidebar WorkspaceSettingsPage QaAssuranceRolloutCard workspaceService` — lulus, 30/30 test pada 5 file. Runner mencetak warning `act(...)` lama pada Header/WorkspaceSettingsPage async fixtures; tidak ada failure S7B.
- `npm --prefix apps/web run typecheck` — lulus.
- `npm --prefix apps/web run build` — lulus, Vite mentransformasi 1.711 modul.
- `npm run lint` — lulus, 0 error dan 20 warning lama di luar S7B.
- `npm run docs:check` — lulus, 5/5 pemeriksaan dokumentasi.
- `git diff --check` — lulus.
- `npm --prefix apps/web test` — 472/474 lulus; dua failure berada pada `BugExperiencePanel.test.tsx` retest/resolution queue yang tidak disentuh S7B dan direproduksi saat test file dijalankan sendiri (5/7 lulus).
- PostgreSQL migration/integration S7A dan UI visual desktop/mobile dengan data terautentikasi — belum dapat dijalankan karena migration 81 masih diblokir oleh batas penggunaan akun sampai 2026-09-20 09:05. Tidak ada workaround dijalankan.

## Risks or follow-up

- Setelah PostgreSQL dapat digunakan, jalankan clean migration dan S7A integration test terlebih dahulu, lalu validasi browser desktop/mobile untuk Owner mutation serta PO/Developer/QA read-only dengan data persisted.
- Selidiki dua regresi `BugExperiencePanel` secara terpisah; jangan mengubah ekspektasi atau workflow retest agar S7B tampak hijau.
- `warn`/`enforce` tetap konfigurasi dan tidak boleh dipakai sebagai hard gate hingga pilot, UAT lintas peran, dan keputusan rollout eksplisit tersedia.

## TODO update

- `QA-ASSURANCE-S7B-WORKSPACE-ROLLOUT-UI` → `Blocked`
