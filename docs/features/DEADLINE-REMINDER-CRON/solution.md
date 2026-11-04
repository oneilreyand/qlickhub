# DEADLINE-REMINDER-CRON — Tahap 1: Opsi Solusi (Decision Snapshot)

**Status:** Disetujui
**Gerbang:** G1 — disetujui oleh Owner
**Problem:** [problem.md](problem.md)
**ADR:** [ADR-040](../../adr/ADR-040-SCHEDULED-JOBS-VIA-SUPABASE-CRON.md)
**Applicable Policy IDs:** AI-006, SDLC-001, AUTH-012

Format mengikuti Decision Snapshot di `docs/4_AGENT_DEV_GUIDELINES.md` §2A.E; dokumen ini tidak
mengubah aturan tersebut.

## 1. Kondisi sekarang

- `useNotifications.ts` memanggil `checkApproachingDeadlinesThunk` untuk Admin/Owner dengan jeda 1
  menit per Workspace (dan sekali tanpa Workspace).
- `POST /v1/notifications/check-deadlines` (`notificationRoutes.ts`) memeriksa role global
  `admin`/`owner` saja, lalu memindai task `dueDate <= besok`, `status != 'done'`.
- Tabel `notifications` sudah memiliki `idempotency_key` dengan unique index parsial
  (`20260915000078-add-notification-idempotency-key.cjs`), dipakai outbox notifikasi.
- Route yang mengubah state dilindungi `enforceTrustedOrigin` (`http/middleware/origin.ts`), yang
  menolak request tanpa Origin di Production.
- Tidak ada scheduler di repo maupun Production (`vercel.json` tanpa `crons`, tidak ada workflow
  `schedule`).

## 2. Opsi

|                              | Opsi A: Supabase Cron + pg_net                                     | Opsi B: GitHub Actions `schedule`                         | Opsi C: lease tanpa scheduler                       | Opsi 0: tidak dikerjakan |
| ---------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------- | --------------------------------------------------- | ------------------------ |
| Ringkasan                    | `pg_cron` di DB Production memanggil endpoint ber-secret           | Workflow terjadwal memanggil endpoint ber-secret          | Request login memicu scan maksimal 1×/jam via lease | Biarkan seperti sekarang |
| Pro                          | Infra yang sudah dipakai; presisi per menit; bisa dipakai ulang S6 | Tercatat di repo; log Actions                             | Tanpa setup eksternal dan secret                    | —                        |
| Kontra                       | Setup manual Owner; pg_net tanpa retry; log respons ±6 jam         | Min 5 menit, bisa tertunda/drop; nonaktif setelah 60 hari | Butuh migrasi; tidak jalan saat aplikasi sepi       | Masalah tetap            |
| Lapisan terdampak (FE/BE/DB) | FE (hapus pemicu), BE, konfigurasi DB Production                   | FE, BE, `.github`                                         | FE, BE, DB (migrasi)                                | —                        |
| Data / migrasi               | Tidak ada migrasi                                                  | Tidak ada                                                 | Additive (tabel lease)                              | —                        |
| Authorization                | Batas baru: bearer secret mesin (`AUTH-012`)                       | Sama                                                      | Tidak ada batas baru                                | —                        |
| Shared contract              | Endpoint baru, tanpa perubahan `@qlick/contracts`                  | Sama                                                      | Tidak ada endpoint baru                             | —                        |
| Estimasi WRA                 | 8/16                                                               | 8/16                                                      | 7/16                                                | —                        |
| Risiko & rollback            | `cron.unschedule`; revert PR mengembalikan pemicu browser          | Nonaktifkan workflow                                      | Revert + down migration                             | —                        |

Vercel Cron juga dinilai, tetapi ditolak Owner ("buat plan yang tidak menggunakan vercel").
Opsi SQL murni di `pg_cron` ditolak karena memindahkan aturan bisnis ke SQL dan tidak mengirim push.

## 3. Rekomendasi

Opsi A: pengingat tidak lagi bergantung pada pengguna online (metrik "pemindaian terjadwal"), tidak
ada pemindaian dari browser, dan job idempoten menahan pengiriman ganda dari scheduler.

## 4. Dampak policy

- [ ] Tidak mengubah policy → tidak perlu ADR
- [x] Mengubah policy → [ADR-040](../../adr/ADR-040-SCHEDULED-JOBS-VIA-SUPABASE-CRON.md) dibuat
      sebelum tahap 2, `docs/1_ARCHITECTURE.md` §5 dan `docs/POLICY_REGISTRY.md` (`AUTH-012`)
      diperbarui (`DOC-002`).

## 5. Keputusan

**Dipilih:** Opsi A — oleh reyand (Owner), 2026-11-04, chat ("A. Supabase Cron (Rekomendasi)").
Aturan pengingat dipilih di chat yang sama: jatuh tempo hari ini/besok plus overdue maksimal 7 hari.

**Ditolak:** Vercel Cron (keputusan Owner); B (presisi dan risiko nonaktif otomatis); C (cadangan bila
Supabase Cron tidak tersedia); SQL murni (aturan bisnis di SQL, tanpa push).
