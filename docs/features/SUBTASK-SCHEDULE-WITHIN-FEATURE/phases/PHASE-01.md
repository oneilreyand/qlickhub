# SUBTASK-SCHEDULE-WITHIN-FEATURE — Tahap 4: Phase 01

**Status:** Selesai
**Breakdown:** [../breakdown.md](../breakdown.md)
**AC phase:** AC-F1.1–AC-F1.12
**Applicable Policy IDs:** AI-009, AI-013, SDLC-001, TEST-001, DOMAIN-005

## 1. Approval Window

Owner `ok`, 2026-11-07, menyetujui G0–G3/K1/L1/L2, ADR/SSoT dahulu, lalu build/test lokal.
Branch `codex/f1-subtask-schedule-plan`, baseline `a717ba7` (origin/main dari fetch awal).
Path mengikuti breakdown §3–5 plus caller/presenter F1 yang ditemukan dan dicatat di breakdown.
WRA 6/16: requirement 0, lapisan 2, data 0, authorization 0, contract 1, ketersinggungan 1,
validasi 2, eksternal 0. Masa berlaku sampai kandidat dan laporan atau stop condition.
Tidak mengotorisasi commit/push/PR/merge/deploy, F2–F4, secret/dependency atau mutasi Production.

## 2. Log perubahan

| Task     | Kandidat lokal                                                                                | Commit       |
| -------- | --------------------------------------------------------------------------------------------- | ------------ |
| F1-DOC-1 | ADR-042 Accepted, DOMAIN-005 SSoT, K1 dan pilihan legacy/reopen tercatat                      | Belum dibuat |
| F1-BE-1  | Root lock, guard shared di lifecycle dan Plan sync, metadata backend batch, error code khusus | Belum dibuat |
| F1-FE-1  | Range hint/min/max, error inline, input tetap, context refresh setelah parent berubah         | Belum dibuat |
| F1-FE-2  | Badge legacy server di summary dan accordion; tanpa hitung bisnis di React                    | Belum dibuat |
| F1-QA-1  | PostgreSQL/API, concurrency, UI component dan E2E enam viewport/tema, query evidence          | Belum dibuat |

## 3. Pemeriksaan

Hasil lengkap perintah, pass/fail/skip, scope dan gap ada pada [testing.md](../testing.md)
dan [laporan Phase 1](../../../reports/SUBTASK_SCHEDULE_WITHIN_FEATURE_P1_2026-11-07.md).
Bukti lokal tidak disebut sebagai hasil Production atau independent acceptance.

## 4. Temuan dan koreksi

Browser membuktikan 409 jadwal semula dianggap konflik versi sehingga Plan reload dan draf hilang.
Kode error range bersama, pemetaan detail API dan caller Plan diperbaiki tanpa mengubah error lain.
Stale parent pada form child ditangani dengan refresh context GET, bukan mengganti input pengguna.
Race root shrink vs child creation/update dibuktikan dengan lock barrier PostgreSQL.

## 5. Hasil

Build dan G5 lokal Accepted oleh verifier Standards/Spec pada 2026-11-07. Window awal di atas
adalah histori; instruksi lanjutan Owner `ok kerjakan` mengotorisasi review/perbaikan/validasi dan
persiapan PR. Merge Tier 2 dan verifikasi target masih menunggu, sehingga Feature belum Done.
ADR/SSoT membuat diff Tier 2 (lihat daftar aktual di laporan); agent tidak mengubah label Owner.

## 6. Lanjutan G5

Atomic Save kini mengirim folder/tanggal pada satu update transaksional. Metadata backend
jadwal ditambahkan ke respons claim/release/reassign lewat helper shared. Dua temuan independen
sudah resolved dengan regresi baru; API 671/671, frontend 838/838, E2E 6/6 dan validate/build lulus.
Path tambahan F1: `tasks/internal/taskAssignment.ts` dan tes `TaskDetailDrawer.test.tsx`.
Tidak ada perubahan izin, skema atau F2–F4. [Laporan G5](../../../reports/SUBTASK_SCHEDULE_WITHIN_FEATURE_G5_2026-11-07.md).
