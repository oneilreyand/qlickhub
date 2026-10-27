# SIMPLE-UI-DELIVERY-FLOW — Data, API, and Shared Contracts

**Applicable Policy IDs:** DOC-005, CONTRACT-001, DATA-001, AI-001, AI-013, RELEASE-001, RELEASE-002

Semua perubahan data bersifat aditif: tabel atau kolom baru, tanpa menghapus atau mengubah arti kolom
lama, sehingga deployment lama tetap kompatibel (`docs/DEPLOYMENT_AND_ENVIRONMENTS.md` §8). Satu file
migrasi per slice. Bentuk field final ditulis di `packages/contracts/src`, bukan disalin di sini.

## Data and relations

Dipakai ulang tanpa perubahan: `tasks` (root Feature + subtask), `requirements`,
`acceptance_criteria`, `task_requirements`, `qa_documents` (Product Brief berversi), `test_cases`,
`test_case_versions`, `test_case_version_acceptance_criteria`, `test_runs`, `test_results`,
`test_result_evidence`/`_links`/`_manifests`, `bugs`, `task_comments`, `task_activity`,
`qa_sign_offs`, `release_decisions`.

| Slice | Perubahan                                                                                                                                                                                                     | Kepemilikan Workspace                 | Audit                             | Risiko migrasi                                                                                       | Jalur tulis / baca                                          |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| 3     | Kolom `test_results.step_results` (jsonb: urutan langkah → status)                                                                                                                                            | Mengikuti `test_results.workspace_id` | Activity Test Case yang ada       | Rendah                                                                                               | Tulis saat simpan hasil; baca di riwayat run                |
| 3     | Kolom `test_runs.browser`, `test_runs.device` (string, nullable) di samping `environment` dan `build` yang ada                                                                                                | Mengikuti `test_runs`                 | —                                 | Rendah                                                                                               | Tulis saat membuat run                                      |
| 4     | Kolom `task_comments.handoff_kind` (nullable: `review_feedback`, `question`, `ready_for_qa`, `fix_ready`, `answer`)                                                                                           | Mengikuti `task_comments`             | `task_activity` yang ada          | Rendah                                                                                               | Tulis saat aksi serah-terima; baca oleh antrean dan riwayat |
| 5a    | Tabel `feature_plans`: id, workspace, `feature_task_id` (root Feature, dibuat saat Plan dimulai), teks ide, status (`clarifying`/`ready`/`applied`), pembuat, waktu                                           | `workspace_id` wajib                  | `task_activity` pada root Feature | Sedang                                                                                               | Tulis oleh planner; baca oleh semua anggota                 |
| 5a    | Tabel `feature_plan_questions`: plan, urutan, teks, alasan, `required`, pilihan (jsonb), jawaban, penjawab, waktu, model AI, sitasi                                                                           | Melalui plan                          | Ikut audit plan                   | Rendah                                                                                               | Tulis oleh AI (lewat service) dan planner                   |
| 5a    | Tabel `feature_drafts`: plan, `version` (int, kunci optimistik), draft (jsonb, bentuk `GeneratedTaskDraftSchema`), fingerprint unik, pengubah, waktu                                                          | Melalui plan                          | Ikut audit plan                   | Sedang: jsonb divalidasi ulang dengan skema yang sama saat Apply                                     | Tulis oleh planner/AI; Apply membaca versi tertentu         |
| 5a    | Kolom `tasks.stage` **tidak** ditambahkan; tahap dihitung dari `feature_plans.status` + status task                                                                                                           | —                                     | —                                 | —                                                                                                    | Read model                                                  |
| 7     | Tabel `releases`: feature, `release_decision_id`, PR, commit, deploy ID, URL, migrasi, target rollback, status (`deployed`/`verifying`/`accepted`/`monitoring`/`closed`/`rolled_back`), awal/akhir pemantauan | `workspace_id` wajib                  | `task_activity` pada Feature      | Sedang                                                                                               | Tulis oleh PO/QA sesuai aksi; baca oleh anggota             |
| 7     | Tabel `release_checks`: rilis, jenis (`technical`/`smoke`), kode cek, `test_run_id` (nullable), hasil, pemeriksa, waktu                                                                                       | Melalui rilis                         | Ikut rilis                        | Rendah                                                                                               | Tulis oleh QA                                               |
| 7     | Tabel `release_acceptances`: rilis, penerima, hasil (`accepted`/`not_accepted`), catatan, waktu                                                                                                               | Melalui rilis                         | Ikut rilis                        | Rendah                                                                                               | Tulis oleh PO                                               |
| 7     | Kolom `test_cases.is_smoke` (boolean, default false)                                                                                                                                                          | Mengikuti `test_cases`                | Activity Test Case                | Rendah                                                                                               | Tulis oleh QA                                               |
| 8     | Kolom `bugs.release_id` (nullable FK) dan `bugs.source` (`qa`/`user`/`support`, default `qa`)                                                                                                                 | Mengikuti `bugs`                      | `bug_activities` yang ada         | Sedang: query readiness `unverified_bugs` (RELEASE-001) wajib diuji tidak berubah untuk Feature lain | Tulis oleh QA saat mencatat laporan                         |

## API and executable contract

Endpoint yang ada dan dipakai ulang (sumber kontrak di `packages/contracts/src`):

| Kebutuhan                            | Endpoint yang ada                                                                                                      | Kontrak                                |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Detail, subtask, komentar, aktivitas | `/workspaces/:workspaceId/tasks/:taskId`, `…/subtasks`, `…/comments`, `…/activity`                                     | `task.ts`, `comment.ts`, `activity.ts` |
| Test Case, versi, pemetaan AC        | `/workspaces/:workspaceId/test-cases…`, `…/versions/:testCaseVersionId/acceptance-criteria`                            | `testManagement.ts`                    |
| Run, hasil, bukti                    | `…/test-cases/:testCaseId/runs`, `…/runs/:testRunId/results`, `…/evidence-links`                                       | `testManagement.ts`                    |
| Bug                                  | `/workspaces/:workspaceId/bugs…`                                                                                       | `bug.ts`                               |
| Sign-off, keputusan rilis            | `/workspaces/:workspaceId/features/:featureTaskId/qa-sign-offs`, `…/release-decisions`, `…/release-records`            | `releaseDecision.ts`                   |
| Antrean                              | `/workspaces/:workspaceId/my-work-queue`                                                                               | `workQueue.ts`                         |
| AI                                   | `/workspaces/:workspaceId/ai/generate-task-draft`, `…/chat-refinement`, `…/synthesize-from-chat`, `…/apply-task-draft` | `aiTaskGenerator.ts`                   |

Perubahan kontrak per slice (aditif; field baru opsional bagi klien lama):

| Slice | Perubahan                                                                                                                                                                                                                   | Kontrak                                                                                                                                     |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 3     | `step_results`, `browser`, `device` opsional pada input/response run dan hasil                                                                                                                                              | `testManagement.ts`                                                                                                                         |
| 4     | `handoffKind` opsional pada komentar; item antrean menambah `sender` dan `lastMessage` opsional dan bucket `waiting_on_others` per peran                                                                                    | `comment.ts`, `workQueue.ts`                                                                                                                |
| 4     | `GET /workspaces/:workspaceId/features/:featureTaskId/handoffs` (paginasi, terbaru di atas)                                                                                                                                 | `workQueue.ts` atau `activity.ts`                                                                                                           |
| 5a    | `POST/GET /workspaces/:workspaceId/feature-plans`, `…/:planId/questions` (AI), `PATCH …/questions/:questionId` (jawaban), `PUT …/:planId/draft` (dengan `version`), `POST …/:planId/apply` (dengan `version` + fingerprint) | Kontrak baru `featurePlan.ts`; `GeneratedTaskClarificationSchema` v2 (objek pertanyaan) berdampingan dengan v1 sampai modal AI lama dihapus |
| 7     | `POST/GET /workspaces/:workspaceId/features/:featureTaskId/releases`, `POST …/releases/:releaseId/checks`, `POST …/releases/:releaseId/acceptance`                                                                          | Kontrak baru `release.ts`                                                                                                                   |
| 7     | `isSmoke` opsional pada Test Case                                                                                                                                                                                           | `testManagement.ts`                                                                                                                         |
| 8     | `releaseId`, `source` opsional pada pembuatan bug; `POST …/releases/:releaseId/close` dengan validasi syarat tutup di backend                                                                                               | `bug.ts`, `release.ts`                                                                                                                      |

`applyDraft` yang ada tetap menjadi satu-satunya jalur penulisan PRD + subtask; slice 5a mengubah
sumber inputnya dari body request menjadi `feature_drafts` versi tertentu, di dalam transaksi yang sama.

## Boundary notes

- **Frontend:** shell (`AppLayout`, `Sidebar`, `Header`), detail Feature (`TaskDetailDrawer` dan tab
  `taskDetail/*` dipecah ke halaman), Tugas Saya (`DevWorkingDesk`, `QaTestingDesk`,
  `PoTeamICardGrid`, `RoleAwareWorkQueuePanel` diganti di balik flag per peran), halaman Test Case,
  halaman rilis. Route lama dialihkan (AC-2.3).
- **Backend:** modul `testManagement`, `workQueue`, `tasks` (komentar), `ai`, modul baru
  `featurePlans` dan `releases`, `bugs`.
- **QA:** alur desk QA yang ada (`qa-desk-flow-integration.spec.ts`, `qa-role-isolation.spec.ts`) tetap
  dijalankan sebagai regresi sampai halaman pengganti lulus E4.
- **Tidak terdampak:** autentikasi, `workspaces`/membership, folder, laporan kapasitas, leader hub,
  QRIS sandbox, notifikasi push (dipakai, tidak diubah), konfigurasi deploy Vercel.
