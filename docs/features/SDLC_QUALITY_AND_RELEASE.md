# SDLC-QUALITY-RELEASE — Kualitas Delivery dan Paket Rilis

**Status:** Active — P1A/P1B tersedia di Production; P1C Kerjaa menunggu review/baseline; QA assurance S1–S4 dan contextual multi-cycle retest tersedia pada development/test database, belum dideploy ke Production
**Owner:** Product dan Engineering; QA sebagai pemangku kepentingan
**Last reviewed:** 2026-09-16
**Applicable Policy IDs:** `DOMAIN-002`, `DOMAIN-003`, `DOMAIN-004`, `AUTH-001`, `AUTH-002`, `AUTH-009`, `AUTH-010`, `FLOW-002`, `FLOW-005`, `FLOW-006`, `QA-001`, `QA-002`, `QA-003`, `QA-004`, `QA-005`, `QA-006`, `QA-007`, `QA-008`, `QA-009`, `RELEASE-001`, `RELEASE-002`, `RELEASE-003`, `DATA-001`, `DATA-002`, `DATA-004`, `DATA-005`, `CONTRACT-001`, `UI-001`, `UI-002`, `TEST-001`, `DOC-002`, `DOC-003`, `DOC-004`

Card ini menghubungkan rencana lintas lapisan, bukan menetapkan kebijakan baru. Sumber detail usulan
adalah [rencana SDLC](../plans/SDLC_QUALITY_AND_RELEASE_PLAN.md). Workflow P1A/P1B kini tersedia dalam
mode observasi dan belum menjadi hard gate.
Paket [keputusan dan audit data P0](../plans/SDLC_P0_DECISION_AND_DATA_AUDIT.md) menemukan bahwa
data Production belum memiliki denominator QA/release yang cukup. K1–K3/K8 telah disetujui dan
dicatat dalam [kebijakan tata kelola SDLC](../2_WORKFLOW_AND_ROLES.md#kesiapan-requirement-dan-triage-temuan);
P1A telah mengaktifkan review readiness dan baseline append-only. P1B menambahkan Temuan
Requirement, klarifikasi, posisi lintas peran, keputusan triage berversi, dan riwayat penyelesaian;
review round, analitik, paket rilis, deployment evidence, serta enforcement masih mengikuti slice
berikutnya.

Atas keputusan pengguna 14 September 2026, target pilot empat minggu dipindahkan dari Workspace
development `essensial` ke `kerjaa`; migrasi additive 67–69 tetap sudah tersedia. Audit read-only
Production terbaru mengonfirmasi satu Owner, satu Developer, dua QA, root Feature `billing v3`,
tiga Subtask yang mencakup Development/QA, dua Requirement aktif beserta Acceptance Criteria, dan
Product Brief utama versi 1 yang approved. Subtask QA `test billing v3` sudah dipindahkan kepada
akun QA Production baru; Activity/notifikasi persisten dan endpoint readiness membuktikan capability
review QA aktif. Review QA `ready` kemudian disimpan berdasarkan rekomendasi dan catatan yang
disetujui pengguna. Review kesiapan Developer dan baseline Feature belum tersedia, sehingga pilot
belum memiliki jendela observasi yang sah. Bukti audit dan blocker terbaru dicatat pada
[laporan P1C](../reports/SDLC_P1C_KERJAA_OBSERVATION_PILOT_RETARGET_2026-09-14.md).

## 1. Tujuan dan Pengguna

Product, Dev, QA dan pengelola membutuhkan ketertelusuran kesiapan kebutuhan, pengerjaan ulang,
kualitas pengujian dan rilis aktual. Hasil dan pengecualian cakupan ada pada rencana §1.

## 2. Requirement dan Acceptance Criteria

Kriteria penerimaan terdaftar per slice P0–P6 pada rencana §6. P1A memakai Product Brief yang
disetujui serta Requirement/AC aktif yang sudah ada; tidak membuat definisi planning baru. Baseline
normal hanya dapat dibuat bila kelima pemeriksaan backend lulus. P1B mewajibkan setiap temuan
menunjuk Requirement yang terhubung ke root Feature atau Subtask-nya dan menyimpan snapshot kode,
judul, serta status Requirement pada saat pelaporan. K1–K3/K8 sudah disahkan; keputusan lain pada
§4 belum disahkan.

## 3. Alur Lintas Peran

Alur target ada pada rencana §5. Batas peran aktif tetap mengikuti [Workflow](../2_WORKFLOW_AND_ROLES.md).
Anggota mencatat temuan/klarifikasi; Product, Development, dan QA masing-masing menambahkan posisi.
Posisi terbaru yang sama menghasilkan konsensus deterministik. Jika ketiganya sudah berpendapat
namun tidak sepakat, Owner/Admin mencatat klasifikasi proses dan semua posisi tetap tersimpan.
Planner menandai selesai atau membuka kembali dengan alasan; penyelesaian memerlukan hasil triage
yang masih sesuai posisi terbaru.
Siklus QA yang sudah diselesaikan oleh QA-E2E-01 tidak diulang; rencana melanjutkan scope Run,
retest dan pengukuran yang ditunda pada [batas evidence gate Workflow](../2_WORKFLOW_AND_ROLES.md).
Child plan [QA Execution dan Release Assurance](../plans/QA_EXECUTION_RELEASE_ASSURANCE_PLAN.md)
memperinci pemisahan tugas QA/PO/Owner/Admin, Test Case berversi, coverage Acceptance Criterion,
Test Cycle, formal Bug Retest Attempt, break-glass, evidence gate, dan notifikasi lintas peran.
Kebijakan target telah disahkan pada tahap governance, tetapi enforcement runtime tetap transitional
sampai slice S1–S7 terbukti.
[Rencana remediasi UX QA end-to-end](../plans/QA_E2E_WORKFLOW_UX_REMEDIATION_PLAN.md) menindaklanjuti
audit alur terimplementasi: menghilangkan input UUID pada retest, membuat antrean capability-scoped
dan deep-linked, menyusun QA Desk secara progresif, serta menahan completion/Sign-off sampai gate
backend siap. Rencana remediasi ini tidak menetapkan policy baru.

QA assurance S1 memisahkan eksekusi normal QA dari review PO dan governance Owner/Admin. S2
menambahkan Test Case revision immutable serta coverage Acceptance Criterion. S3A menambahkan Test
Cycle dan scope Run baru yang mengikat root Feature, QA Subtask assignee, baseline readiness, Test
Case revision aktif, fingerprint kandidat, build, dan environment. S3B mewajibkan Result scoped
`passed`/`failed`/`blocked` mempunyai minimal satu evidence gambar/video yang dapat dibuka dan
menyegel snapshot provenance serta availability-nya dalam transaksi Result yang sama. S4 dan
[contextual multi-cycle retest](QA_CONTEXTUAL_MULTI_CYCLE_RETEST.md) mengikat Run retest langsung ke
Bug/Resolution Event, membuat outcome QA otomatis, serta mempertahankan evidence tiap siklus. Record
Run lama tetap `legacy/unscoped`; rollout Production tetap belum dilakukan.

## 4. Data dan Relasi

P1A menambahkan `feature_readiness_reviews`, `feature_readiness_baselines`, dan relasi eksplisit
baseline–Requirement. Review dan baseline bersifat append-only; snapshot menyimpan versi Product
Brief, definisi Requirement/AC, serta review yang menjadi acuan. Requirement tetap milik Workspace
dan Feature tetap root Task. Perubahan acuan membuat baseline terbaca usang tanpa menulis ulang
histori. Task dan Requirement yang sudah menjadi bukti baseline dilindungi dari penghapusan.

P1B menambahkan `requirement_findings`, `requirement_finding_clarifications`,
`requirement_finding_triage_positions`, `requirement_finding_triage_decisions`, dan
`requirement_finding_status_events`. Seluruh record bersifat append-only. Keputusan menyimpan ID
posisi Product–Development–QA yang menjadi dasarnya dan mengacu keputusan sebelumnya ketika
dikoreksi. Task/Requirement yang menjadi konteks temuan dilindungi dari penghapusan.

QA assurance S3A menambahkan `qa_test_cycles` dan kolom scope nullable pada `test_runs`. Run baru
selalu memerlukan scope lengkap; foreign key komposit, check constraint, dan trigger PostgreSQL
menolak candidate/build/environment/baseline/Feature/Subtask/revision yang berbeda dari Test Cycle.
Kolom nullable menjaga histori legacy dapat dibaca tanpa menyusun relasi palsu.

QA assurance S3B menambahkan `test_result_evidence_manifests`. Result scoped menyimpan manifest
awal sekali saja; setiap tautan yang ditambahkan sesudah Result final menjadi baris supplement baru
dengan alasan wajib. Trigger PostgreSQL menolak perubahan manifest tersegel. Snapshot menyimpan
item attachment/link, asal/provider, media kind, preview availability, dan ringkasan hitungannya;
attachment gambar/video dibuka melalui endpoint terautentikasi, sedangkan evidence link siap-preview
memakai preview yang telah dinormalisasi.

Contextual multi-cycle retest menambahkan provenance nullable pada `test_runs` dan stage/FK
Resolution Event pada `bug_evidence_links`. Constraint PostgreSQL memastikan satu Run dan satu
Retest Attempt per Resolution Event tanpa membatasi jumlah Resolution Event pada sebuah Bug.

## 5. API dan Shared Contract

Kontrak P1A berada pada [Feature Readiness](../../packages/contracts/src/featureReadiness.ts). API
terotentikasi menyediakan pembacaan state, penambahan review, dan pembuatan baseline melalui
`/workspaces/:workspaceId/features/:featureTaskId/readiness`. Semua hasil dibatasi Workspace dan
dihitung oleh backend.

Kontrak P1B berada pada
[Requirement Finding](../../packages/contracts/src/requirementFinding.ts). Endpoint turunan
`.../readiness/findings` membaca state, mencatat temuan/klarifikasi/posisi, keputusan tata kelola,
serta status. Konsensus dan jumlah temuan kritis terbuka dihitung backend; browser hanya menyajikan.

Kontrak Test Management mengembalikan `QaTestCycle` dan scope Run. Endpoint terautentikasi
`/workspaces/:workspaceId/qa-test-cycles` membaca cycle sesuai Workspace dan hanya mengizinkan QA
assignee membuat cycle baru dari baseline persisted Feature. Endpoint Run kemudian menerima ID cycle,
Feature, QA Subtask, revision, dan fingerprint; backend memvalidasi kesesuaian seluruh scope.
Endpoint Result mengembalikan daftar manifest untuk histori; command evidence-link pasca-Result
menerima alasan supplement dan hanya menambah manifest baru pada Result scoped.

Endpoint `.../bugs/:bugId/retest-runs` membuat Run dari konteks Bug secara idempotent; endpoint
history mengembalikan siklus bernomor yang mengelompokkan Resolution Event, evidence Developer,
Retest Attempt, Result, dan Evidence Manifest. Kontraknya berada pada
[Bug contracts](../../packages/contracts/src/bug.ts).

## 6. Authorization

Semua anggota Workspace dapat membaca kesiapan. Review hanya dapat dibuat Dev/QA yang menjadi
assignee Subtask sesuai area. Owner/Admin/PO dapat membuat baseline normal; hanya Owner/Admin dapat
membuat pengecualian dengan alasan dan batas waktu. Authorization selalu di backend; analitik
individu belum dibuka dan fitur ini tidak memberikan hak deploy.

Semua anggota aktif dapat mencatat temuan, klarifikasi, dan posisi sesuai kelompok perannya.
Keputusan saat posisi berbeda hanya Owner/Admin; resolve/reopen hanya Owner/Admin/PO. Semua aksi
memvalidasi membership, root Feature, dan scope Requirement di backend.

Resolution Event hanya dapat dibuat Developer assignee. Contextual Run dan Retest Attempt hanya
dapat dibuat QA assignee dari QA Subtask asal; PO/Owner/Admin tidak mendapat hak eksekusi tersebut.

## 7. UI dan Interaction States

Panel **Kesiapan Feature** muncul sebelum pengelolaan Requirement pada tab Requirement root Feature.
Panel memakai Card, Badge, Alert, Button, Input, Select, Textarea, dan Skeleton yang ada; menampilkan
loading, gagal/retry, belum ada baseline, baseline terkini/usang, kemampuan sesuai peran, serta aksi
disabled melalui submission state. Copy memakai bahasa Indonesia alami dengan istilah domain yang
tetap konsisten.

Panel **Temuan Requirement** berada pada tab dan konteks yang sama tanpa menambah tab tingkat atas.
Panel memakai komponen Atomic Design yang ada serta disclosure native untuk detail; mendukung
loading, kosong, gagal/retry, formulir temuan, perbedaan posisi, hasil usang, aksi sesuai izin,
submission disabled, temuan selesai, dan peringatan kritis yang menjelaskan mode observasi.

Pada **QA Testing Desk**, QA assignee membuat atau memilih Test Cycle sebelum memulai Run. Dialog
cycle meminta fingerprint kandidat, build, dan environment; Run menggunakan konteks itu bersama
revision aktif. PO/Owner/Admin tetap dapat membaca histori tetapi tidak memperoleh kontrol cycle,
Run, Result, atau Bug execution.

Dialog Result menolak pengiriman `passed`/`failed`/`blocked` tanpa evidence dan mewajibkan alasan
untuk `skipped`. Kartu histori menunjukkan jumlah manifest tersegel; file evidence membuka endpoint
download terautentikasi dan evidence link memakai preview/modal yang sudah tersedia. Penambahan
tautan bukti meminta alasan supplement secara eksplisit.

Pada panel Bug, Developer mengirim kandidat, catatan, dan evidence perbaikan dalam satu dialog. QA
memilih **Mulai Retest** tanpa memasukkan UUID dan diarahkan ke QA Subtask asal. Riwayat menampilkan
Temuan awal serta Siklus perbaikan #1..n; QaTestingDesk memfinalkan outcome Bug setelah Result
contextual tersimpan dan menyediakan aksi pemulihan bila finalisasi sempat gagal.

## 8. Pengujian dan Evidence

P1A diverifikasi melalui kontrak, API/PostgreSQL, komponen frontend, migrasi bersih, regresi penuh,
build, dan pemeriksaan dokumentasi. Evidence lengkap dicatat pada
[laporan P1A](../reports/SDLC_P1A_FEATURE_READINESS_BASELINE_2026-09-13.md).
Evidence P1B mencakup kontrak, migrasi PostgreSQL bersih/upgrade, isolasi Workspace, RBAC,
immutability, konsensus/koreksi/sengketa, guard penghapusan, komponen frontend, regresi, build, dan
visual; hasil lengkap dicatat pada
[laporan P1B](../reports/SDLC_P1B_REQUIREMENT_FINDING_TRIAGE_2026-09-13.md).
Preflight P1C juga membuktikan reassignment Subtask QA tersimpan bersama Activity/notifikasi,
login akun QA baru berhasil, dan endpoint readiness mengembalikan capability submit review QA.
Review QA `ready` berikutnya dibuat melalui API Production menggunakan isi yang disetujui pengguna
dan kembali terbaca sebagai review QA terbaru. Review Developer dan baseline belum dibuat.

Evidence contextual multi-cycle retest mencakup clean migration PostgreSQL, kontrak, API integration
dua siklus (`reopened` lalu `verified`), idempotensi Run, UI tanpa UUID, finalisasi otomatis, serta
histori evidence yang tidak tertimpa. Hasil terperinci dicatat pada
[laporan implementasi S1](../reports/QA_E2E_S1_CONTEXTUAL_MULTI_CYCLE_RETEST_2026-09-16.md).

## 9. Release dan Readiness

P1A/P1B sudah tersedia di Production hanya sebagai pencatatan observasi dan tidak mengubah gate
Subtask atau release readiness yang aktif. Task selesai, QA sign-off, keputusan PO, deployment, dan
verifikasi Production tetap berbeda. Operasi Production berikutnya tetap mengikuti
[runbook aktif](../DEPLOYMENT_AND_ENVIRONMENTS.md).

## 10. Traceability

[Permintaan/rencana](../plans/SDLC_QUALITY_AND_RELEASE_PLAN.md) →
[child plan QA assurance](../plans/QA_EXECUTION_RELEASE_ASSURANCE_PLAN.md) →
[plan remediasi UX QA](../plans/QA_E2E_WORKFLOW_UX_REMEDIATION_PLAN.md) →
[feature contextual multi-cycle retest](QA_CONTEXTUAL_MULTI_CYCLE_RETEST.md) →
[audit/keputusan P0](../plans/SDLC_P0_DECISION_AND_DATA_AUDIT.md) → AC usulan P0–P6 →
[TODO](../../TODO.md) → [kontrak P1A](../../packages/contracts/src/featureReadiness.ts) dan
[kontrak P1B](../../packages/contracts/src/requirementFinding.ts) → API/UI P1A/P1B →
[laporan P1A](../reports/SDLC_P1A_FEATURE_READINESS_BASELINE_2026-09-13.md) serta
[laporan P1B](../reports/SDLC_P1B_REQUIREMENT_FINDING_TRIAGE_2026-09-13.md).
Tautan Task, Result, Bug dan keputusan rilis persisten baru hanya diisi setelah benar-benar dibuat;
tidak ada ID, evidence, atau deployment yang direkayasa.
