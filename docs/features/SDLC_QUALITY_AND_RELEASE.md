# SDLC-QUALITY-RELEASE — Kualitas Delivery dan Paket Rilis

**Status:** Active — P1A/P1B selesai lokal; preflight P1C Essensial blocked; P2–P6 belum aktif
**Owner:** Product dan Engineering; QA sebagai pemangku kepentingan
**Last reviewed:** 2026-09-13
**Applicable Policy IDs:** `DOMAIN-002`, `DOMAIN-003`, `DOMAIN-004`, `AUTH-001`, `AUTH-002`, `FLOW-002`, `FLOW-005`, `FLOW-006`, `QA-001`, `QA-002`, `QA-003`, `QA-004`, `QA-005`, `RELEASE-001`, `RELEASE-002`, `DATA-001`, `DATA-002`, `DATA-004`, `DATA-005`, `CONTRACT-001`, `UI-001`, `UI-002`, `TEST-001`, `DOC-002`, `DOC-003`, `DOC-004`

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

Preflight pilot empat minggu memilih Workspace development `essensial` dan menerapkan migrasi
additive 67–69. Pilot belum menghasilkan jendela observasi yang sah karena belum ada anggota atau
Subtask QA. Baseline awal dan remediasi dicatat pada
[laporan kickoff P1C](../reports/SDLC_P1C_ESSENSIAL_OBSERVATION_PILOT_KICKOFF_2026-09-13.md).

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

## 5. API dan Shared Contract

Kontrak P1A berada pada [Feature Readiness](../../packages/contracts/src/featureReadiness.ts). API
terotentikasi menyediakan pembacaan state, penambahan review, dan pembuatan baseline melalui
`/workspaces/:workspaceId/features/:featureTaskId/readiness`. Semua hasil dibatasi Workspace dan
dihitung oleh backend.

Kontrak P1B berada pada
[Requirement Finding](../../packages/contracts/src/requirementFinding.ts). Endpoint turunan
`.../readiness/findings` membaca state, mencatat temuan/klarifikasi/posisi, keputusan tata kelola,
serta status. Konsensus dan jumlah temuan kritis terbuka dihitung backend; browser hanya menyajikan.

## 6. Authorization

Semua anggota Workspace dapat membaca kesiapan. Review hanya dapat dibuat Dev/QA yang menjadi
assignee Subtask sesuai area. Owner/Admin/PO dapat membuat baseline normal; hanya Owner/Admin dapat
membuat pengecualian dengan alasan dan batas waktu. Authorization selalu di backend; analitik
individu belum dibuka dan fitur ini tidak memberikan hak deploy.

Semua anggota aktif dapat mencatat temuan, klarifikasi, dan posisi sesuai kelompok perannya.
Keputusan saat posisi berbeda hanya Owner/Admin; resolve/reopen hanya Owner/Admin/PO. Semua aksi
memvalidasi membership, root Feature, dan scope Requirement di backend.

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

## 8. Pengujian dan Evidence

P1A diverifikasi melalui kontrak, API/PostgreSQL, komponen frontend, migrasi bersih, regresi penuh,
build, dan pemeriksaan dokumentasi. Evidence lengkap dicatat pada
[laporan P1A](../reports/SDLC_P1A_FEATURE_READINESS_BASELINE_2026-09-13.md).
Evidence P1B mencakup kontrak, migrasi PostgreSQL bersih/upgrade, isolasi Workspace, RBAC,
immutability, konsensus/koreksi/sengketa, guard penghapusan, komponen frontend, regresi, build, dan
visual; hasil lengkap dicatat pada
[laporan P1B](../reports/SDLC_P1B_REQUIREMENT_FINDING_TRIAGE_2026-09-13.md).

## 9. Release dan Readiness

P1A/P1B hanya pencatatan observasi dan tidak mengubah gate Subtask atau release readiness yang aktif.
Task selesai, QA sign-off, keputusan PO, deployment, dan verifikasi Production tetap berbeda.
Perubahan ini belum dideploy atau dimigrasikan ke Production; operasi Production mengikuti
[runbook aktif](../DEPLOYMENT_AND_ENVIRONMENTS.md).

## 10. Traceability

[Permintaan/rencana](../plans/SDLC_QUALITY_AND_RELEASE_PLAN.md) →
[audit/keputusan P0](../plans/SDLC_P0_DECISION_AND_DATA_AUDIT.md) → AC usulan P0–P6 →
[TODO](../../TODO.md) → [kontrak P1A](../../packages/contracts/src/featureReadiness.ts) dan
[kontrak P1B](../../packages/contracts/src/requirementFinding.ts) → API/UI P1A/P1B →
[laporan P1A](../reports/SDLC_P1A_FEATURE_READINESS_BASELINE_2026-09-13.md) serta
[laporan P1B](../reports/SDLC_P1B_REQUIREMENT_FINDING_TRIAGE_2026-09-13.md).
Tautan Task, Result, Bug dan keputusan rilis persisten baru hanya diisi setelah benar-benar dibuat;
tidak ada ID, evidence, atau deployment yang direkayasa.
