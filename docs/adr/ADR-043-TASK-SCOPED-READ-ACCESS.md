# ADR-043 — Task-scoped reads follow task-level access

- **Status:** Accepted
- **Date:** 2026-11-12
- **Decision owner:** Owner, chat 2026-11-12: "celah aksesnya aku ingin di fix", lalu memilih
  cakupan "Semua endpoint baca, bertahap" (ADR dan kebijakan dahulu, PR 1 dan PR 2). Berlaku saat
  PR Phase 1 di-merge dengan label `owner-approved`.
- **Feature:** [TASK-READ-ACCESS](../features/TASK-READ-ACCESS/README.md)

## Context

`assertCanAccessTask` (`apps/api/src/policies/taskPolicy.ts`) membatasi Developer/QA pada task yang
ditugaskan ke mereka, yang mereka laporkan, atau Feature tempat mereka memegang Subtask. Aturan itu
hanya dipanggil oleh detail task, daftar Subtask dan eksekusi tes, dan belum tertulis di SSoT.
Smoke Production 2026-11-12 sebagai QA tanpa penugasan menunjukkan detail Feature 403, sedangkan
tautan referensi, Product Brief dan riwayat aktivitas Feature yang sama mengembalikan isinya (200).
Route baca task-scoped lain hanya memeriksa keanggotaan Workspace.

## Decision

Aturan kanonikal `AUTH-013` ada pada
[Architecture §5](../1_ARCHITECTURE.md#akses-baca-data-task). Satu fungsi
(`assertTaskAccessForActor`) menjadi sumber aturan; detail task dan middleware route
`requireTaskReadAccess` memakainya. Penerapan bertahap:

- **Phase 1:** tautan referensi, Product Brief, dokumen task, riwayat aktivitas, acceptance checks,
  daftar dan unduhan lampiran.
- **Phase 2:** requirement task, delivery trace, catatan rilis/sign-off, readiness dan handoff.

### Pengecualian

Membaca diskusi (`GET …/tasks/:taskId/comments`) tetap terbuka bagi semua anggota Workspace: setiap
anggota dapat di-mention dan harus bisa membaca thread untuk membalas (perilaku yang sudah diuji
pada `taskDiscussionApi.test.ts`). Pengecualian ini dapat dicabut dengan ADR lanjutan.

## Alternatives and consequences

Membuka detail task bagi semua anggota ditolak: Owner meminta celah ditutup, bukan aturannya
dilonggarkan. Pemeriksaan per service ditolak untuk Phase ini karena aturan akan diturunkan ulang
di banyak tempat; middleware tunggal menjaga satu definisi. Menutup hanya tiga endpoint yang
terbukti bocor ditolak Owner.

Konsekuensi: Developer/QA tanpa pekerjaan di sebuah Feature menerima 403 `FORBIDDEN` pada route
Phase 1 (perubahan perilaku yang disengaja; bentuk respons sukses tidak berubah). Task yang tidak
ada di Workspace tetap ditangani handler masing-masing. Biaya: satu query task dan satu `COUNT`
tambahan per request Developer/QA; planner tidak terkena. Tanpa migrasi, tanpa perubahan kontrak
atau data. Rollback: revert PR; tidak ada pemulihan data. Mutasi tidak diubah oleh ADR ini dan
tetap mengikuti batas role yang ada.
