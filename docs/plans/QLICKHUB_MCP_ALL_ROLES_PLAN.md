# QLICKHUB-PRODUCT-MCP v2 — Rencana perluasan dokumen ke semua role (Opsi 1)

**Status:** Draft — rencana disetujui Owner di chat 2026-11-18 ("setuju", memakai semua rekomendasi
K1–K8, PR ditahan sampai Owner menyetujui). Dieksekusi di worktree `.worktrees/wt-mcp-roles`, branch
`claude/mcp-all-roles-docs`, yang dibuat oleh Owner. Hasil: [Feature](../features/QLICKHUB-PRODUCT-MCP/README.md),
[laporan](../reports/QLICKHUB_PRODUCT_MCP_ROLES_DOCS_2026-11-18.md).
**Disusun:** Claude, 2026-11-18 (Asia/Jakarta)
**Baseline inspeksi:** branch `codex/prd-mermaid-studio` @ `e9fe34c1`, read-only. Diperbarui sebagian
terhadap `origin/main` @ `e710d525` (2026-11-18). Working tree punya
perubahan `TODO.md` yang bukan dari Claude, jadi eksekusi memakai worktree terpisah dari `origin/main` terbaru.
**Jalur:** hanya perubahan dokumen. Tidak menyentuh `apps/`, `packages/`, `api/`, atau `database/`,
sehingga gate `SDLC-002` tidak terpicu. `docs:check` dan `docs:completeness` tetap wajib.
**Policies terkait:** `DOC-005`, `DOC-006`, `SDLC-001`, `AUTH-001`, `AUTH-002`, `AI-001`, `AI-006`,
`AI-007`, `AI-009`, `AI-013`, `CONTRACT-001`, `TEST-001`

---

## 1. Tujuan

Targetnya satu server MCP Qlick Hub yang bisa dipakai dari agent mana pun yang mendukung MCP remote:
Claude, Codex, Antigravity, OpenCode, Gemini CLI, dan lainnya. Setiap orang login dengan akunnya
sendiri. Hak akses mengikuti role membership Workspace, bukan nama agent.

Folder [QLICKHUB-PRODUCT-MCP](../features/QLICKHUB-PRODUCT-MCP/README.md) saat ini hanya merancang v1,
yaitu Owner/PO melakukan grooming lalu publish. Rencana ini memperluas dokumen Feature tersebut supaya
mencakup katalog tool, authorization, role path, phase, dan test plan untuk semua role.

Hasil akhirnya adalah dokumen **Draft** yang siap direview di gerbang G0–G3. Rencana ini bukan izin
Build, tidak mengaktifkan policy, dan tidak menyelesaikan keputusan OAuth atau hosting. Keputusan
OAuth dan hosting akan diambil lewat spike (Opsi 2).

## 2. Fakta terkonfirmasi (sumber primer)

| Area                                           | Fakta                                                                                                                                                                                                                                                                                                                               | Sumber                                                                                                                | Implikasi                                                                                                                                           |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope v1                                       | Dev tidak boleh publish. Tool kerja Dev disebut "scope lanjutan, belum dirancang". Update delivery Dev/QA ada di luar scope. Sign-off dan rilis lewat MCP juga di luar v1.                                                                                                                                                          | `roles/developer.md`, `problem.md`, `authorization.md`                                                                | Batas v1 dipertahankan. Perluasan ditulis sebagai tahap rilis berikutnya.                                                                           |
| Role Workspace                                 | `owner, admin, po, dev, qa`. Belum ada role `support`. `viewer` hanya ada di `UserRoleSchema`.                                                                                                                                                                                                                                      | `packages/contracts/src/workspace.ts` L3, `user.ts` L3                                                                | Support belum bisa dirancang sebagai role aktif.                                                                                                    |
| Antrean kerja                                  | `GET /workspaces/:id/my-work-queue` dengan role `planner/developer/qa`.                                                                                                                                                                                                                                                             | `workQueueRoutes.ts`, `contracts/src/workQueue.ts` L6                                                                 | Dasar tool "Tugas Saya" untuk semua role.                                                                                                           |
| Task/Subtask                                   | `claim`: dev, qa. `release` dan `reassign`: owner, admin, po. `PATCH status`: kelima role. `complete-qa-review`: qa. `PUT acceptance-checks`: owner, admin, dev. `POST comments`: semua member. `POST links`: owner, admin, po saja.                                                                                                | `apps/api/src/modules/tasks/taskRoutes.ts`                                                                            | Dev belum bisa menambah tautan (misalnya PR). Lihat K5.                                                                                             |
| Bug                                            | Create: owner, admin, qa. `resolution-events`: dev. `retest-*`: qa. `reopen`: owner, admin, qa. `evidence-links`: owner, admin, qa, dev.                                                                                                                                                                                            | `bugs/bugRoutes.ts`                                                                                                   | Dev mencatat bug sendiri belum ada di runtime.                                                                                                      |
| Test management                                | Create test case, run, result, evidence link, dan test cycle: qa. `developer-readiness`: baca. `qa-workflow-summary`: qa.                                                                                                                                                                                                           | `testManagement/testManagementRoutes.ts`                                                                              | QA memiliki jalur write lengkap yang bisa dipetakan ke tool.                                                                                        |
| Feature readiness                              | Review: dev, qa. Baseline: owner, admin, po. Governance decision: owner, admin.                                                                                                                                                                                                                                                     | `featureReadiness/featureReadinessRoutes.ts`                                                                          | Review readiness bisa jadi tool. Governance tetap di UI.                                                                                            |
| Rilis                                          | QA sign-off: qa. Release decision: owner, admin, po.                                                                                                                                                                                                                                                                                | `releaseDecisions/releaseDecisionRoutes.ts`                                                                           | Usulan: tidak pernah lewat MCP (K6).                                                                                                                |
| Leader                                         | `/leader/workspaces`, `timeline`, `quality`, `digest` untuk owner dan admin.                                                                                                                                                                                                                                                        | `leader/leaderRoutes.ts`, `contracts/src/leader.ts` L7                                                                | Tool Leader cukup read-only.                                                                                                                        |
| Feature Spec                                   | Create, section, Apply, dan generate: owner, admin, po.                                                                                                                                                                                                                                                                             | `featureSpecs/featureSpecRoutes.ts`                                                                                   | Sesuai v1.                                                                                                                                          |
| Lapisan cek role                               | `requireWorkspaceMember([...])` hanya lapisan pertama. Service bisa membatasi lebih jauh, misalnya per assignee atau per akses Feature.                                                                                                                                                                                             | Route files di atas, ADR-043 (akses baca Feature)                                                                     | Aturan service per tool harus dibaca saat menulis. Tidak boleh diasumsikan dari route.                                                              |
| AI governance                                  | AI tidak boleh memutasi data production tanpa Apply eksplisit dari user. Pilihan Owner untuk publish adalah konfirmasi di agent, yang butuh ADR/SSoT sebelum runtime.                                                                                                                                                               | `POLICY_REGISTRY.md` `AI-001`, `solution.md`                                                                          | Setiap tool write Dev/QA terkena aturan yang sama (K3).                                                                                             |
| Jejak agent                                    | Setiap write mencatat actor `user`/`agent`, id, dan channel, serta memakai optimistic version.                                                                                                                                                                                                                                      | ADR-036 §4                                                                                                            | Audit agent untuk role lain sudah punya fondasi.                                                                                                    |
| Program terkait                                | BUG-INTAKE-SLA: Dev boleh mencatat bug sendiri dengan triase QA (sudah diputuskan). Role `support` (D3) masih menunggu. Keduanya belum diimplementasi.                                                                                                                                                                              | `docs/plans/BUG_INTAKE_SLA_PROGRAM_PLAN.md`, keputusan terbuka 2026-11-16                                             | Tool bug Dev dan tool Support bergantung pada program tersebut.                                                                                     |
| Setup client                                   | `setup.md` baru mencakup Codex, Claude, dan Antigravity. Semuanya belum diuji.                                                                                                                                                                                                                                                      | `setup.md`                                                                                                            | OpenCode dan Gemini CLI belum disebut.                                                                                                              |
| Kapasitas & bentrok                            | `POST capacity/assignment-preview` (owner, admin, po) mengembalikan `hasConflict`, daftar bentrok, subtask aktif tanpa jadwal, dan pesan advisory. `GET capacity/timeline` (semua member) mendukung `scope=all` lintas Workspace.                                                                                                   | `capacity/capacityRoutes.ts`, `contracts/src/capacity.ts`                                                             | Agent bisa mengecek bentrok saat PO meng-assign Dev.                                                                                                |
| Aturan bentrok                                 | Deteksi bentrok bersifat advisory dan inklusif tanggal, hanya untuk subtask aktif, dan tidak pernah memblokir. Detail lintas Workspace diredaksi (jumlah dan rentang tanggal saja).                                                                                                                                                 | `FLOW-007`, `AUTH-011`                                                                                                | Agent memperingatkan, PO yang memutuskan. Agent tidak boleh membuka judul atau Workspace lain.                                                      |
| Kecocokan Dev                                  | Spesialisasi Dev per Workspace: `frontend`, `backend`, `mobile`, `fullstack`. `developerSupportsDeliveryArea` memeriksa kecocokan dengan area subtask.                                                                                                                                                                              | `contracts/src/workspace.ts` L29, `task.ts` L116                                                                      | Agent bisa menyaring Dev yang cocok dengan area subtask.                                                                                            |
| Data beban (update `origin/main` @ `e710d525`) | WORK-FOUNDATION sudah di-merge: effort Subtask XS–XL = 1/2/3/5/8 poin (ADR-044), kalender kerja Workspace, kapasitas mingguan per orang dalam poin + cuti (`/me/capacity`, `/me/time-off`, `/users/:userId/capacity`), blocker dengan PIC (ADR-045, `/:taskId/blockers`), dan beban tim poin vs kapasitas (LEADER-PIPELINE-HUB P3). | `packages/contracts/src/task.ts` L158–164, `capacity.ts` L184–205, `capacityRoutes.ts` L44–51, `taskRoutes.ts` L50–67 | Agent bisa menilai beban dalam poin dan memperhitungkan cuti, bukan hanya bentrok tanggal, untuk role yang berhak membacanya (lihat baris berikut). |
| Akses data beban                               | Kapasitas pribadi hanya dapat dibaca pemilik akun atau Owner/Admin Workspace yang sama. Beban poin vs kapasitas hanya di Leader (Owner/Admin). Timeline dan `assignment-preview` untuk PO tidak memuat poin atau cuti.                                                                                                              | `capacity/internal/personalCapacity.ts`, `leader/leaderPipeline.ts`, `capacityService.ts`                             | PO hanya mendapat bentrok tanggal dan spesialisasi. Melihat poin saat assign menjadi keputusan baru K9.                                             |
| Baseline                                       | Tabel ini awalnya disusun dari branch lokal `codex/prd-mermaid-studio` yang tertinggal 50 commit dari `origin/main`. Sebagian route sudah berubah, misalnya ada tambahan `requireTaskReadAccess`.                                                                                                                                   | `git log 94134da1..origin/main`                                                                                       | Langkah eksekusi 2 wajib memverifikasi ulang seluruh baris §2 terhadap `origin/main`.                                                               |

## 3. Lingkup

**Masuk:** pembaruan dokumen Feature QLICKHUB-PRODUCT-MCP, satu baris TODO, satu tautan di
`docs/plans/README.md`, dan laporan dokumentasi.

**Tidak masuk:** kode, migrasi, kontrak executable, menerima ADR atau mengubah policy aktif, memilih
OAuth atau hosting, spike transport, dan UAT client.

## 4. Draft isi yang akan ditulis: katalog tool per role

Semua nama tool masih usulan. Setiap tool dipetakan ke endpoint atau service yang sudah ada. Tool yang
butuh backend baru diberi tanda.

| Tool (usulan)                                                                        | Sifat        | Role                             | Endpoint/service yang ada                                                             | Rilis                |
| ------------------------------------------------------------------------------------ | ------------ | -------------------------------- | ------------------------------------------------------------------------------------- | -------------------- |
| `get_my_profile`, `list_my_workspaces`                                               | Read         | Semua                            | v1                                                                                    | v1                   |
| `get_my_work_queue`                                                                  | Read         | Semua                            | `GET my-work-queue`                                                                   | v2                   |
| `get_feature`, `list_subtasks`, `get_subtask`, `get_activity`                        | Read         | Semua yang boleh membuka Feature | `tasks/*` GET + aturan ADR-043                                                        | v2                   |
| `get_requirements_with_ac`                                                           | Read         | Semua yang boleh membuka Feature | `requirements/*` GET                                                                  | v2                   |
| `list_comments`                                                                      | Read         | Sama                             | `GET comments`                                                                        | v2                   |
| `preview_groomed_feature`, `publish_feature`                                         | Read / Write | Owner, Admin, PO                 | v1. Usulan: preview juga menjalankan cek bentrok untuk setiap subtask `assigned`      | v1                   |
| `find_available_assignees`                                                           | Read         | Owner, Admin, PO                 | Spesialisasi member + `GET capacity/timeline`. Poin dan cuti hanya bila K9 diputuskan | v1                   |
| `list_blockers`, `add_blocker`, `resolve_blocker`                                    | Read / Write | Sesuai service (ADR-045)         | `/:taskId/blockers*`                                                                  | v2 / v3              |
| `check_assignment_conflict`                                                          | Read         | Owner, Admin, PO                 | `POST capacity/assignment-preview` (redaksi `AUTH-011`)                               | v1                   |
| `release_subtask`, `reassign_subtask`                                                | Write        | Owner, Admin, PO                 | `POST release`, `POST reassign`                                                       | v3                   |
| `claim_subtask`                                                                      | Write        | Dev, QA                          | `POST claim` (ADR-038)                                                                | v3                   |
| `update_subtask_status`                                                              | Write        | Sesuai service                   | `PATCH status`                                                                        | v3                   |
| `add_comment`                                                                        | Write        | Semua                            | `POST comments`                                                                       | v3                   |
| `mark_acceptance_check`                                                              | Write        | Dev (+ Owner/Admin)              | `PUT acceptance-checks/:criterionId`                                                  | v3                   |
| `get_developer_readiness`, `submit_readiness_review`                                 | Read / Write | Dev, QA                          | `developer-readiness`, `readiness/reviews`                                            | v2 / v3              |
| `record_bug_resolution`, `add_bug_evidence_link`                                     | Write        | Dev                              | `resolution-events`, `evidence-links`                                                 | v3                   |
| `get_qa_workflow_summary`, `list_test_cases`                                         | Read         | QA                               | `qa-workflow-summary`, `test-cases` GET                                               | v2                   |
| `create_test_case`, `start_test_run`, `record_test_result`, `add_test_evidence_link` | Write        | QA                               | `test-cases/*` POST                                                                   | v3                   |
| `create_bug`, `record_retest`, `reopen_bug`                                          | Write        | QA (+ Owner/Admin)               | `bugs/*` POST                                                                         | v3                   |
| `report_own_bug`                                                                     | Write        | Dev                              | **Belum ada.** Butuh BUG-INTAKE-SLA                                                   | Mengikuti BUG-INTAKE |
| `get_leader_timeline`, `get_leader_quality`, `get_leader_digest`                     | Read         | Owner, Admin                     | `/leader/*`                                                                           | v2                   |
| Tool tiket Support                                                                   | Write        | Support                          | **Belum ada.** Menunggu BUG-INTAKE D3                                                 | Mengikuti BUG-INTAKE |

**Usulan: tidak pernah lewat MCP.** QA sign-off, release decision, governance decision, delete apa pun,
pengelolaan anggota dan role, serta deploy. Lihat K6.

**Catatan QA.** `record_test_result` dan `add_test_evidence_link` adalah jalur alami bagi agent otomasi
Playwright untuk mengirim hasil run ke Qlick Hub. Jalur ini tetap memakai akun dan hak QA yang login.

## 5. Decision Snapshot: keputusan yang dibutuhkan

| ID  | Keputusan                         | Opsi (pro / kontra)                                                                                                                                                                                                                                                                                                                                                                                        | Rekomendasi                                                |
| --- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| K1  | Struktur dokumen                  | **A. Perluas folder yang sama.** Satu katalog, satu authorization, dan auth/transport bersama sesuai `DOC-005`. Kontranya Feature makin besar, tapi dikendalikan lewat phase. **B. Feature baru `QLICKHUB-ROLE-MCP`.** Lebih terpisah, tapi auth dan transport ditulis di dua tempat.                                                                                                                      | A                                                          |
| K2  | Urutan rilis                      | **A. v1 publish Planner, v2 read untuk semua role dan Leader, v3 write Dev/QA.** Risiko kecil dan nilai cepat (agent Dev bisa membaca AC). **B. Read dan write sekaligus.** Satu rilis, tapi WRA lebih tinggi dan perlu ADR AI-001 lebih awal.                                                                                                                                                             | A                                                          |
| K3  | Batas `AI-001` untuk write Dev/QA | **a. Konfirmasi eksplisit di agent untuk setiap write.** Konsisten dengan pilihan publish dan diaudit sebagai actor agent + channel `mcp`. Kontranya backend tidak bisa membuktikan bahwa konfirmasi benar-benar diucapkan. **b. Agent hanya membuat draft, lalu user Apply di UI.** Paling aman, tapi tetap harus membuka aplikasi. **c. Read-only selamanya.** Tanpa risiko mutasi, tapi nilainya kecil. | a, dicatat di ADR yang sama dengan Apply publish           |
| K4  | Visibilitas tool                  | **A. `tools/list` difilter berdasarkan gabungan role user di semua Workspace, lalu dicek ulang di setiap call.** Agent tidak melihat tool yang tidak relevan. Kontranya perubahan role butuh notifikasi `tools/list_changed`, dan dukungan client perlu diuji. **B. Tampilkan semua tool, tolak saat dipanggil.** Lebih sederhana, tapi agent mudah mencoba tool terlarang.                                | A                                                          |
| K5  | Dev menautkan PR                  | **a. Pakai komentar atau evidence link yang sudah ada.** Tidak mengubah authorization. **b. Buka `POST links` untuk Dev.** Lebih rapi, tapi ini perubahan authorization yang butuh ADR dan masuk Tier 2.                                                                                                                                                                                                   | a untuk dokumen ini. b dicatat sebagai keputusan terpisah. |
| K6  | Daftar "tidak pernah lewat MCP"   | **Ya:** sign-off, release decision, governance, delete, anggota, dan deploy tetap di UI dengan jejak manusia. **Tidak:** fleksibel, tapi melanggar arah `AI-013`.                                                                                                                                                                                                                                          | Ya                                                         |
| K7  | Client target                     | **Tier A:** Claude, Codex, Antigravity (sudah ada di dokumen). **Tier B:** OpenCode dan Gemini CLI, ditulis sebagai "akan diuji" dan tidak diklaim kompatibel.                                                                                                                                                                                                                                             | Tier A + B                                                 |
| K8  | Instruksi perilaku per role       | **A. MCP prompts dari server**, misalnya "grooming", "kerjakan subtask", "uji AC". Satu sumber untuk semua client. Kontranya dukungan prompts di tiap client perlu diuji. **B. File instruksi per client** (AGENTS.md, skill). Mudah dibuat, tapi menyalin aturan ke banyak tempat, padahal aturan repo melarang itu.                                                                                      | A, dengan `setup.md` cukup menautkan                       |

Saat eksekusi muncul dua keputusan terbuka baru: K9 (PO melihat beban poin saat assign) dan K10
(Developer menambah tautan Task). Keduanya dicatat di `solution.md`; Owner kemudian memilih opsi a untuk keduanya (2026-11-18).

## 6. Berkas yang akan berubah

| Berkas                                                                     | Perubahan                                                                                                                                            |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/features/QLICKHUB-PRODUCT-MCP/README.md`                             | Tujuan menjadi "semua role, bertahap v1–v3". Diagram alur lintas role diperluas. Stage Tracker tetap Draft.                                          |
| `problem.md`                                                               | Tambah masalah per role: Dev, QA, Leader. Pindahkan "update delivery Dev/QA" dari luar scope ke v3. Metrik dengan baseline "unknown" tidak dikarang. |
| `solution.md`                                                              | Tambah Decision Snapshot K1–K8. Keputusan terbuka v1 tidak diubah.                                                                                   |
| `product.md`                                                               | Tambah REQ/AC untuk v2 read dan v3 write per role, termasuk penolakan role dan isolasi Workspace.                                                    |
| `contracts.md`                                                             | Katalog tool lengkap §4 dengan pemetaan endpoint/service dan tanda "butuh backend baru".                                                             |
| `authorization.md`                                                         | Matriks tool × role, diselaraskan dengan route dan service. Tidak ada tool yang memberi hak melebihi REST. Daftar "tidak pernah lewat MCP".          |
| `roles/developer.md`, `roles/qa.md`, `roles/po.md`, `roles/owner-admin.md` | Path kerja per role lewat agent.                                                                                                                     |
| `roles/leader.md` (baru)                                                   | Path read-only Leader.                                                                                                                               |
| `breakdown.md`                                                             | Phase v2 (read) dan v3 (write) dengan WRA estimasi per phase. Ketergantungan ke BUG-INTAKE-SLA.                                                      |
| `testing.md`                                                               | Rencana uji denial per role, isolasi, audit actor agent, dan UAT client Tier A/B.                                                                    |
| `setup.md`                                                                 | Tambah OpenCode dan Gemini CLI sebagai "belum diuji", dengan tautan ke dokumentasi vendor. Tambah catatan MCP prompts.                               |
| `release.md`                                                               | Urutan rilis v1, v2, v3.                                                                                                                             |
| `docs/plans/README.md`                                                     | Satu kalimat dan tautan ke rencana ini.                                                                                                              |
| `TODO.md`                                                                  | Perbarui item QLICKHUB-PRODUCT-MCP yang sudah ada. Tidak membuat item kedua.                                                                         |
| `docs/reports/QLICKHUB_PRODUCT_MCP_ROLES_DOCS_2026-11-xx.md` (baru)        | Laporan evidence sesuai `AGENT_REPORT_TEMPLATE.md`.                                                                                                  |
| `docs/plans/QLICKHUB_MCP_ALL_ROLES_PLAN.md` (baru)                         | Rencana ini.                                                                                                                                         |

## 7. Dampak

- **Data/interface:** tidak ada. Hanya dokumen. Kontrak executable tidak dibuat.
- **Authorization:** tidak ada perubahan yang aktif. Matriks ditulis sebagai usulan. K5b, jika dipilih nanti, adalah perubahan terpisah.
- **Migrasi:** tidak ada.
- **Change Impact Map:** dokumen Feature MCP, lalu konsumen `TODO.md`, `docs/plans/README.md`, dan `FEATURE_CATALOG.md` (diperiksa, hanya diubah bila perlu). Beririsan dengan BUG-INTAKE-SLA (tool bug Dev dan Support), SIMPLE-UI-DELIVERY-FLOW/ADR-036 (actor agent), ADR-038 (claim), ADR-041 (alur QA), dan ADR-043 (akses baca Feature). Dokumen tersebut hanya ditautkan, tidak diubah.

## 8. Work Readiness Assessment

**Pekerjaan dokumen ini:** requirement 1 (K1–K8 dicatat sebagai usulan) + lapisan 0 + data 0 + auth 0 +
contract 0 + ketersinggungan 1 + validasi 0 (static `docs:check`/`docs:completeness`) + eksternal 0 =
**2/16, Ready** setelah rencana dan Approval Window disetujui.

Akses: baca SSoT dan repo tersedia, menulis di worktree tersedia, dan pemeriksaan docs dapat dijalankan
di komputer Owner lewat shell perangkat. Tidak ada AC dokumen yang membutuhkan PostgreSQL atau client nyata.

**Estimasi implementasi (tidak berubah, hanya informasi):** tetap **Blocked** (13/16 untuk v1). Setiap
phase v2/v3 dihitung ulang di `breakdown.md` dan dipecah bila skornya di atas 8.

## 9. AC dan evidence

| AC  | Given / When / Then                                                                                                                                                     | Evidence                                             | Level |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ----- |
| D-1 | Diberikan katalog tool, ketika direview, maka setiap tool menyebut endpoint/service yang ada dengan path berkas, atau ditandai "butuh backend baru".                    | Diff review dan cocokkan dengan route files          | E1    |
| D-2 | Diberikan matriks authorization, ketika dibandingkan dengan `requireWorkspaceMember` dan aturan service, maka tidak ada tool yang memberi hak lebih luas daripada REST. | Tabel silang di laporan, berisi baris route per tool | E1    |
| D-3 | Role path Owner/Admin, PO, Dev, QA, dan Leader tersedia dan saling tertaut. Support ditandai menunggu BUG-INTAKE D3.                                                    | `docs:check` (tautan) dan diff review                | E1    |
| D-4 | Fakta dan usulan dipisah. Semua stage tetap Draft. Tidak ada klaim gate disetujui atau kompatibilitas client.                                                           | Diff review                                          | E1    |
| D-5 | `npm run docs:check` dan `npm run docs:completeness` lulus tanpa entri baru di `quality/doc-baseline.json`.                                                             | Output perintah dicatat di laporan                   | E2    |
| D-6 | `TODO.md` memperbarui item yang sudah ada, bukan menambah item kedua.                                                                                                   | Diff review                                          | E1    |
| D-7 | K1–K8 tercatat dengan pro/kontra dan rekomendasi. Pilihan Owner ditulis apa adanya.                                                                                     | Diff review `solution.md`                            | E1    |

## 10. Langkah eksekusi dan Approval Window

1. Owner menjalankan `git fetch` dan membuat worktree `.worktrees/wt-mcp-roles` dengan branch
   `claude/mcp-all-roles-docs` dari `origin/main` (@ `e710d525`). Claude tidak menjalankan git yang
   menulis; commit, push, dan PR dilakukan Owner.
2. Baca aturan service untuk setiap tool di §4 (assignee, akses Feature) dan perbaiki matriks bila berbeda.
3. Tulis berkas di §6 sesuai keputusan K1–K8 dari Owner.
4. Jalankan `npm run docs:check`, `npm run docs:completeness`, dan Prettier pada berkas yang diubah.
5. Lakukan quality review (`AI-010`): duplikasi dengan dokumen lain dan tautan usang.
6. Owner melakukan commit, push, dan membuka PR tanpa auto-merge. Tier dilaporkan sesuai `AI-020`.
7. Simpan laporan dan perbarui TODO.

**Approval Window yang diminta:**

- **Task:** `QLICKHUB-PRODUCT-MCP-V2-ROLES-DOCS`
- **Baseline:** `origin/main` saat eksekusi
- **Path yang boleh diubah:** `docs/features/QLICKHUB-PRODUCT-MCP/**`, `docs/plans/README.md`,
  `docs/plans/QLICKHUB_MCP_ALL_ROLES_PLAN.md`, `docs/reports/QLICKHUB_PRODUCT_MCP_ROLES_DOCS_*.md`,
  item MCP di `TODO.md`, dan baris MCP di `docs/features/FEATURE_CATALOG.md` (diperlukan karena
  deskripsi lamanya "Owner/Admin, PO" tidak lagi benar; sesuai Change Impact Map §7)
- **Dilarang:** kode, migrasi, ADR baru berstatus Accepted, perubahan `POLICY_REGISTRY.md` atau SSoT,
  serta mengedit working tree Codex
- **Evidence:** §9
- **Berakhir:** 2026-11-21 23:59 WIB
- **Merge:** perlu pilihan Owner. Auto-merge sesuai `AI-020` akan ikut memicu deploy Production karena
  merge ke `main` (tanpa perubahan runtime). Alternatifnya, PR ditahan sampai Owner menyetujui.
