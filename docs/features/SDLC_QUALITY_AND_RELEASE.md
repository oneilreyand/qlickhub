# SDLC-QUALITY-RELEASE — Kualitas Delivery dan Paket Rilis

**Status:** Draft
**Owner:** Product dan Engineering — pengesahan keputusan bersama QA masih diperlukan
**Last reviewed:** 2026-09-12
**Applicable Policy IDs:** `DOMAIN-002`, `DOMAIN-003`, `DOMAIN-004`, `AUTH-001`, `AUTH-002`, `FLOW-002`, `QA-001`, `QA-002`, `QA-003`, `QA-004`, `RELEASE-001`, `RELEASE-002`, `DATA-001`, `DATA-002`, `DATA-004`, `CONTRACT-001`, `UI-001`, `UI-002`, `TEST-001`, `DOC-002`, `DOC-003`, `DOC-004`

Card ini menghubungkan rencana lintas lapisan, bukan menetapkan kebijakan baru. Sumber detail usulan
adalah [rencana SDLC](../plans/SDLC_QUALITY_AND_RELEASE_PLAN.md). Tidak ada workflow baru yang aktif.

## 1. Tujuan dan Pengguna

Product, Dev, QA dan pengelola membutuhkan ketertelusuran kesiapan kebutuhan, pengerjaan ulang,
kualitas pengujian dan rilis aktual. Hasil dan pengecualian cakupan ada pada rencana §1.

## 2. Requirement dan Acceptance Criteria

Kriteria penerimaan yang diusulkan terdaftar per slice P0–P6 pada rencana §6. Belum ada Requirement
atau AC baru yang dibuat pada database; identitas dan tautan persisten ditambahkan saat planning
produk melalui interface terotentikasi. Keputusan K1–K10 pada §4 belum disahkan.

## 3. Alur Lintas Peran

Alur target ada pada rencana §5. Batas peran aktif tetap mengikuti [Workflow](../2_WORKFLOW_AND_ROLES.md).
Siklus QA yang sudah diselesaikan oleh QA-E2E-01 tidak diulang; rencana melanjutkan scope Run,
retest dan pengukuran yang ditunda pada [batas evidence gate Workflow](../2_WORKFLOW_AND_ROLES.md).

## 4. Data dan Relasi

Rencana §5 memuat konsep baseline, temuan, putaran, scope QA, paket dan deployment; §9 membahas
migrasi additive, legacy, audit, dan perlindungan penghapusan. Requirement tetap milik Workspace
dan Feature tetap root Task. Tidak ada perubahan database pada pekerjaan dokumentasi ini.

## 5. API dan Shared Contract

Kontrak saat ini: [Requirement](../../packages/contracts/src/requirement.ts),
[Activity](../../packages/contracts/src/activity.ts), [Test Management](../../packages/contracts/src/testManagement.ts),
[Bug](../../packages/contracts/src/bug.ts), [Release Decision](../../packages/contracts/src/releaseDecision.ts).
Kontrak endpoint baru belum aktif; peta perubahan ada pada rencana §8, ditetapkan per slice setelah keputusan.

## 6. Authorization

Rencana §9 dan K1/K2/K4/K6/K10 memisahkan batas yang berlaku dari hak baru yang perlu disetujui.
Authorization selalu di backend; analitik individu belum dibuka, rencana tidak memberikan hak deploy.

## 7. UI dan Interaction States

Rencana §8 memakai Task detail, My Tasks, Report dan komponen Gallery yang ada. Lokasi UI paket
rilis ditentukan pada P4. Semua state async/perizinan, keyboard, light/dark dan desktop/mobile
mengikuti [UI SSoT](../3_UI_ATOMIC_DESIGN_SYSTEM.md), dengan bahasa Indonesia alami.

## 8. Pengujian dan Evidence

Rencana §10 menentukan uji kontrak, PostgreSQL, concurrency, UI dan UAT. Belum ada pengujian
implementasi workflow baru; hasil pemeriksaan dokumentasi dicatat dalam
[laporan](../reports/SDLC_QUALITY_RELEASE_PLAN_2026-09-12.md).

## 9. Release dan Readiness

P3 mendahului gate bukti dan P4. Task selesai, QA sign-off, keputusan PO, deployment dan verifikasi
Production tetap berbeda. Kebijakan invalidasi, pengecualian dan data legacy memerlukan pengesahan;
operasi Production mengikuti [runbook aktif](../DEPLOYMENT_AND_ENVIRONMENTS.md).

## 10. Traceability

[Permintaan/rencana](../plans/SDLC_QUALITY_AND_RELEASE_PLAN.md) → AC usulan P0–P6 →
[TODO dokumentasi](../../TODO.md) → kontrak/code yang akan diubah pada §8 → pengujian yang direncanakan
pada §10 → [laporan dokumentasi](../reports/SDLC_QUALITY_RELEASE_PLAN_2026-09-12.md).
Tautan Task, Result, Bug dan keputusan rilis persisten baru hanya diisi setelah benar-benar dibuat;
tidak ada ID, evidence, atau deployment yang direkayasa.
