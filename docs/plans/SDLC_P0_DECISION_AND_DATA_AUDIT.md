# Paket Keputusan dan Audit Data SDLC P0

**Status:** Accepted — K1–K3/K8 disetujui 2026-09-13
**Disusun:** Codex, 2026-09-13
**Cakupan:** rekonsiliasi kebijakan dan audit agregat read-only; tidak mengubah workflow, API,
otorisasi, schema, migrasi, data persisten, atau Production
**Policy IDs:** `DOMAIN-002`, `DOMAIN-003`, `DOMAIN-004`, `AUTH-001`, `AUTH-002`, `FLOW-001`,
`FLOW-002`, `FLOW-005`, `FLOW-006`, `QA-001`, `QA-002`, `QA-003`, `QA-004`, `QA-005`,
`RELEASE-001`, `RELEASE-002`, `DATA-001`, `DATA-002`, `DATA-004`, `DATA-005`, `CONTRACT-001`,
`TEST-001`, `DOC-002`, `DOC-003`, `DOC-004`

Dokumen ini mempersempit [rencana SDLC utama](SDLC_QUALITY_AND_RELEASE_PLAN.md) menjadi empat
keputusan yang menghalangi P1/P2 dan bukti data yang tersedia saat ini. Rekomendasi disetujui oleh
pengguna melalui instruksi untuk melanjutkan pada 2026-09-13, lalu dicatat dalam
[ADR-013](../adr/ADR-013-SDLC-READINESS-TRIAGE-REVIEW-AND-LEGACY-GOVERNANCE.md) dan diterapkan pada
Architecture/Workflow SSoT sesuai `DOC-002`. Implementasi runtime tetap belum aktif.

## 1. Ringkasan keputusan yang disetujui

| ID  | Keputusan                                                                                                                                                                                                                                                                          | Pemilik keputusan/pelaksana                                                                                                    | Dampak                                                                                                                           |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| K1  | Planner pemilik Feature menetapkan baseline **Siap Dikerjakan** setelah masukan Dev dan QA tercatat. Temuan kritis terbuka menghalangi pekerjaan baru. Owner/Admin dapat memberi pengecualian darurat dengan alasan, masa berlaku, dan jejak audit.                                | Product Owner bertanggung jawab atas readiness; Engineering dan QA wajib memberi masukan; Owner/Admin hanya untuk pengecualian | P1 dapat mendesain baseline, temuan Requirement, dan gate bertahap tanpa menyamakan status Requirement `active` dengan readiness |
| K2  | Pelapor mengusulkan klasifikasi penyebab. Triage Product–Dev–QA menetapkan hasil; `bersama` dan `belum diketahui` adalah hasil sah. Jika tidak sepakat, Owner/Admin memutuskan klasifikasi proses, sementara pendapat berbeda tetap tersimpan.                                     | Product, Engineering, dan QA melakukan triage; Owner/Admin menjadi pemutus sengketa                                            | Metrik tidak otomatis menyalahkan Product, Dev, atau QA dan koreksi klasifikasi tetap dapat diaudit                              |
| K3  | Satu putaran dihitung per Development Subtask dan per jenis review. Review teknis dan QA tidak digabung. Perubahan baseline/cakupan menutup putaran lama sebagai `digantikan`, bukan otomatis sebagai kegagalan Dev.                                                               | Reviewer teknis atau QA mencatat outcome sesuai jenis review; Planner mencatat perubahan baseline                              | P2 dapat menghitung jumlah kembali ke Dev secara konsisten tanpa menggandakan Feature dan Subtask                                |
| K8  | Jangan merekayasa baseline, reviewer, akar masalah, build, atau deployment lama. Data historis tanpa bukti diberi status **belum terverifikasi/tidak tersedia**. Gate baru dimulai sebagai pilot untuk Feature baru; pekerjaan aktif mendapat jalur remediasi sebelum enforcement. | Product/Engineering/QA menyetujui cutover; Owner/Admin mengaktifkan enforcement setelah pilot                                  | Tidak ada backfill spekulatif; dashboard wajib menampilkan denominator, kelengkapan, dan status data                             |

### Hal yang sengaja belum diputuskan

- K4–K7 dan K9–K10 tetap mengikuti urutan dependensi pada rencana utama.
- Durasi pilot, ukuran sampel minimum, retensi, dan akses analitik individu belum ditetapkan.
- P0 ini tidak memberi hak deploy/migrasi, tidak mengaktifkan ranking individu, dan tidak
  mendefinisikan endpoint baru.

## 2. Fakta implementasi yang terkonfirmasi

| Area                 | Yang tersedia sekarang                                                                                                         | Gap terhadap target                                                                                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Requirement          | Requirement milik Workspace, many-to-many dengan Task, memiliki status `draft/active/deprecated`; AC memiliki identitas stabil | Tidak ada versi/baseline Requirement+AC, keputusan readiness, masukan Dev/QA, atau Temuan Requirement sebelum coding                                                                |
| Development Subtask  | Lifecycle menyimpan perubahan status, aktor, `reviewedBy`, dan `reviewNotes` pada Task/activity                                | `reviewedBy` dan `reviewNotes` pada Task hanya keadaan terakhir; tidak ada identitas putaran, jenis review, baseline/build, outcome historis terstruktur, atau klasifikasi penyebab |
| QA Subtask           | Lifecycle QA terpisah `todo → in_progress → done` dan tidak self-review                                                        | Tidak boleh dianggap sebagai putaran pengembalian Dev; belum ada QA Subtask pada Production saat audit                                                                              |
| Test Case/Run/Result | Test Case terhubung ke Requirement; Run menyimpan build/environment; Result immutable                                          | Run tidak menyimpan Feature/candidate/baseline eksplisit. Jika satu Test Case dipakai oleh Requirement pada beberapa Feature, Run terbaru dapat ambigu untuk readiness Feature      |
| Bug                  | Bug selalu menunjuk Feature, Requirement, dan failed Test Result; lifecycle dan activity tersedia                              | Tidak dapat mewakili pertanyaan/gap Requirement sebelum Test Result; belum ada root-cause agreement atau retest attempt eksplisit                                                   |
| Release              | Readiness dihitung backend; QA sign-off dan PO release decision menyimpan snapshot dan cancellation append-only                | Belum ada release package/candidate, deployment attempt, commit/artifact identity, status migrasi, atau verifikasi Production yang persisten pada domain aplikasi                   |
| Laporan              | UI menampilkan kondisi Task dan readiness saat ini                                                                             | Belum ada query analitik longitudinal backend dengan denominator, versi definisi, kelengkapan, dan drill-down evidence                                                              |

## 3. Rekonsiliasi sumber kebenaran

| Konflik/perbedaan     | Bukti awal                                                                                                                | Resolusi P0                                                                                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lokasi migrasi        | Architecture §6 menyebut `apps/api/src/database/migrations/`; `.sequelizerc` aktif menunjuk `apps/api/src/db/migrations/` | Architecture sekarang menunjuk direktori kanonikal `apps/api/src/db/migrations/`; tidak dibuat direktori kedua.                                                                   |
| Bug `CLOSED`          | Diagram Workflow memakai `CLOSED`; shared contract memakai `verified` sebagai akhir setelah QA                            | Diagram sekarang memakai status API `verified`.                                                                                                                                   |
| Release `Conditional` | Diagram Workflow menampilkan Conditional; shared contract hanya `approved/rejected`, dengan approved override reason      | Workflow sekarang menyatakan `Conditional` bukan enum aktif; kondisi saat ini adalah `approved` dengan `overrideReason`. K6 tetap menentukan kebijakan paket/override berikutnya. |

## 4. Audit data read-only

Audit dilakukan 2026-09-13 melalui transaksi PostgreSQL `READ ONLY`. Hanya agregat yang dibaca;
tidak ada judul, isi Requirement, nama/email pengguna, UUID, URL evidence, atau secret yang
ditampilkan atau disalin. Tidak ada baris yang dibuat, diperbarui, atau dihapus.

### Production

| Metrik                                                            |         Hasil | Interpretasi                                                                  |
| ----------------------------------------------------------------- | ------------: | ----------------------------------------------------------------------------- |
| Workspace / Feature aktif / Development Subtask / QA Subtask      | 1 / 1 / 1 / 0 | Sampel delivery terlalu kecil dan alur QA belum terbentuk                     |
| Task activity / event transisi status / event `changes_requested` |     8 / 0 / 0 | Jumlah pengembalian QA→Dev tidak dapat dihitung dari data Production saat ini |
| Requirement aktif / tertaut Task / memiliki AC aktif              |     3 / 3 / 1 | Linkage 100%, tetapi kelengkapan AC aktif hanya 1 dari 3 (33,3%)              |
| Test Case / Test Run / Test Result                                |     0 / 0 / 0 | Kualitas eksekusi QA dan first-pass rate belum memiliki denominator           |
| Bug / Bug terverifikasi                                           |         0 / 0 | Tidak membuktikan defect rate nol karena belum ada hasil uji                  |
| QA sign-off / release decision / cancellation                     |     0 / 0 / 0 | Belum ada bukti release governance pada domain aplikasi                       |
| Record Test Case legacy                                           |             0 | Tidak ada data legacy yang perlu dipindahkan saat ini                         |

Aktivitas Production yang ada hanya pembuatan Task/Subtask, pembuatan Product Brief/AC, perubahan
deskripsi Task, dan tiga tautan Requirement. Seluruh Task aktif masih berstatus `todo`.

### Lokal

| Metrik                                                            |             Hasil | Interpretasi                                           |
| ----------------------------------------------------------------- | ----------------: | ------------------------------------------------------ |
| Workspace / Feature / Development Subtask / QA Subtask            |     9 / 7 / 5 / 3 | Data pengembangan, bukan sampel operasional yang valid |
| Task activity / event transisi status / event `changes_requested` |        19 / 0 / 0 | Tidak ada histori round yang dapat dipakai             |
| Requirement / Test Case / Test Run / Result / Bug                 | 1 / 0 / 0 / 0 / 0 | Tidak dapat menggantikan evidence Production           |
| Sign-off / release decision / record legacy                       |         0 / 0 / 0 | Tidak ada baseline historis tambahan                   |

### Kesimpulan kelayakan KPI

- Semua metrik kualitas Product, Dev, dan QA berstatus **belum tersedia**, bukan nol.
- Data lama tidak cukup untuk backfill putaran, akar masalah, first-pass rate, defect escape, atau
  deployment frequency secara jujur.
- Baseline pengukuran harus dimulai setelah event baru terpasang dan pilot K8 dimulai.
- Production saat ini tidak memiliki konflik Test Case lintas Feature karena belum ada Test Case,
  tetapi risiko struktural tetap ada sampai Test Run memiliki scope Feature/candidate eksplisit.

## 5. Peta pembaca yang terdampak pada implementasi berikutnya

| Kemampuan     | Pembaca backend                                                                                       | Pembaca frontend                                                                                 | Konsekuensi desain                                                                                                  |
| ------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Readiness     | `releaseDecisionService` jalur batch dan detail/create sign-off/create decision                       | Task Hub, Task detail/deep link, My Tasks, Report, `ReleaseAssurancePanel`, dan signal readiness | Satu evaluator backend harus tetap menjadi sumber tunggal; individual dan batch wajib memakai scope Run yang sama   |
| Cancellation  | `releaseDecisionService`, association cancellation, dan deletion guard                                | `ReleaseAssurancePanel` dan release API client                                                   | Histori tidak boleh ditimpa; paket/candidate baru perlu invalidation/cancellation append-only                       |
| Task deletion | `taskDeletion` memeriksa Requirement, dokumen, attachment, Bug, sign-off, dan decision                | Task detail serta kartu Planner                                                                  | Guard harus diperluas sebelum baseline, round, finding, atau package baru dapat direferensikan                      |
| Work queue    | `workQueueService` membangun queue Planner/Dev/QA dari Task, Requirement, Bug, sign-off, dan decision | My Tasks melalui `useRoleAwareWorkQueue`                                                         | Temuan kritis, triage, review round, dan remediasi legacy perlu alasan backend-derived; React tidak menghitung gate |

## 6. Dampak implementasi yang diperkirakan

- **File/area:** shared contracts Requirement/activity/test management/Bug/release; Sequelize model dan
  migrasi di `apps/api/src/db/migrations/`; modul Requirement, task lifecycle, test management, Bug,
  release decision, deletion guard, work queue; organisme Task detail/My Tasks/Report.
- **Data/interface:** P1/P2 memerlukan entitas/event additive dan endpoint Workspace-scoped. Kontrak
  final baru dibuat per vertical slice setelah ADR/SSoT disahkan.
- **Authorization:** K1/K2 menambah aksi granular yang harus ditegakkan backend. Rekomendasi belum
  mengubah izin aktif.
- **Risiko migrasi:** additive lebih aman; jangan backfill nilai yang tidak dapat dibuktikan. Tambahkan
  constraint/foreign key/index setelah audit clean-migration dan uji PostgreSQL disposable.
- **Validasi minimum:** contract tests; integration tests untuk role, Workspace isolation, immutable
  events, concurrency, deletion guard, dan legacy unknown; frontend loading/empty/error/disabled/
  denied serta desktop/mobile; lalu `npm run validate` dan clean-migration verification.

## 7. Gerbang untuk melanjutkan

Gerbang keputusan P0 sudah terpenuhi: ADR, Architecture/Workflow, dan Policy Registry telah
diselaraskan. Langkah berikutnya adalah memecah P1 menjadi satu vertical slice pertama, lalu
mendesain kontrak/schema serta rencana migrasi terperinci. Implementasi P2 tetap menunggu P1
menyediakan identitas baseline yang dapat direferensikan oleh putaran review.
