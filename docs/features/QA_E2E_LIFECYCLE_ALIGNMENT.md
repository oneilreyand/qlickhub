# QA-E2E-01 — QA Lifecycle Alignment

**Status:** Active
**Owner:** Product and Engineering
**Last reviewed:** 2026-09-10
**Applicable Policy IDs:** `DOMAIN-002`, `AUTH-002`, `FLOW-001`, `FLOW-002`, `QA-001`, `QA-004`, `RELEASE-002`, `UI-001`, `UI-002`, `TEST-001`, `DOC-002`, `DOC-004`

## 1. Tujuan dan Pengguna

Menyelaraskan aksi QA Subtask antara UI, backend policy, dan workflow kanonikal. QA assignee harus
dapat memulai, menyelesaikan, dan membuka ulang pekerjaan pengujian tanpa self-review. Slice ini
tidak menambah Feature-scoped Test Run, formal Bug retest attempt, atau metrik rework.

## 2. Requirement dan Acceptance Criteria

- Root Feature tetap kontainer lintas peran; Planner menugaskan QA melalui Subtask `deliveryArea: qa`.
- QA assignee dapat menjalankan `todo → in_progress → done`.
- QA assignee tidak dapat menjalankan `in_progress → in_review` pada QA Subtask baru.
- `done → in_progress` ditolak tanpa alasan dan diterima dengan alasan non-kosong.
- QA Subtask legacy pada `in_review` dapat dipulihkan ke `in_progress` atau `done` oleh assignee.
- QA lain tidak dapat mengambil alih QA Subtask yang ditugaskan kepada anggota berbeda.
- Planner dapat mengembalikan Test Case `in_review → draft`.
- UI tidak menampilkan “Submit for Review” untuk QA Subtask dan menjelaskan bahwa completion bukan
  QA Sign-off atau keputusan rilis.

## 3. Alur Lintas Peran

Planner membuat root Feature dan Subtask QA, lalu menetapkan QA assignee. QA memulai dan
menyelesaikan Subtask tersebut. QA Sign-off tetap dicatat melalui release assurance setelah bukti
yang relevan tersedia, dan PO tetap menjadi pemilik keputusan rilis. Review independen pada status
`in_review` berlaku untuk Subtask Development, bukan QA self-review.

## 4. Data dan Relasi

Slice ini menggunakan Task, TaskActivity, TestCase, dan relasi yang sudah ada. Tidak ada schema atau
migrasi. Alasan reopen dikirim melalui `reviewNotes` dan direkam oleh jalur activity status Task yang
sudah ada. Risiko utama adalah record QA Subtask legacy pada `in_review`; transisi recovery menjaga
record tersebut dapat dilanjutkan tanpa data rewrite.

## 5. API dan Shared Contract

Endpoint Task update dan Test Case update tetap sama. Tidak ada perubahan request/response pada
`packages/contracts`. Backend policy mengubah transition authorization dan error behavior saja.

## 6. Authorization

Backend memverifikasi Workspace role, QA delivery area, dan kecocokan assignee. Di antara anggota
ber-role QA, hanya assignee yang dapat menjalankan atau membuka ulang QA Subtask. Planner tetap
memiliki management rights.
QA reviewer tetap dapat menerima atau meminta perubahan pada Subtask Development yang berada pada
`in_review`.

## 7. UI dan Interaction States

`QaTestingDesk` memakai Button dan Card yang sudah tersedia. Status `in_progress` menawarkan Log
Defect dan Complete QA Execution; status `done` menawarkan reopen; status legacy `in_review`
menawarkan recovery. Loading dan error mutation tetap memakai state dan Snackbar yang ada.

## 8. Pengujian dan Evidence

Unit policy membuktikan transition map dan authorization. Frontend interaction test membuktikan
payload status dan label UI. PostgreSQL Task API integration test membuktikan lifecycle persisten dan
Task activity bila cakupan fixture mendukung. Dokumentasi divalidasi dengan `npm run docs:check`;
hasil aktual dicatat pada report setelah dijalankan.

## 9. Release dan Readiness

Tidak ada deployment atau keputusan release pada slice ini. QA Subtask `done` tidak menggantikan QA
Sign-off. Evidence-gated completion ditunda sampai Test Run memiliki `featureTaskId` dan
`qaSubtaskId` yang eksplisit agar readiness tidak mencampur eksekusi antar-Feature.

## 10. Traceability

Accepted QA lifecycle decision → Workflow §4 → `QA-004` → Task/Test Case policies → QA Testing Desk → policy/UI/
PostgreSQL tests → implementation report. Slice berikutnya melanjutkan ke Feature-scoped Test Run,
kemudian formal Bug retest dan metrik handback.
