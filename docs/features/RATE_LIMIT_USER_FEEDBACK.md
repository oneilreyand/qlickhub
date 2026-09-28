# RATE-LIMIT-USER-FEEDBACK Rate-limit feedback yang dapat ditindaklanjuti

**Status:** Active  
**Owner:** Product and Engineering  
**Last reviewed:** 2026-09-25  
**Applicable Policy IDs:** `AUTH-002`, `SEC-001`, `CONTRACT-001`, `UI-001`, `UI-002`, `TEST-001`

## 1. Tujuan dan Pengguna

Pengguna yang mencapai batas request harus mengetahui kuota yang tersisa dan waktu tunggu yang tepat, bukan hanya menerima pesan gagal generik. Login dan API umum memakai jendela maksimum lima menit; laju proteksi sebelumnya tetap dipertahankan. Link-preview tetap di luar perubahan batas: 30 request per 60 detik per pengguna sebagaimana `SEC-001`.

## 2. Requirement dan Acceptance Criteria

- **RLF-AC-1:** Respons pembatasan menyebutkan kuota `remaining/limit` dan countdown dari waktu reset yang dikirim server.
- **RLF-AC-2:** Login menampilkan sisa percobaan dan hanya menonaktifkan tombol ketika server menyatakan kuota habis; tombol aktif kembali saat countdown selesai.
- **RLF-AC-3:** Semua respons `429 RATE_LIMITED` dari aplikasi yang sedang masuk menampilkan notifikasi global dengan countdown yang dapat ditutup.
- **RLF-AC-4:** Link-preview tetap 30 request dalam rolling window 60 detik, tanpa perubahan otorisasi maupun persistensi.

Sumber keputusan: instruksi pengguna pada 2026-09-25 dan aturan link-preview di [Architecture §5](../1_ARCHITECTURE.md#perlindungan-link-preview-terdistribusi).

## 3. Alur Lintas Peran

Setiap pengguna (Owner, Admin, PO, Developer, atau QA) menerima header pembatasan dari backend. Pada login, percobaan yang gagal menampilkan sisa kuota; ketika habis, pengguna menunggu countdown. Di area terautentikasi, respons 429 dari aksi pengguna atau link-preview menampilkan notifikasi global. Tidak ada handoff, workflow Task, atau keputusan rilis yang berubah.

## 4. Data dan Relasi

Tidak ada entitas, data Workspace, audit event, atau migrasi. Counter link-preview yang telah persisten di PostgreSQL tidak berubah; metadata kuota hanya hidup pada respons HTTP dan state UI sementara.

## 5. API dan Shared Contract

Middleware menggunakan header IETF RateLimit draft-8 yang sudah tersedia: `RateLimit`, `RateLimit-Policy`, dan `Retry-After` pada respons pembatasan. Identifier middleware membedakan limiter API, login, notifikasi, dan link-preview agar klien memilih kuota endpoint terakhir. `packages/contracts` tidak berubah karena metadata ini merupakan header HTTP standar, bukan DTO JSON bersama.

## 6. Authorization

Tidak ada izin atau boundary baru. Backend tetap menjadi satu-satunya pihak yang menegakkan batas; UI hanya menjelaskan respons yang sudah diberikan server (`AUTH-002`, `SEC-001`).

## 7. UI dan Interaction States

`LoginPage` memakai atom `Alert` dan tombol bersama untuk menampilkan kuota/saat menunggu dan menonaktifkan submit ketika `remaining` adalah nol. `GlobalSnackbarHost` memakai molekul `Snackbar` dan `RateLimitCountdown` untuk status 429 pada halaman terautentikasi. Countdown memiliki `role="status"` dan `aria-live="polite"`; komponen responsif mengikuti lebar snackbar yang ada. Loading, error, disabled, dan success ditangani; empty dan permission-denied tidak relevan karena informasi berasal dari respons gagal yang sudah diotorisasi backend.

## 8. Pengujian dan Evidence

- Tes klien mem-parsing beberapa header draft-8 dan memverifikasi error 429 membawa metadata kuota.
- Tes `RateLimitCountdown` memverifikasi kuota dan perubahan waktu setiap detik.
- Tes `LoginPage` memverifikasi kuota login habis menonaktifkan submit.
- Tes API mengonfirmasi jendela dan laju pembatasan yang dipilih serta regresi link-preview/proxy.

Bukti eksekusi aktual dicatat pada [laporan RATE_LIMIT_USER_FEEDBACK](../reports/RATE_LIMIT_USER_FEEDBACK_2026-09-25.md).

## 9. Release dan Readiness

Tidak ada migrasi atau data release. Rollback adalah mengembalikan konstanta jendela limiter dan menghapus pembacaan metadata UI; counter link-preview tidak memerlukan recovery. Build dan focused tests adalah readiness minimum; UAT login dan satu respons 429 di browser tetap menjadi validasi runtime setelah rilis.

## 10. Traceability

`RLF-AC-1` dan `RLF-AC-3` → `apiClient.ts` → `RateLimitCountdown.tsx` / `GlobalSnackbarHost.tsx` → tes UI/klien → laporan. `RLF-AC-2` → `LoginPage.tsx` → tes LoginPage → laporan. `RLF-AC-4` → `rateLimit.ts` → tes distributed/proxy limiter → laporan.
