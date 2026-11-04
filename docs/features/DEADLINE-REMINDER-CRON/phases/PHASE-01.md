# DEADLINE-REMINDER-CRON — Tahap 4: Build Phase 01 — Pengingat terjadwal

**Status:** Kandidat teruji
**Breakdown:** [../breakdown.md](../breakdown.md)
**AC phase ini:** AC-1 – AC-8 (AC-8 setelah deploy)
**Applicable Policy IDs:** AI-009, AI-013, AI-014, AUTH-012

## 1. Approval Window

| Item                             | Isi                                                                                                                                                        |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task ID                          | DEADLINE-REMINDER-CRON P1                                                                                                                                  |
| Branch / baseline commit         | `feat/deadline-reminder-cron` @ `8c0e4a3`                                                                                                                  |
| File/path yang diizinkan         | Task P1-BE-1 … P1-OPS-1 di [breakdown.md](../breakdown.md), Feature folder ini, `TODO.md`, `docs/features/FEATURE_CATALOG.md`, `quality/doc-baseline.json` |
| Urutan aksi yang diizinkan       | edit → test → validate → commit → Owner push branch → PR (Tier 2) → Owner memberi label dan memutuskan merge                                               |
| Pemeriksaan yang akan dijalankan | Integration test PostgreSQL (cron + notifications + seluruh suite API), test web, `npm run validate`, `sdlc:check`, `quality:check`                        |
| Risiko & recovery                | Revert PR mengembalikan pemicu browser; `cron.unschedule` menghentikan job                                                                                 |
| Masa berlaku                     | Sampai PR dibuat; tidak ada merge, secret, atau perubahan Production oleh agent                                                                            |
| Disetujui                        | reyand (Owner), 2026-11-04, chat: opsi A Supabase Cron + "Setuju, kerjakan"                                                                                |

## 2. Log perubahan

| Task     | File berubah                                                                                                         | Ringkasan                                                                                                                               | Commit                        |
| -------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| P1-BE-1  | `modules/cron/cronAuth.ts`, `modules/cron/cronRoutes.ts`, `app.ts`, `config/env.ts`                                  | Route terjadwal ber-secret, dipasang sebelum pemeriksaan origin; `CRON_SECRET` opsional ≥ 32 karakter                                   | `feat/deadline-reminder-cron` |
| P1-BE-2  | `modules/notifications/notificationService.ts`, `services/fcmService.ts`                                             | Jendela H-7…H+1, tanpa `done`/`canceled`/Workspace arsip, `idempotency_key` harian, `persistNotification`, lanjut bila satu baris gagal | `feat/deadline-reminder-cron` |
| P1-BE-3  | `modules/notifications/notificationRoutes.ts`, `notificationController.ts`                                           | Pemicu manual wajib membership owner/admin; scope = Workspace yang diverifikasi                                                         | `feat/deadline-reminder-cron` |
| P1-FE-1  | `features/notifications/hooks/useNotifications.ts`, `store/uiSlice.ts`, `lib/api/notificationService.ts`             | Pemicu browser, thunk, dan client API dihapus                                                                                           | `feat/deadline-reminder-cron` |
| P1-OPS-1 | `docs/DEPLOYMENT_AND_ENVIRONMENTS.md`, ADR-040, `docs/1_ARCHITECTURE.md`, `docs/POLICY_REGISTRY.md`, `.env*.example` | Runbook Supabase Cron, kebijakan `AUTH-012`                                                                                             | `feat/deadline-reminder-cron` |

## 3. Pemeriksaan yang dijalankan

Hasil lengkap di [testing.md](../testing.md) §2.

## 4. Deviasi dari rencana

| Deviasi                                                                                                         | Alasan                                                                                                                       | Masih dalam scope? | Persetujuan baru? |
| --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------ | ----------------- |
| `persistNotification` memakai INSERT + baca ulang, bukan `findOrCreate`                                         | Review terpisah: `findOrCreate` menunggu koneksi kedua di pool satu koneksi Production saat kunci bertabrakan                | Ya                 | Tidak             |
| Task `canceled` dan Workspace arsip tidak diingatkan                                                            | Mengikuti konvensi status tertutup (`taskAssignment.ts`) dan Workspace arsip yang sudah ada                                  | Ya                 | Tidak             |
| Satu test lama memakai kunci idempotensi untuk baris "Existing alert"; satu assert hitungan diganti bukti baris | Run terjadwal dari file test lain (paralel, database sama) dapat lebih dulu membuat pengingat; perilaku produk tidak berubah | Ya                 | Tidak             |

## 5. Hasil

- PR: dibuat Owner dari branch `feat/deadline-reminder-cron` — Tier 2 — file Tier 2 yang cocok:
  `apps/api/src/app.ts`, `apps/api/src/config/env.ts`, `.env.example`, `.env.production.example`,
  `docs/1_ARCHITECTURE.md`, `docs/POLICY_REGISTRY.md`, `docs/adr/**`,
  `docs/DEPLOYMENT_AND_ENVIRONMENTS.md`, `quality/doc-baseline.json`.
- Lanjut ke [testing.md](../testing.md) untuk tahap 5.
