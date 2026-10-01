## Task

MULTI-WORKSPACE-LEADER-DASHBOARD — Hadirkan Executive Leader Hub lintas-workspace dengan agregasi timeline anggota & deteksi bentrok (conflict), pelacakan kualitas (Staging vs Prod, Defect Escape Rate, Bug Reopen Rate), dan Executive Leadership Digest berkala (mingguan/bulanan) dengan ekspor Markdown dan cetak PDF.

## Outcome

Para Leader / Admin yang memimpin beberapa workspace membutuhkan visibilitas menyeluruh lintas-tim tanpa harus berpindah-pindah workspace secara manual satu per satu. Solusi ini menghadirkan:

1. **Navigasi Header Bersih Tanpa Sidebar:** Mengintegrasikan titik akses Leader Hub langsung pada Header Bar Atas:
   - Dropdown Switcher Workspace (kiri atas samping logo): Opsi `👑 Executive Leader Hub` di posisi teratas.
   - Header Navigasi Pill: Tombol `[ 👑 Leader Hub ]` khusus untuk peran Owner & Admin.
2. **Pilar 1 - Timeline Tim & Workload Conflicts (`LeaderTimelineTab`):**
   - Agregasi beban kerja anggota dari seluruh workspace yang dipimpin.
   - Status kapasitas kanonis: `underutilized`, `balanced`, atau `overloaded`.
   - Deteksi tumpang tindih jadwal (schedule overlap conflict) antar subtask aktif beserta badge peringatan visual.
   - Filter spesialisasi teknis (`frontend`, `backend`, `qa`, `fullstack`, dll.).
3. **Pilar 2 - Pelacakan Kualitas & Defect Staging vs Prod (`LeaderQualityTab`):**
   - Perbandingan rasio bug Staging vs Production.
   - Defect Escape Rate (DER): $\frac{\text{Prod}}{\text{Staging} + \text{Prod}} \times 100\%$ beserta status ambang batas ($< 5\%$ Sehat, $5\%-15\%$ Perhatian, $> 15\%$ Kritis).
   - Developer Bug Bounce Rate: Melacak bug yang dibuka kembali (reopened) oleh QA setelah developer menandai selesai.
4. **Pilar 3 - Executive Leadership Digest (`LeaderDigestTab`):**
   - Ringkasan eksekutif berkala mingguan (7 hari) dan bulanan (30 hari).
   - Aksi 1-click salin laporan format Markdown untuk Slack/Email/Notion.
   - Tombol cetak langsung dokumen berformat resmi via print stylesheet browser.
5. **Dukungan Insiden Post-Production:**
   - Menambahkan kolom `environment` ('staging' | 'production', default 'staging') pada tabel `bugs` (Migration 86).
   - Menjadikan `test_result_id` bersifat opsional/nullable agar bug production dapat langsung dilaporkan tanpa mewajibkan test execution result dari staging.
6. **Rate Limiting & Cooldown Protection:**
   - Menambahkan client-side cooldown 60 detik pada `useNotifications` untuk `checkApproachingDeadlinesThunk` guna mencegah 429 Too Many Requests saat navigasi/re-render.
   - Menyesuaikan backend `notificationRateLimiter` agar fleksibel di lingkungan development (1.000 req/menit) dan aman di production (15 req/menit).

## Source of truth and impact

- **Applicable SSoT:** [Architecture](../1_ARCHITECTURE.md), [Workflow and Roles](../2_WORKFLOW_AND_ROLES.md), [UI Design System](../3_UI_ATOMIC_DESIGN_SYSTEM.md).
- **Policy IDs:** `AUTH-001`, `AUTH-002`, `DATA-001`, `CONTRACT-001`, `UI-001`, `UI-002`, `FLOW-007`, `QA-003`, `QA-008`, `TEST-001`, `DOC-001`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** Penambahan endpoint `/v1/leader/*` (`workspaces`, `timeline`, `quality`, `digest`), penambahan kontrak `@qlick/contracts/leader`, penambahan kolom `environment` dan nullable `test_result_id` pada tabel `bugs`.
- **Authorization impact:** Akses ke endpoint dan antarmuka Leader Hub terisolasi ketat hanya untuk pengguna berstatus `owner` dan `admin` di workspace terkait.
- **Migration risk:** Nol downtime; kolom `environment` memiliki nilai bawaan `'staging'`, dan perubahan `test_result_id` ke nullable sepenuhnya kompatibel mundur dengan data lama.

## Changed files

- `packages/contracts/src/leader.ts` — kontrak skema Zod dan tipe data untuk ringkasan workspace, timeline, metrik kualitas, dan digest eksekutif.
- `packages/contracts/src/bug.ts` — skema `BugEnvironmentSchema`, `environment`, dan nullable `testResultId`.
- `packages/contracts/src/index.ts` — ekspor modul kontrak leader.
- `apps/api/src/db/migrations/20261001000086-add-bug-environment-and-nullable-test-result.cjs` — migrasi DDL PostgreSQL.
- `apps/api/src/db/models/bug.ts` — model Sequelize untuk atribut bug baru.
- `apps/api/src/modules/bugs/bugService.ts` — mapping dan pembuatan bug dengan environment dan optional testResultId.
- `apps/api/src/modules/leader/leaderService.ts` — business logic agregasi multi-workspace, timeline, deteksi overlap, metrik kualitas, dan laporan digest.
- `apps/api/src/modules/leader/leaderController.ts` & `leaderRoutes.ts` — handler REST API dengan guard otorisasi `admin` / `owner`.
- `apps/api/src/app.ts` — registrasi route `/v1/leader`.
- `apps/api/src/http/middleware/rateLimit.ts` — penyesuaian batas request notifikasi.
- `apps/web/src/features/leader/` — komponen tab analitik `LeaderTimelineTab`, `LeaderQualityTab`, dan `LeaderDigestTab`.
- `apps/web/src/pages/LeaderHubPage.tsx` — halaman utama Leader Hub dengan multi-workspace selector.
- `apps/web/src/components/layout/Header.tsx` & `Sidebar.tsx` — titik akses navigasi atas dan dropdown workspace switcher.
- `apps/web/src/features/notifications/hooks/useNotifications.ts` — client-side cooldown per workspace.
- `TODO.md` — dokumentasi penyelesaian task.

## Validation

- `npm --prefix packages/contracts run test` — 81/81 tes kontrak lulus.
- `npm --prefix apps/api run test:integration` — tes integrasi leader lulus (6/6).
- `npm --prefix apps/web run test` — 108/108 file tes web lulus (583/583 tes unit).
- `npm run validate` — pemeriksaan `docs:check` (8/8), `lint` (0 error), dan `typecheck` seluruh paket lulus 100%.
- `npm run build` — build produksi Vite dan tsc seluruh paket sukses.

## Risks or follow-up

- Tidak ada risiko regresi; seluruh antarmuka workspace tunggal yang ada (`/work`, `/my-tasks`, `/reports`) tetap beroperasi seperti semula.
