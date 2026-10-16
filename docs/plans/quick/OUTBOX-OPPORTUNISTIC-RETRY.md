# QUICK — OUTBOX-OPPORTUNISTIC-RETRY Retry outbox notifikasi saat user aktif

**Status:** Disetujui
**WRA:** 4/16 — lapisan 1 (route + modul baru), data 1 (status outbox diperbarui), ketersinggungan 1 (route notifikasi), validasi 1

Status yang diizinkan: Draft, Menunggu persetujuan, Disetujui, Selesai, Blocked.

## Problem

- Gejala: notifikasi yang gagal dijadwalkan ulang (backoff, maks. 8 percobaan) tetapi tidak ada yang
  menjalankan retry di Production; hanya mutasi Bug yang kebetulan memanggil `dispatchDue(50)`.
- Bukti: `vercel.json` tanpa cron; `apps/api/src/jobs/notificationOutboxWorker.ts` hanya CLI;
  pemanggil `dispatchDue` hanya di `bugService.ts` (main `86705df`). TODO S6: "scheduler retry Production
  belum dikonfigurasi". Temuan audit F3.
- Keputusan Owner 2026-10-16: retry dipicu aktivitas user, tanpa infrastruktur baru.

## Perubahan

- File/path: `apps/api/src/modules/notifications/opportunisticOutboxDispatch.ts` (baru),
  `notificationRoutes.ts` (`GET /notifications`), test baru, `docs/DEPLOYMENT_AND_ENVIRONMENTS.md` §8,
  Quick Card ini.
- Perilaku: `GET /v1/notifications` memicu maks. satu batch `dispatchDue(50)` per 60 detik per instance,
  tidak tumpang-tindih, request menunggu paling lama 1,5 detik, error dispatch tidak menggagalkan request.
  Nonaktif di `NODE_ENV=test` kecuali diaktifkan eksplisit.
- Bukan scope: scheduler eksternal, perubahan backoff/dead letter, perubahan skema.

## Acceptance Criteria → bukti

| AC                                                                     | Bukti yang dibutuhkan (E-level) | Perintah / observasi                               |
| ---------------------------------------------------------------------- | ------------------------------- | -------------------------------------------------- |
| AC-1 Baris outbox `failed` yang jatuh tempo terkirim saat user polling | E3                              | `opportunisticOutboxDispatch.test.ts` (PostgreSQL) |
| AC-2 Maks. satu batch per interval, tanpa overlap                      | E2                              | test yang sama                                     |
| AC-3 Error dispatch tidak menggagalkan request; batas tunggu dipatuhi  | E2                              | test yang sama                                     |
| AC-4 Route `GET /notifications` memakai dispatcher                     | E2                              | test yang sama                                     |
| AC-5 Tidak ada regresi API                                             | E3                              | `test:integration` penuh                           |

## Approval Window

- Task / baseline: OUTBOX-OPPORTUNISTIC-RETRY @ `86705df`
- Path yang diizinkan: daftar pada bagian Perubahan
- Urutan aksi: edit → test → commit → patch → Owner publish → PR → merge (tier 2: dokumen deployment)
- Masa berlaku dan stop condition: sampai PR dibuat; berhenti bila suite API gagal

**Disetujui:** reyand (Owner), 2026-10-16, chat "setuju F#" (F3)

## Hasil

- Perintah — exit code — pass/fail/skip: test baru 5/0/0; `validate` 0; `test:integration` (PostgreSQL 16, migrasi 1–88) 515/0/0.
- PR dan tier: belum dibuat; Tier 2 (`docs/DEPLOYMENT_AND_ENVIRONMENTS.md`).
- Gap: tanpa user aktif, retry menunggu sampai ada yang membuka aplikasi; pada Vercel, batch yang melebihi
  1,5 detik bisa terhenti saat fungsi dibekukan dan dilanjutkan pada polling berikutnya.
