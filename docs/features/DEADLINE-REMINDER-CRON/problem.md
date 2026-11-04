# DEADLINE-REMINDER-CRON — Tahap 0: Problem Statement

**Status:** Disetujui
**Gerbang:** G0 — disetujui oleh PO/Owner
**Applicable Policy IDs:** SDLC-001, DATA-001, AUTH-012

## 1. Masalah

Pengingat deadline hanya dibuat ketika Admin/Owner kebetulan membuka aplikasi. Setiap tab browser
mereka memicu pemindaian sekitar sekali per menit, kadang untuk semua Workspace sekaligus, dan
pemindaian itu ikut mengingatkan task yang sudah lama sekali lewat tenggat.

## 2. Bukti masalah

| Bukti                                                                                                                                                                     | Sumber                                                                                             | Level |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ----- |
| Browser Admin/Owner memanggil `POST /v1/notifications/check-deadlines` dengan jeda 1 menit per tab; tanpa Workspace aktif dipanggil tanpa `workspaceId` (semua Workspace) | `apps/web/src/features/notifications/hooks/useNotifications.ts` (sebelum perubahan)                | E1    |
| Filter pemindaian `dueDate <= besok` dan `status != 'done'` tanpa batas bawah, sehingga task overdue berbulan-bulan dan task `canceled` ikut diingatkan                   | `apps/api/src/modules/notifications/notificationService.ts` (sebelum perubahan)                    | E1    |
| Satu query anti-spam per task × penerima (sudah diperbaiki jadi satu batch di PROD-LATENCY); tiap query ±150 ms sebelum region `hnd1`                                     | [Quick Card PROD-LATENCY](../../plans/quick/PROD-LATENCY.md)                                       | E3/E4 |
| Production tidak punya scheduler; pengingat bergantung pada pengguna aktif                                                                                                | `apps/api/src/modules/notifications/opportunisticOutboxDispatch.ts` (catatan Audit F3, 2026-10-16) | E1    |

## 3. Siapa yang terdampak

| Role           | Situasi                                | Seberapa sering            | Dampak                                                 |
| -------------- | -------------------------------------- | -------------------------- | ------------------------------------------------------ |
| Developer / QA | Penerima pengingat task yang di-assign | Setiap task mendekati due  | Pengingat telat bila tidak ada Admin/Owner yang online |
| PO / reporter  | Penerima pengingat task yang dibuatnya | Setiap task mendekati due  | Pengingat untuk task lama yang sudah tidak relevan     |
| Owner / Admin  | Browser-nya menjalankan pemindaian     | Tiap menit per tab terbuka | Beban request dan database ikut tab yang terbuka       |

## 4. Bila tidak dikerjakan

Pengingat tetap tidak andal (tidak ada pengingat di akhir pekan bila tidak ada Admin online),
pengguna terus menerima pengingat untuk task overdue lama, dan beban Production naik seiring jumlah
tab Admin/Owner yang terbuka.

## 5. Metrik sukses

| Metrik                                           | Baseline saat ini                | Target                            | Cara mengukur                                                      |
| ------------------------------------------------ | -------------------------------- | --------------------------------- | ------------------------------------------------------------------ |
| Pemindaian deadline yang dipicu browser          | ±1 per menit per tab Admin/Owner | 0                                 | Kode FE tidak memanggil endpoint; log Vercel tanpa panggilan rutin |
| Pemindaian terjadwal                             | Tidak ada                        | 1 per hari, tanpa pengguna online | `cron.job_run_details` dan log API `cron.deadline_reminders`       |
| Pengingat ganda untuk task × penerima × hari     | Dibatasi jeda 20 jam saja        | 0                                 | Unique `idempotency_key`; integration test run paralel             |
| Task overdue > 7 hari atau `canceled` diingatkan | Ya                               | Tidak                             | Integration test AC-4                                              |

## 6. Batasan dan di luar scope

- Polling notifikasi 15 detik, realtime SSE antar-instance, query auth middleware, dan pool `idle`
  tetap di PROD-LATENCY-FOLLOWUP.
- Dispatcher outbox notifikasi (S6) tetap memakai dispatch oportunistik; scheduler yang sama dapat
  dipakai nanti lewat keputusan terpisah.
- Tidak ada perubahan UI selain menghapus pemicu tersembunyi dari browser.

## 7. Unknown

| Pertanyaan                                                      | Mengapa penting                       | Siapa bisa menjawab                                                 |
| --------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------- |
| Apakah Supabase Cron/pg_net tersedia di plan project Production | Menentukan apakah opsi A bisa dipakai | Owner (dashboard Supabase); fallback opsi lease tercatat di ADR-040 |
