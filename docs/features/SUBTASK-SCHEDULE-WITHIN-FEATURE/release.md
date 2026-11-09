# SUBTASK-SCHEDULE-WITHIN-FEATURE — Tahap 6: Release & Close

**Status:** Menunggu persetujuan
**Gerbang:** G6 — Owner label Tier 2 dan verifikasi target belum selesai
**Applicable Policy IDs:** AI-013, AI-020, RELEASE-001, TEST-001, DOC-003

## Kesiapan kandidat

G5 lokal Accepted oleh verifier Standards dan Spec, 2026-11-07. Owner `ok kerjakan` melanjutkan
review/perbaikan/validasi dan persiapan commit/push/PR pada branch
`codex/f1-subtask-schedule-plan`, baseline a717ba76. Scope dan masa berlaku window ada pada
[breakdown](breakdown.md#window-lanjutan-g5--2026-11-07).

[PR #112](https://github.com/oneilreyand/qlickhub/pull/112) dibuat dari commit `98cd8f87`;
auto-merge squash sudah aktif. Amendemen hanya lifecycle test F1 sudah lulus E2E penuh lokal
45 pass/0 fail/1 skip lama; verifier independen Accepted pada 2026-11-09. CI verify awal lulus,
sedangkan CI E2E awal gagal karena koneksi fixture ditutup suite sebelumnya; CI amendemen
akan dijalankan setelah push.
PR wajib memakai tiered auto-merge squash (AI-020). Kandidat ini **Tier 2**, karena lima path:

- `docs/1_ARCHITECTURE.md`
- `docs/2_WORKFLOW_AND_ROLES.md`
- `docs/POLICY_REGISTRY.md`
- `docs/adr/README.md`
- `docs/adr/ADR-042-SUBTASK-SCHEDULE-WITHIN-FEATURE.md`

Owner memasang `owner-approved` pada diff final; agent tidak memasang atau mencopot label.
Main auto-deploy Production lewat Git integration. Tidak ada deploy manual atau mutasi data
Production pada tahap G5/persiapan PR. Tidak ada migrasi baru/backfill.

## Bukti target sebelum merge

Health Production read-only pada 2026-11-07 melaporkan service/database `ok`/`connected`,
80 migrasi applied, latest `20261105000096-add-notification-bug-id.cjs`, sesuai canonical tree.
Ini hanya audit kesiapan migrasi pada versi yang sedang live, bukan bukti F1 sudah dirilis.
CI tetap memeriksa gate migrasi (ADR-039).

## Rollout dan recovery

1. Commit/push kandidat teruji, buat PR ke main dan aktifkan auto-merge squash.
2. CI verify dan owner-gate wajib lulus; Owner label melekat pada diff final.
3. Setelah merge berlabel Owner, pantau Vercel Git integration dan catat commit/deployment ID.
4. Periksa root/login, API health/migration status serta penolakan akses tanpa sesi.
5. Smoke F1 terautentikasi hanya pada record validasi yang disetujui di target: root shrink
   409 tanpa side effect; child range 400; perubahan valid tersimpan; legacy flag tetap tampil.
   Tidak membuat record atau mengambil sesi Production tanpa otoritas/capability yang sesuai.
6. Rollback kode memakai deployment Ready sebelumnya atau PR revert melalui gate yang sama;
   tidak ada schema undo karena F1 tidak membawa migrasi. Target deployment sebelumnya harus
   dicatat sebelum promosi; ID belum diperoleh dan tidak direka.

## Checklist penutupan

- [x] Semua AC lokal mempunyai bukti dan dua review independen diterima.
- [x] Tidak ada migrasi baru; health target melaporkan 80 migrasi canonical.
- [ ] CI remote, Preview dan label Owner pada PR final.
- [ ] Deployment F1 Ready dengan source commit dan recovery ID tercatat.
- [ ] Smoke terautentikasi target, QA evidence dan keputusan rilis yang berlaku.
- [ ] G6 diterima dan TODO diarsipkan setelah bukti target cukup.

[Testing](testing.md), [laporan G5](../../reports/SUBTASK_SCHEDULE_WITHIN_FEATURE_G5_2026-11-07.md).
Feature tetap In progress; G5 lokal bukan klaim Production/UAT atau Test Result tersegel.
