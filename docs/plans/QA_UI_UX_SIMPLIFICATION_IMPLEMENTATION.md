# Rencana Implementasi — Penyederhanaan UI/UX QA

**Status:** Active — implementation in progress
**Feature Card:** [QA UI/UX Simplification](../features/QA_UI_UX_SIMPLIFICATION.md)
**Policy boundary:** `QA-001` disetujui pada 2026-09-18 melalui [ADR-015](../adr/ADR-015-QA-DIRECT-TEST-CASE-ACTIVATION.md).

## Fakta terkonfirmasi

- QA Desk sudah memiliki progressive disclosure, tetapi berada di bawah navigasi Drawer lain sehingga pengguna melihat navigasi bertingkat.
- Test Run wajib memiliki Feature, QA Subtask, Test Case version, Test Cycle/candidate, build, dan environment (`QA-006`). Data ini wajib dipertahankan, tetapi istilahnya tidak perlu menjadi beban UI.
- Result/evidence dan Bug/retest sudah append-only (`QA-002`, `QA-007`, `QA-008`).
- Hasil gagal tidak membuat Bug secara otomatis; QA harus berpindah ke tab Bug dan memilih Result.
- Kontrak Bug belum membawa snapshot langkah Test Case untuk reproduksi Developer/PO.
- Worktree saat perencanaan memiliki pekerjaan terpisah `QA-TEST-EXECUTION-ACTION-CLARITY`; rencana ini tidak menimpa atau menyatakan pekerjaan itu selesai.

## Keputusan yang masih terbuka

1. Label pengguna **Versi yang diuji** menggantikan tampilan utama **Siklus Pengujian**; istilah Siklus hanya ada pada Detail teknis.
2. Bug legacy tanpa Test Case revision menampilkan unavailable tanpa backfill spekulatif.

## Fase implementasi

### Fase 0 — Keputusan dan policy — selesai

- Keputusan publikasi langsung QA, SSoT, registry, Feature Card, policy, audit activity, dan
  notification outbox telah diperbarui konsisten.
- Migration 83 mengubah trigger PostgreSQL agar mendukung `draft → active` dan `active → draft`
  dengan version snapshot tetap immutable; clean-migration verification telah lulus.

**Risiko:** perubahan authorization/workflow. **Validasi:** docs check dan transition rejection tests sebelum UI dibangun.

### Fase 1 — Struktur layar dan orientasi

- Ubah komposisi `MyTaskDetailWorkspaceDrawer` dan `QaTestingDesk` tanpa mengubah data/API.
- Ganti tab bertingkat dengan enam tab Task dan ekstrak section menjadi organism kecil.
- Tambahkan kartu `Langkah berikutnya` dari `QaWorkflowSummary`; satu CTA primer dengan deep link ke tab dan objek tepat.

**File utama:** `MyTaskDetailWorkspaceDrawer.tsx`, `QaTestingDesk.tsx`, organism QA baru; `Tabs.tsx` hanya bila atom yang ada belum cukup.

**Risiko:** deep-link/refresh dan state focus. **Validasi:** component test, keyboard, 390px, desktop, loading/empty/error/forbidden.

### Fase 2 — Pengujian sederhana tanpa kehilangan scope

- Presentasikan Test Cycle sebagai **Versi yang diuji**.
- Klik `Jalankan Test Case` membuka form konteks hanya bila belum ada candidate aktif; setelah tersimpan, Test Run langsung dilanjutkan.
- Saat Run aktif, sembunyikan CTA Run baru dan hanya tampilkan `Catat Hasil`.

**Data/API impact:** tidak ada schema/migration; memakai endpoint QA Test Cycle dan Test Run yang sudah ada. **Authorization:** QA assignee saja.

### Fase 3 — Handoff Result gagal ke Bug

- Setelah Result gagal/terblokir tersimpan, tampilkan CTA `Buat Bug dari hasil ini`.
- Prefill Result asal, Requirement, title ringkas, actual result, dan evidence; QA tetap meninjau severity, Developer, dan reproduksi.
- Setelah Bug berhasil, navigasi ke tab Bug & Retest dan fokuskan kartu Bug baru.

**Data/API impact:** tidak ada Bug otomatis atau duplicate Bug tanpa konfirmasi QA. **Validasi:** PostgreSQL transaction/audit, duplicate/error state, component flow, browser E2E.

### Fase 4 — Konteks reproduksi Bug immutable

- Perluas `BugWithContext` dengan snapshot Test Case revision asal dari `TestCaseVersion`.
- Render `Cara mereproduksi` di kartu/modal Bug; Detail teknis collapsible menyimpan revision ID dan scope.
- Jangan membaca Test Case terbaru untuk mengganti fakta historis.

**File utama:** `packages/contracts/src/bug.ts`, `bugService.ts`, `BugExperiencePanel.tsx`, API integration dan contract tests.

**Migration risk:** tidak ada bagi revision yang sudah ada; legacy marked unavailable. **Validasi:** clean PostgreSQL, Workspace/RBAC, history immutability.

### Fase 5 — Retest dan penyelesaian QA

- `Mulai Retest` dimulai dari Resolution Event terbaru dan membuka Result pada Test Case asal.
- Timeline mengelompokkan Temuan → Perbaikan #n → Retest #n → Outcome; evidence tidak disalin atau digabungkan secara heuristik.
- Completion panel menampilkan checklist dan CTA remediasi dari blocker backend.

**Risiko:** candidate mismatch dan Bug legacy. **Validasi:** dua siklus retest persisted, verified/reopened, PO/Dev read-only, E2E role isolation.

### Fase 6 — Rollout dan evidence

- Jalankan browser E2E disposable PostgreSQL untuk desktop/mobile.
- Visual QA menggunakan data persisted pada desktop dan 390px, light/dark, keyboard/focus, loading/error/denied states.
- Rilis bertahap sesuai mode QA assurance Workspace; Agent Report mencatat command, pass/fail count, migration status, deployment, dan rollback target.

## Urutan commit kecil

1. ADR + SSoT + contracts/policy tests setelah keputusan Product.
2. Navigation shell + next-action card + component tests.
3. Test execution wording/context + focused tests.
4. Failed Result → contextual Bug handoff + PostgreSQL/API tests.
5. Bug snapshot contract/API/UI + immutable-history tests.
6. Retest timeline/completion guidance + E2E and responsive evidence.

## Definition of done

- Semua acceptance criteria Feature Card terpenuhi.
- Tidak ada UUID atau field scope internal pada alur normal QA.
- Authorization backend menolak actor di luar scope pada seluruh mutation.
- Browser E2E membuktikan workflow persisted dari Test Case hingga Bug/retest serta pembacaan PO/Dev.
- Tidak ada production mock data atau perhitungan readiness di React.
- Dokumentasi, TODO, Agent Report, dan hasil validasi diperbarui setelah implementasi nyata.
