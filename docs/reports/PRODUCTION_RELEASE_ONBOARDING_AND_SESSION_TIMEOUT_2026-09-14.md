# Agent Report — Production Release: Onboarding SDLC Alignment & Session Timeout Modal UX

## Task

PRODUCTION-RELEASE-ONBOARDING-AND-SESSION-TIMEOUT: Selaraskan alur dan teks Onboarding Wizard dengan arsitektur SDLC terbaru, tuntaskan perbaikan keandalan dan aksesibilitas Session Timeout Modal, jalankan pengujian menyeluruh, dan rilis ke Vercel Production.

## Outcome

Perubahan Onboarding Wizard (`RoleOnboardingModal`) dan Session Timeout Modal (`SessionTimeoutModal` & `authService`) telah diimplementasikan, diverifikasi melalui rangkaian tes lengkap, dan dipersiapkan untuk rilis ke Vercel Production.

1. **Onboarding Flow SDLC Alignment**:
   - `OnboardingRoleWorkflowStep.tsx`: Menyajikan pemisahan tanggung jawab Product Owner antara Ringkasan Produk (Product Brief) vs Requirement & Kriteria Keberterimaan (AC), 5 spesialisasi pengembang (`frontend`, `backend`, `mobile`, `fullstack`, `qa`), alur penanganan Bug (`resolved ➔ retest`), siklus Subtask QA independen (`todo ➔ in_progress ➔ done`), QA Testing Desk di My Tasks, QA Sign-off formal, serta evaluasi Release Decision oleh PO.
   - `OnboardingWelcomeStep.tsx`: Memperbarui ringkasan persona PO, Dev, dan QA agar selaras dengan arsitektur peran kanonikal.
   - `OnboardingQuickLaunchStep.tsx`: Mengganti tautan footer "Panduan Alur Pengguna" dengan aksi langsung "Menu Profil > Mulai Ulang Onboarding".
2. **Session Timeout Modal Reliability & UX**:
   - `SessionTimeoutModal.tsx`: Memperbaiki interaksi tombol "Keluar Sekarang", Escape, dan klik backdrop dengan mengikat `onClose={handleLogoutDueToInactivity}`, sehingga memicu logout terotorisasi dan navigasi ke `/login?reason=idle_timeout`.
   - `authService.ts`: Memperbarui fungsi `logout(redirectTo = '/login')` agar mendukung dan mempertahankan query string target (misal `?reason=idle_timeout`) saat berpindah ke halaman login.
   - **Sinkronisasi Multi-Tab**: Menambahkan sinkronisasi timestamp `qlick_last_activity_at` via `localStorage` dan pendengar event `storage`. Aktivitas atau perpanjangan sesi di satu tab secara otomatis menutup modal peringatan dan mereset timer di tab lainnya.
   - **Throttling Aktivitas**: Membatasi penulisan aktivitas mouse/scroll ke `localStorage` maksimal 2 detik sekali untuk menjaga performa rendering.
   - **Pemulihan Hibernasi/Sleep**: Menangani kasus komputer bangun dari tidur panjang dengan auto-logout seketika jika total durasi batas inaktivitas terlampaui.
   - **Aksesibilitas & Feedback**: Menambahkan `role="timer"` dan `aria-live="polite"` pada tampilan countdown, serta memicu notifikasi snackbar sukses (`Sesi Anda berhasil diperpanjang.`) saat pengguna memperpanjang sesi.

## Source of truth and impact

- **Applicable SSoT:**
  - `docs/1_ARCHITECTURE.md` (Domain model, RBAC, session lifecycle)
  - `docs/2_WORKFLOW_AND_ROLES.md` (SDLC end-to-end role workflows, QA testing desk, release decision)
  - `docs/3_UI_ATOMIC_DESIGN_SYSTEM.md` (Atomic modal & snackbar design tokens)
  - `docs/4_AGENT_DEV_GUIDELINES.md` (Developer guidelines & verification policy)
  - `docs/DEPLOYMENT_AND_ENVIRONMENTS.md` (Production deployment & verification sequence)
- **Policy IDs:** `AUTH-001`, `AUTH-002`, `DOMAIN-002`, `DOMAIN-004`, `FLOW-001`, `FLOW-002`, `QA-001`, `QA-004`, `RELEASE-001`, `UI-001`, `UI-002`, `TEST-001`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** Tidak ada perubahan skema database, migrasi, ataupun kontrak API backend.
- **Authorization impact:** Tidak ada perubahan otorisasi; endpoint logout dan refresh sesi tetap tunduk pada kebijakan sesi aktif backend.
- **Migration risk:** Nol. Tidak ada migrasi database yang dijalankan.

## Changed files

- `apps/web/src/components/auth/SessionTimeoutModal.tsx` — onClose binding, multi-tab storage sync, sleep recovery, throttled activity listener, feedback snackbar, dan a11y timer.
- `apps/web/src/components/auth/__tests__/SessionTimeoutModal.test.tsx` — 7 tes unit komprehensif untuk modal timeout, tombol keluar, perpanjangan sesi, expiry, multi-tab sync, dan sleep recovery.
- `apps/web/src/lib/api/authService.ts` — dukungan parameter `redirectTo` pada fungsi `logout`.
- `apps/web/src/lib/api/__tests__/authService.test.ts` — tes unit verifikasi parameter `redirectTo` pada logout.
- `apps/web/src/components/ui/organisms/onboarding/OnboardingRoleWorkflowStep.tsx` — penyelarasan workflow SDLC PO, Dev, QA.
- `apps/web/src/components/ui/organisms/onboarding/OnboardingWelcomeStep.tsx` — penyelarasan teks ringkasan persona.
- `apps/web/src/components/ui/organisms/onboarding/OnboardingQuickLaunchStep.tsx` — pembaruan referensi aksi ulang onboarding pada profil.
- `apps/web/src/components/ui/organisms/__tests__/RoleOnboardingModal.test.tsx` — penyesuaian ekspektasi teks onboarding modal.
- `TODO.md` — pencatatan status selesai untuk ONBOARDING-FLOW-SDLC-ALIGNMENT dan SESSION-TIMEOUT-MODAL-UX.
- `docs/reports/PRODUCTION_RELEASE_ONBOARDING_AND_SESSION_TIMEOUT_2026-09-14.md` — laporan rilis ini.

## Validation

- `npm --prefix apps/web test -- --run src/components/auth/__tests__/SessionTimeoutModal.test.tsx src/lib/api/__tests__/authService.test.ts src/pages/__tests__/LoginPage.test.tsx src/components/ui/organisms/__tests__/RoleOnboardingModal.test.tsx`: 4/4 file tes lulus, 22/22 tes lulus (0 gagal, 0 skipped).
- `npm --prefix apps/web test -- --run`: 86/86 file tes web lulus, 453/453 tes lulus.
- `npm run validate`:
  - `npm run docs:check`: 5/5 lulus.
  - `npm run lint`: 0 error (22 warning lama tak terkait).
  - `npm run typecheck`: `@qlick/contracts`, `@qlick/api`, dan `@qlick/web` semuanya 0 error.
- `npm run env:check`: lulus 0 warning, tidak ada secret yang tercetak.
- `npm run build`: lulus build produksi untuk packages/contracts, apps/api, dan apps/web (1.708 modul ditransformasi oleh Vite).
