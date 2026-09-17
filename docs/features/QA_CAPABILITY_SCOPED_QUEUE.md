# QA-E2E-S2 — Antrean QA Berdasarkan Capability dan Deep-link

**Status:** Active pada development/test; belum dideploy ke Production
**Owner:** Product, Engineering, dan QA
**Last reviewed:** 2026-09-16
**Applicable Policy IDs:** `AUTH-001`, `AUTH-002`, `AUTH-009`, `QA-004`, `QA-006`, `QA-007`, `QA-008`, `QA-009`, `DATA-001`, `DATA-002`, `CONTRACT-001`, `UI-001`, `UI-002`, `TEST-001`, `DOC-003`, `DOC-004`

## 1. Tujuan dan Pengguna

Antrean **Tugas Saya** untuk QA hanya menampilkan retest dan sertifikasi yang relevan terhadap
scope QA assignee yang tersimpan. Kartu menjelaskan apakah pekerjaan dapat dilakukan sekarang,
masih diblokir prasyarat, atau hanya informasi histori; kartu juga membuka konteks Bug, Test Case,
atau Persetujuan QA yang tepat. Pengguna utama adalah QA member. Slice ini tidak mengubah aturan
otorisasi, data evidence, atau schema/migration.

## 2. Requirement dan Acceptance Criteria

- Bug `resolved` tampil di `qa_retest_work` hanya bila QA actor adalah assignee QA Subtask asal,
  Resolution Event terbaru ada, dan belum ada Retest Attempt final untuk event tersebut.
- `qa_sign_off` hanya dibentuk dari Test Cycle aktif milik actor dan QA Subtask terkait.
- Backend memberi setiap item state `actionable`, `blocked`, atau `read_only`.
- Sign-off actionable memakai completion gate persisted yang sama dengan mutasi sign-off; blocker
  tetap terlihat sebagai konteks, tanpa CTA yang mengklaim tindakan dapat dijalankan.
- Kartu Bug memfokuskan Bug yang sama; kartu QA test dan sign-off memfokuskan area Test Case atau
  Sertifikasi QA pada workspace drawer.

## 3. Alur Lintas Peran

Developer menyelesaikan Bug melalui Resolution Event. QA assignee asal menerima satu kartu retest
yang dapat ditindak; QA lain tidak melihatnya. QA menjalankan retest dan Result tetap menentukan
outcome Bug seperti workflow S1. Untuk sertifikasi, QA hanya melihat siklus yang dimilikinya:
Subtask yang belum selesai atau evidence yang belum lengkap ditandai blocker; setelah gate lulus,
QA dapat mencatat sign-off. Sign-off yang sudah disetujui tetap tersedia sebagai konteks baca-saja.

## 4. Data dan Relasi

Slice hanya membaca data persisted: `bugs`, `bug_resolution_events`, `bug_retest_attempts`,
`test_runs`, `qa_test_cycles`, `tasks`, `qa_sign_offs`, dan evidence completion gate. Tidak ada
kolom, backfill, atau migration baru. Risiko runtime adalah perubahan state setelah antrean dibaca;
mutasi akhir tetap diverifikasi service dalam transaksi dan gagal secara tertutup bila capability
sudah berubah.

## 5. API dan Shared Contract

`GET /workspaces/:workspaceId/my-work-queue` mengembalikan `workState` pada setiap
`WorkQueueItem`: `actionable`, `blocked`, atau `read_only`. `nextAction.code = view_context`
menyatakan bahwa item hanya membuka konteks, bukan command mutasi. Kontrak ada pada
`packages/contracts/src/workQueue.ts`; endpoint Bug retest yang sudah ada menjadi sumber scope
kanonik bagi bucket ringkas.

## 6. Authorization

Membership aktif tetap wajib. Backend `BugService` dan `ReleaseDecisionService` tetap memutuskan
siapa boleh membuat Run/Attempt atau sign-off. State UI bukan grant otorisasi (`AUTH-009`): kartu
blocked dan read-only hanya menerangkan capability persisted kepada member yang memang dapat
membaca Workspace.

## 7. UI dan Interaction States

`RoleAwareWorkQueuePanel` memakai Card, Badge, Button, SearchInput, Select, Tabs, Alert, Skeleton,
dan EmptyState yang sudah ada. Badge state membuat perbedaan **Siap ditindak**, **Ada prasyarat**,
dan **Informasi** terbaca tanpa jargon API. Tombol untuk blocker/read-only berbunyi **Lihat
prasyarat** atau **Lihat konteks**.

`MyTasksDashboard`, `BugExperiencePanel`, `MyTaskDetailWorkspaceDrawer`, `QaTestingDesk`, dan
`ReleaseAssurancePanel` mempertahankan pencarian/filter antrean serta focus return drawer. Fokus
keyboard berpindah ke Card Bug terpilih, area Test Case, atau Sertifikasi QA. Loading, empty,
error/retry, disabled, dan permission-denied yang sudah ada tetap dipakai; layout memakai Card
satu kolom pada mobile dan susunan existing pada desktop.

## 8. Pengujian dan Evidence

- Contract suite memvalidasi perluasan item antrean.
- PostgreSQL integration membuat satu Bug `resolved` tanpa scope dan satu Bug contextual milik QA;
  yang pertama tidak muncul, yang kedua muncul. Test juga membuktikan Sign-off blocked hanya berasal
  dari Test Cycle/QA Subtask actor.
- Component tests memverifikasi label blocker, direct focus Card Bug, deep-link workspace, dan
  regresi QA Desk/Release Assurance.
- Perintah dan hasil aktual dicatat pada
  [laporan implementasi S2](../reports/QA_E2E_S2_CAPABILITY_SCOPED_QUEUE_2026-09-16.md).

## 9. Release dan Readiness

Perubahan belum dideploy ke Production. Tidak ada migration untuk rollout atau rollback. Jika
capability berubah di antara pemuatan antrean dan klik pengguna, service mutasi memberikan error
persisted yang aman; UI kemudian dapat dimuat ulang. Browser E2E terautentikasi dan rollout
Production tetap follow-up.

## 10. Traceability

[Workflow QA](../2_WORKFLOW_AND_ROLES.md) →
[rencana remediasi UX](../plans/QA_E2E_WORKFLOW_UX_REMEDIATION_PLAN.md) →
`QA-E2E-S2-CAPABILITY-SCOPED-QUEUE-DEEP-LINK` di [TODO](../../TODO.md) →
`workQueue.ts` → WorkQueue/Bug/Release services → My Tasks atomic organisms →
contract/PostgreSQL/component evidence → laporan implementasi.
