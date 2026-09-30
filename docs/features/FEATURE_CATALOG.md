# Feature Catalog

**Status:** Active navigation index
**Last reviewed:** 2026-09-30
**Scope:** seluruh 33 Feature Card saat ini; bukan backlog, roadmap, atau source of truth policy.

Gunakan katalog ini untuk menemukan Feature, lalu buka kartu sumbernya. Label area dan pembaca
utama membantu navigasi saja; hak akses dan urutan kerja tetap mengikuti
[Workflow and Roles](../2_WORKFLOW_AND_ROLES.md).

## Cara memakai katalog

1. Pilih area produk yang paling dekat dengan kebutuhan Anda.
2. Buka tautan Feature untuk scope, acceptance criteria, contract, dan evidence aslinya.
3. Gunakan [Role Flows](ROLE_FLOWS.md) bila Anda ingin mulai dari tanggung jawab role, bukan area
   produk.

## Status ringkas

- **Active** berarti kartu aktif, bukan otomatis berarti semua bagiannya sudah Production.
- **Development/test** berarti kartu secara eksplisit menyatakan belum Production.
- **Rollout pending / implementation ongoing** berarti status khusus dari kartu sumber.
- **Draft** berarti belum menjadi acuan implementasi aktif.

## 1. Planning, Delivery, dan Task Hub

| Feature                                                                                       | Pembaca utama              | Tujuan singkat                                              | Status                                                  |
| --------------------------------------------------------------------------------------------- | -------------------------- | ----------------------------------------------------------- | ------------------------------------------------------- |
| [Requirement Context Ownership](REQUIREMENT_CONTEXT_OWNERSHIP.md)                             | PO, Developer, QA          | Menjaga konteks Requirement dan ownership planning.         | Active                                                  |
| [Requirement-Guided Subtask Planning](REQUIREMENT_GUIDED_SUBTASK_PLANNING.md)                 | PO, Developer              | Membuat Subtask dari Requirement dan Acceptance Criteria.   | Active                                                  |
| [Guarded Mistaken Requirement Deletion](GUARDED_MISTAKEN_REQUIREMENT_DELETION.md)             | PO, Owner/Admin            | Mengamankan penghapusan Requirement yang salah dibuat.      | Active                                                  |
| [My Tasks Created by Me](MY_TASKS_CREATED_BY_ME.md)                                           | PO, Developer, QA          | Menampilkan pekerjaan yang dibuat pengguna.                 | Active                                                  |
| [SDLC Quality and Release](SDLC_QUALITY_AND_RELEASE.md)                                       | PO, QA, Owner/Admin        | Menghubungkan kualitas delivery dengan readiness rilis.     | Active — sebagian Production; sebagian development/test |
| [Subtask Schedule Persistence and Late State](SUBTASK_SCHEDULE_PERSISTENCE_AND_LATE_STATE.md) | PO, Developer, QA          | Menyimpan jadwal Subtask dan status terlambat dari backend. | Active                                                  |
| [Task Hub Date and Timeline Accuracy](TASK_HUB_DATE_TIMELINE_ACCURACY.md)                     | PO, Developer, QA          | Menjaga akurasi tanggal dan timeline Task Hub.              | Active                                                  |
| [Task and Subtask Schedule Date Pair](TASK_SCHEDULE_DATE_PAIR.md)                             | PO, Developer, QA          | Menetapkan pasangan tanggal mulai dan tenggat.              | Active                                                  |
| [Workload Conflict and Team Timeline](WORKLOAD_CONFLICT_AND_TEAM_TIMELINE.md)                 | Owner/Admin, PO, Developer | Menampilkan konflik beban kerja dan timeline tim.           | Active                                                  |

## 2. QA, Evidence, Bug, dan Release Readiness

| Feature                                                                               | Pembaca utama     | Tujuan singkat                                   | Status                                             |
| ------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------ | -------------------------------------------------- |
| [QA Assurance Workspace Rollout Controls](QA_ASSURANCE_WORKSPACE_ROLLOUT_CONTROLS.md) | Owner/Admin, QA   | Kontrol rollout QA Workspace.                    | Active — backend lokal; rollout Production pending |
| [QA Assurance Workspace Rollout UI](QA_ASSURANCE_WORKSPACE_ROLLOUT_UI.md)             | QA, PO            | UI rollout QA Workspace.                         | Active — implementation ongoing                    |
| [QA Browser E2E and UAT](QA_BROWSER_E2E_UAT.md)                                       | QA, Developer     | Browser E2E dan UAT terautentikasi.              | Active — development/test, belum Production        |
| [QA Capability-Scoped Queue](QA_CAPABILITY_SCOPED_QUEUE.md)                           | QA, PO            | Antrean QA berdasarkan capability dan deep link. | Active — development/test, belum Production        |
| [QA Contextual Multi-Cycle Retest](QA_CONTEXTUAL_MULTI_CYCLE_RETEST.md)               | QA, Developer     | Retest Bug lintas beberapa siklus.               | Active — development/test, belum Production        |
| [QA E2E Lifecycle Alignment](QA_E2E_LIFECYCLE_ALIGNMENT.md)                           | QA, PO, Developer | Menyelaraskan lifecycle QA end-to-end.           | Active                                             |
| [QA Language and Append-only History](QA_LANGUAGE_AND_APPEND_ONLY_HISTORY.md)         | QA, Developer, PO | Bahasa QA dan histori Bug/retest append-only.    | Active — development/test, belum Production        |
| [QA Nonfinancial QRIS Sandbox](QA_NONFINANCIAL_QRIS_SANDBOX.md)                       | QA, Developer     | Sandbox QA QRIS nonfinansial.                    | Active                                             |
| [QA Prevalidated Completion and Sign-off](QA_PREVALIDATED_COMPLETION_SIGNOFF.md)      | QA, PO            | Validasi penyelesaian dan QA sign-off.           | Active — development/test, belum Production        |
| [QA Progressive Disclosure](QA_PROGRESSIVE_DISCLOSURE.md)                             | QA                | Menyederhanakan informasi QA secara bertahap.    | Active — development/test, belum Production        |
| [QA Test Case Quick Authoring](QA_TEST_CASE_QUICK_AUTHORING.md)                       | QA                | Penulisan Test Case cepat dan edge case.         | Active                                             |
| [QA UI/UX Simplification](QA_UI_UX_SIMPLIFICATION.md)                                 | QA, PO            | Penyederhanaan antarmuka QA.                     | Active                                             |
| [QA Workflow Summary](QA_WORKFLOW_SUMMARY.md)                                         | QA, PO            | Ringkasan workflow QA.                           | Active — development/test, belum Production        |
| [QA XLSX Import Mapping Recovery](QA_XLSX_IMPORT_MAPPING_RECOVERY.md)                 | QA, PO            | Pemulihan mapping impor XLSX Test Case.          | Draft                                              |

## 3. Workspace, Membership, dan Collaboration

| Feature                                                               | Pembaca utama   | Tujuan singkat                                  | Status |
| --------------------------------------------------------------------- | --------------- | ----------------------------------------------- | ------ |
| [Discussion Author-Only Mutation](DISCUSSION_AUTHOR_ONLY_MUTATION.md) | Semua role      | Membatasi perubahan Discussion pada penulisnya. | Active |
| [Multi-Workspace Member Access](MULTI_WORKSPACE_MEMBER_ACCESS_UX.md)  | Owner/Admin, PO | Akses anggota pada banyak Workspace.            | Active |
| [Workspace Permanent Deletion](WORKSPACE_PERMANENT_DELETION.md)       | Owner/Admin     | Penghapusan permanen Workspace dengan guard.    | Active |

## 4. Security dan Reliability

| Feature                                                                                         | Pembaca utama          | Tujuan singkat                                          | Status |
| ----------------------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------- | ------ |
| [Mobile Web Push Reliability](MOBILE_WEB_PUSH_RELIABILITY.md)                                   | Owner/Admin, Developer | Keandalan push notification web mobile.                 | Active |
| [Rate-limit User Feedback](RATE_LIMIT_USER_FEEDBACK.md)                                         | Developer, QA          | Umpan balik yang dapat ditindaklanjuti saat rate limit. | Active |
| [SEC-05 One-Time Token URL Hardening](SEC_05_ONE_TIME_TOKEN_URL_HARDENING.md)                   | Developer, Owner/Admin | Hardening URL token sekali pakai.                       | Active |
| [SEC-06 Credential Reset and Session Revocation](SEC_06_CREDENTIAL_RESET_SESSION_REVOCATION.md) | Owner/Admin, Developer | Reset kredensial dan pencabutan sesi.                   | Active |
| [SEC-07 Credential Security Audit](SEC_07_CREDENTIAL_SECURITY_AUDIT.md)                         | Owner/Admin, Developer | Audit keamanan kredensial.                              | Active |
| [SEC-08 PostgreSQL Rate Limit](SEC_08_POSTGRESQL_RATE_LIMIT.md)                                 | Developer, QA          | Rate limit PostgreSQL untuk link preview.               | Active |

## 5. AI Assistance

| Feature                                               | Pembaca utama | Tujuan singkat                                | Status |
| ----------------------------------------------------- | ------------- | --------------------------------------------- | ------ |
| [AI Task Generator Modal](AI_TASK_GENERATOR_MODAL.md) | PO, Developer | Membantu membuat Feature dan Task melalui AI. | Active |

## Format Feature ke depan

Feature lintas-role baru memakai [folder template](_template/README.md): satu `README.md` dengan
diagram dan navigasi, ditambah dokumen `roles/`, contract, authorization, dan testing. Kartu
legacy di atas tidak dipindahkan oleh katalog ini; migrasi per kartu memerlukan approval terpisah.
