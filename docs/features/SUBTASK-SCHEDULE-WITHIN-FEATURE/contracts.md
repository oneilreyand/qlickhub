# SUBTASK-SCHEDULE-WITHIN-FEATURE — Data, API dan Shared Contracts

**Status:** Disetujui
**Disetujui oleh:** Owner, 2026-11-07 (`ok`, G0–G3 dan K1/L1/L2)

**Applicable Policy IDs:** DOC-005, CONTRACT-001, DOMAIN-002, DATA-001, AUTH-002, TEST-001

## Data dan relasi

Reuse tasks: root parentTaskId null, child satu tingkat, workspaceId sama. Ownership/FK tidak
berubah. Tidak ada migrasi, kolom, backfill atau rewrite data lama. Constraint adalah metadata
baca yang dihitung server. Validasi gagal tidak menulis Task, Activity, Feature Spec history,
notifikasi/outbox atau perubahan lain dari transaksi. Sukses memakai audit existing tepat sekali.

## Surface existing yang diperiksa

- [taskRoutes.ts](../../../apps/api/src/modules/tasks/taskRoutes.ts): GET/POST `/v1/workspaces/:workspaceId/tasks`,
  GET/PATCH `/v1/workspaces/:workspaceId/tasks/:taskId`, GET/POST `.../:taskId/subtasks`.
- [taskLifecycle.ts](../../../apps/api/src/modules/tasks/internal/taskLifecycle.ts): createTaskInTransaction,
  updateTaskInTransaction. Parent tidak dapat dipindah setelah create; parent validation tetap Workspace scoped.
- [featureSpecService.ts](../../../apps/api/src/modules/featureSpecs/featureSpecService.ts):
  syncPlanToFeature menulis root melalui TaskModel.update; Apply dan Plan save wajib dites.
- [taskQuery.ts](../../../apps/api/src/modules/tasks/internal/taskQuery.ts): formatTask/list/get menjadi
  titik pemuatan metadata; audit dan pagination existing tetap dipertahankan.
- [task.ts](../../../packages/contracts/src/task.ts): request/response existing dan validation pair/order
  tetap sumber executable; tidak menyalin ulang seluruh field ke dokumen.

Apply Feature Spec memakai ai/aiTaskDraftPersistence.ts yang memanggil createTaskInTransaction
untuk source feature_spec; jalur preview legacy membuat child tanpa jadwal. Tes tetap membuktikan
Apply/rollback dan idempotency existing, bukan menganggap semua caller sudah aman.

Tidak ada endpoint baru yang diusulkan. Detail route Feature Spec tetap mengikuti router existing.

## Kontrak implementasi lokal (G2 disetujui)

Task response mendapat field optional additive `featureScheduleConstraint`, untuk child yang
terbaca melalui API. Status: `within`, `outside`, `unbounded`, `unscheduled`, `ignored` serta label
server dan reason opsional. Definisi dipusatkan di packages/contracts/src/task.ts pada kandidat lokal.
`outside` hanya dari evaluasi backend; browser menampilkan label/rentang parent yang telah dimuat.
Absent field dari server lama tidak boleh dianggap bukti bahwa legacy valid. Root tidak perlu
menggandakan metadata semua child; GET child/halaman daftar mencakup evaluasi per record yang dimuat.

Error root 409 memuat nama dan jadwal child konflik serta rentang root usulan dalam
kontrak error existing yang diperiksa saat build. Child 400 memuat rentang sah. Jangan menambah
shape problem/error paralel; bila shape existing belum memadai, perluas shared schema secara
additive dan tes parsing UI. Authorization diperiksa sebelum evaluasi/penyajian detail konflik.
Kelengkapan pesan tidak boleh terpotong sehingga child bermasalah tersembunyi; pagination/summary
konflik yang diperlukan harus didesain dan diuji jika fixture besar menunjukkan kebutuhan tersebut.

## Transaksi, concurrency dan performa

Satu helper assertSubtasksWithinFeatureSchedule, root lock bersama sebelum child, query setelah
lock untuk semua writer relevan termasuk Plan sync; status terminal/reopen mengikuti L2.
Uji dua koneksi pada PostgreSQL disposable membuktikan serialisasi create child vs shrink root.
Read metadata batch root pada halaman child; hindari query per child dan full-table scan.
Inspeksi indeks tasks workspaceId/parentTaskId serta EXPLAIN pada dataset realistis sebelum
memilih indeks baru; baseline latency/query count belum diukur. Bila indeks/migrasi diperlukan,
berhenti dan ajukan perluasan scope. Tidak memakai raw SQL untuk operasi domain.

## Boundary

Consumer: layanan Task, Feature Spec, UI planning dan pembaca subtask. scheduleHealth overdue
existing tidak diubah maknanya menjadi containment. Workload FLOW-007 tetap advisory.
Tidak ada business calculation duplicate di React. Tidak ada model AI atau integrasi eksternal baru.

## Error codes dan koreksi context stale

Kode shared `FEATURE_SCHEDULE_CONFLICT` membedakan 409 jadwal dari konflik versi Spec;
`SUBTASK_SCHEDULE_OUT_OF_RANGE` membedakan 400 rentang child. Keduanya menggunakan envelope
ProblemDetail existing; controller hanya mengganti code pada error guard yang dikenali.
apiClient mempertahankan detail actionable untuk dua code ini. Error selain F1 tetap mengikuti
pemetaan existing. Plan tidak di-reload pada konflik jadwal sehingga input tidak hilang.
CreateSubtaskModal/SubtaskAccordionItem memperbarui rentang parent melalui GET authenticated
setelah error range, tanpa mengganti draf; respons stale dari Feature lama diabaikan.

Bukti aktual: [testing.md](testing.md) dan [laporan Phase 1](../../reports/SUBTASK_SCHEDULE_WITHIN_FEATURE_P1_2026-11-07.md).

Respons list includeSubtasks menyertakan metadata pada child embedded lewat batch yang sama. formatTaskJson menangani child plain record hasil Sequelize toJSON, tanpa memanggil toJSON lagi pada JSON.

Respons assignment claim/release/reassign juga memakai metadata backend yang sama pada Task
hasil mutasi, agar penggantian record UI tetap membawa status legacy dan rentang Feature.
Tidak ada request field atau izin assignment baru; definisi shape tetap di shared contracts.
