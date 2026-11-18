# QLICKHUB-PRODUCT-MCP — Data, API, Shared Contracts

**Status:** Draft
**Applicable Policy IDs:** DOC-005, CONTRACT-001, DATA-001, DATA-002, DATA-006, DOMAIN-002, DOMAIN-003, DOMAIN-004, AUTH-011, FLOW-007, AI-013

## Implementasi yang dapat dipakai ulang

Kontrak kanonis: [featureSpec.ts](../../../packages/contracts/src/featureSpec.ts).
Service: [featureSpecService.ts](../../../apps/api/src/modules/featureSpecs/featureSpecService.ts).
Policy: [featureSpecPolicy.ts](../../../apps/api/src/policies/featureSpecPolicy.ts).
REST sekarang memakai /v1/workspaces/:workspaceId/feature-specs serta save section dan Apply.
Lihat [kontrak Feature sumber](../SIMPLE-UI-DELIVERY-FLOW/contracts.md).

Create saat ini langsung membuat root Task + Spec; preview v1 tidak boleh memanggil create.
Optimistic version melindungi revisi Spec tersimpan. Publish baru belum memiliki versi server:
gunakan digest payload + idempotency key; jangan mengklaim version check berlaku pada record
yang belum ada. Apply saat ini hanya idempoten untuk Spec yang sama.

## Katalog tool usulan v1–v3

Nama/skema masih usulan; kontrak executable ditempatkan di packages/contracts saat Build. Setiap tool
memanggil service/policy yang sama dengan REST; tool tidak membuat aturan bisnis paralel. Path
endpoint relatif terhadap `/v1/workspaces/:workspaceId` kecuali diawali `/v1`. Baseline pemetaan:
`origin/main` @ `e710d525`.

### Bersama (semua role)

| Tool                                    | Sifat | Rilis | Endpoint / service                                                         |
| --------------------------------------- | ----- | ----- | -------------------------------------------------------------------------- |
| get_my_profile                          | Read  | v1    | Identitas dari credential tervalidasi; bukan userId dari agent             |
| list_my_workspaces                      | Read  | v1    | Workspace dari membership aktif                                            |
| get_my_work_queue                       | Read  | v2    | `GET /my-work-queue` (role planner/developer/qa)                           |
| get_my_work_report                      | Read  | v2    | `GET /v1/me/work-report` (lintas Workspace, milik user sendiri)            |
| get_feature, list_subtasks, get_subtask | Read  | v2    | `GET /tasks/:taskId`, `GET /tasks/:taskId/subtasks` + ADR-043              |
| get_task_activity, list_task_relations  | Read  | v2    | `GET /tasks/:taskId/activity`, `/relations` (requireTaskReadAccess)        |
| get_requirements_with_ac                | Read  | v2    | `GET /tasks/:taskId/requirements`, `/requirements/:id/acceptance-criteria` |
| list_comments                           | Read  | v2    | `GET /tasks/:taskId/comments`                                              |
| add_comment                             | Write | v3    | `POST /tasks/:taskId/comments`                                             |
| list_blockers                           | Read  | v2    | `GET /tasks/:taskId/blockers` (ADR-045)                                    |
| open_blocker, resolve_blocker           | Write | v3    | `POST /tasks/:taskId/blockers`, `/blockers/:id/resolve`                    |

### Owner / Admin / PO (Planner)

| Tool                              | Sifat       | Rilis | Endpoint / service                                                               |
| --------------------------------- | ----------- | ----- | -------------------------------------------------------------------------------- |
| list_feature_folders              | Read        | v1    | Folder valid pada Workspace yang diizinkan                                       |
| get_feature_spec                  | Read        | v1    | `GET /feature-specs/:specId`                                                     |
| find_available_assignees          | Read        | v1    | Spesialisasi member (`developerSupportsDeliveryArea`) + `GET /capacity/timeline` |
| check_assignment_conflict         | Read        | v1    | `POST /capacity/assignment-preview` (FLOW-007, redaksi AUTH-011)                 |
| preview_groomed_feature           | Read domain | v1    | Validasi field wajib + cek bentrok tiap subtask `assigned`; tanpa write domain   |
| publish_feature                   | Write       | v1    | Payload final + Workspace/Folder + key → receipt dan link Feature                |
| release_subtask, reassign_subtask | Write       | v3    | `POST /tasks/:taskId/release`, `/reassign` (ADR-038)                             |

### Developer

| Tool                    | Sifat | Rilis | Endpoint / service                                                                                     |
| ----------------------- | ----- | ----- | ------------------------------------------------------------------------------------------------------ |
| get_developer_readiness | Read  | v2    | `GET /tasks/:taskId/developer-readiness`                                                               |
| claim_subtask           | Write | v3    | `POST /tasks/:taskId/claim` (spesialisasi cocok, 409 bila sudah di-claim)                              |
| update_subtask_status   | Write | v3    | `PATCH /tasks/:taskId/status`; transisi Dev: todo→in_progress→in_review, changes_requested→in_progress |
| mark_acceptance_check   | Write | v3    | `PUT /tasks/:taskId/acceptance-checks/:criterionId` (hanya penanggung jawab subtask)                   |
| submit_readiness_review | Write | v3    | `POST /features/:featureTaskId/readiness/reviews`                                                      |
| record_bug_resolution   | Write | v3    | `POST /bugs/:bugId/resolution-events` (Bug yang di-assign ke Developer)                                |
| add_bug_evidence_link   | Write | v3    | `POST /bugs/:bugId/evidence-links`                                                                     |
| report_own_bug          | Write | —     | **Butuh backend baru.** Create Bug saat ini Owner/Admin/QA; mengikuti BUG-INTAKE-SLA                   |

### QA

| Tool                                           | Sifat | Rilis | Endpoint / service                                           |
| ---------------------------------------------- | ----- | ----- | ------------------------------------------------------------ |
| get_qa_workflow_summary                        | Read  | v2    | `GET /tasks/:taskId/qa-workflow-summary`                     |
| list_test_cases, get_test_case, list_test_runs | Read  | v2    | `GET /test-cases`, `/test-cases/:id`, `/test-cases/:id/runs` |
| create_test_case                               | Write | v3    | `POST /test-cases`                                           |
| start_test_run, record_test_result             | Write | v3    | `POST /test-cases/:id/runs`, `/runs/:runId/results`          |
| add_test_evidence_link                         | Write | v3    | `POST /test-cases/:id/runs/:runId/evidence-links`            |
| update_subtask_status                          | Write | v3    | `PATCH /tasks/:taskId/status` (aturan QA executor/reviewer)  |
| create_bug, record_retest, reopen_bug          | Write | v3    | `POST /bugs`, `/bugs/:id/retest-runs`, `/bugs/:id/reopen`    |
| submit_readiness_review                        | Write | v3    | `POST /features/:featureTaskId/readiness/reviews`            |

### Leader (Owner / Admin)

| Tool                                                       | Sifat | Rilis | Endpoint / service                                           |
| ---------------------------------------------------------- | ----- | ----- | ------------------------------------------------------------ |
| get_leader_pipeline                                        | Read  | v2    | `GET /v1/leader/pipeline` (termasuk beban poin vs kapasitas) |
| get_leader_timeline, get_leader_quality, get_leader_digest | Read  | v2    | `GET /v1/leader/timeline`, `/quality`, `/digest`             |

### Tidak pernah lewat MCP (K6)

QA sign-off dan pembatalannya, keputusan rilis, governance decision dan status finding, baseline
readiness, delete apa pun (task, test case, comment, relation, time off), pengelolaan anggota/role,
kapasitas orang lain, dan deployment. Endpoint tersebut tetap hanya di UI.

### Instruksi per role (K8)

Server menyediakan MCP prompts per role (misalnya grooming, kerjakan subtask, uji AC) sebagai satu
sumber instruksi untuk semua client. Isi prompt menautkan aturan SSoT, bukan menyalinnya.

## Persistensi, relasi, retry

Publish harus membungkus root, Spec/version, Brief, Requirement/AC, Subtask, link, activity, dan
receipt idempotensi dalam satu transaksi PostgreSQL. Reuse primitive service/policy; ORM hanya
di backend. Unique constraint menegakkan key + pemilik/scope yang dipilih; detail scope/retention
key diselesaikan pada G2. Concurrent retry dan failure setelah commit tetapi sebelum respons
harus dapat mengambil receipt yang sama.

OAuth grants/token metadata kemungkinan memerlukan persistence additive, tergantung provider.
FK user, pencabutan akses, expiry, hash/enkripsi secret, ownership, indexes, lifecycle delete, dan
cardinality harus ditentukan sebelum migration. Agent/client identity tidak boleh diambil dari
payload tanpa verifikasi. Tidak ada tabel Feature baru.

## Error dan operasi

401 token invalid; 403 tidak berwenang; 400 invalid dengan field paths; 409 key/payload konflik
atau versi stale pada resource tersimpan; 429 rate limit; failure sementara → error tersanitasi.
Pemetaan ke MCP result/error harus diuji dan tidak menyatakan mutasi sukses saat transaksi gagal.
Endpoint target: HTTPS Streamable HTTP /mcp; URL final belum ditetapkan.
