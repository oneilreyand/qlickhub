# DEADLINE-REMINDER-CRON — Tahap 6: Release & Close

**Status:** Belum mulai
**Gerbang:** G6 — keputusan rilis oleh PO; label `owner-approved` oleh Owner untuk Tier 2
**Applicable Policy IDs:** AI-013, AI-020, RELEASE-001, RELEASE-002, DOC-003, AUTH-012

## 1. Merge dan deploy

Urutan wajib, karena merge langsung men-deploy Production dan menghapus pemicu browser:

1. Pastikan Supabase Cron/pg_net tersedia di project Production (Integrations → Cron). Bila tidak
   tersedia, jangan merge; kembali ke G1 (opsi C di ADR scheduler).
2. Set `CRON_SECRET` di Vercel Production **sebelum** merge.
3. Beri label `owner-approved`, merge, tunggu deploy selesai.
4. Jalankan runbook Supabase Cron di [Deployment §4](../../DEPLOYMENT_AND_ENVIRONMENTS.md) segera
   setelah deploy, termasuk satu pemanggilan manual.

| Phase | PR           | Tier | File Tier 2                             | Merge commit | Memicu deploy Production? | Deployment ID / waktu |
| ----- | ------------ | ---- | --------------------------------------- | ------------ | ------------------------- | --------------------- |
| P1    | belum dibuat | 2    | lihat [PHASE-01](phases/PHASE-01.md) §5 | —            | ya                        | —                     |

## 2. Verifikasi di environment target

| AC   | Environment | Observasi / perintah                                                                              | Level | Hasil |
| ---- | ----------- | ------------------------------------------------------------------------------------------------- | ----- | ----- |
| AC-8 | Production  | Pemanggilan manual → `net._http_response.status_code = 200`; log Vercel `cron.deadline_reminders` | E4    | —     |
| AC-8 | Production  | Run terjadwal berikutnya tercatat di `cron.job_run_details` dengan status `succeeded`             | E4    | —     |
| AC-7 | Production  | Network browser Admin/Owner tidak lagi memanggil `/v1/notifications/check-deadlines`              | E4    | —     |

## 3. QA sign-off dan keputusan rilis

| Item               | Isi                                                                     |
| ------------------ | ----------------------------------------------------------------------- |
| QA sign-off        | Belum                                                                   |
| Keputusan rilis PO | Belum                                                                   |
| Gap yang diterima  | Belum ada                                                               |
| Rollback plan      | `cron.unschedule('qlickhub-deadline-reminders')` lalu revert PR (Owner) |

## 4. Metrik sukses (dari problem.md)

| Metrik                                     | Baseline                         | Target     | Hasil setelah rilis | Kapan diukur ulang           |
| ------------------------------------------ | -------------------------------- | ---------- | ------------------- | ---------------------------- |
| Pemindaian deadline dipicu browser         | ±1 per menit per tab Admin/Owner | 0          | —                   | Hari rilis                   |
| Pemindaian terjadwal                       | Tidak ada                        | 1 per hari | —                   | 3 hari setelah rilis         |
| Pengingat ganda per task × penerima × hari | Dibatasi jeda 20 jam             | 0          | —                   | 3 hari setelah rilis (query) |

## 5. Checklist penutupan

- [ ] Report di `docs/reports/` memakai `AGENT_REPORT_TEMPLATE.md`
- [ ] Stage Tracker di [README.md](README.md) diperbarui
- [ ] `docs/features/FEATURE_CATALOG.md` diperbarui
- [ ] SSoT/ADR terdampak sudah sesuai implementasi
- [ ] `TODO.md` → Done dan dipindah ke arsip
- [ ] Follow-up/Bug tertaut, tidak dibiarkan di catatan bebas
