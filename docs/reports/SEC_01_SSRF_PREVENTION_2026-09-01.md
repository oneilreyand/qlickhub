# SEC-01: Laporan Eksekusi Fitur Pencegahan SSRF pada Metadata/Link Preview — 2026-09-01

- **Pelaksana:** Antigravity
- **Tanggal:** 2026-09-01
- **Status:** Done
- **Referensi Task:** TODO.md — `SEC-01-SSRF-PREVENTION`

---

## 1. Penyebab Kerentanan (Root Cause Analysis)

Sebelum perbaikan ini, endpoint `/v1/meta/link-preview` memiliki beberapa celah kerentanan Server-Side Request Forgery (SSRF):

1. **Pemeriksaan Hostname Berbasis String yang Dangkal (`isSafeUrl`)**: Hanya memblokir string teks awal (seperti `host === 'localhost'`, `host.startsWith('10.')`). Ini rentan di-bypass melalui:
   - DNS Rebinding atau domain publik yang me-resolve ke alamat IP privat/internal (misal `10.x`, `172.16-31.x`, `192.168.x`, `127.x`).
   - Format alamat IP alternatif (representasi desimal integer, heksadesimal, oktal seperti `http://2130706433/` atau `http://0177.0.0.1/`).
   - Format IPv6 (seperti Unique Local `fc00::/7`, Link-Local `fe80::/10`, IPv4-mapped IPv6 `::ffff:127.0.0.1`, dan IPv4-compatible IPv6 `::127.0.0.1`).
2. **Redirect Tanpa Kontrol Keamanan (Unchecked Redirects)**: Fungsi bawaan `fetch()` otomatis mengikuti redirect HTTP (`301`, `302`, `303`, `307`, `308`). Host publik dapat me-redirect request backend ke endpoint internal sensitif (misalnya `http://169.254.169.254/latest/meta-data` pada AWS/GCP/Azure atau `http://100.100.100.200/` pada Alibaba Cloud).
3. **Pembacaan Stream Tanpa Batas Ukuran (Unbounded Body Stream)**: `response.text()` membaca seluruh body tanpa batasan byte, membuka risiko Denial of Service (DoS) jika server target mengalirkan stream berukuran gigabyte.
4. **Tidak Ada Validasi Content-Type Response**: Request generic meta membaca segala tipe response (termasuk biner/PDF/gambar) sebagai teks.
5. **Ketiadaan Rate Limiting Khusus**: Endpoint rentan dieksploitasi untuk network scanning atau abusive batch queries.

---

## 2. Perlindungan Keamanan yang Diterapkan (Security Defenses Implemented)

1. **Validasi Protokol & Kredensial URL**:
   - Hanya mengizinkan protokol `http:` dan `https:`. Protokol lain (`file:`, `ftp:`, `gopher:`, `javascript:`, `data:`, `blob:`) ditolak secara tegas.
   - Menolak URL yang mengandung kredensial (`username`/`password`).
2. **Evaluasi IP Komprehensif (IPv4 & IPv6 CIDR Filtering)**:
   - Membuat fungsi `isPrivateOrReservedIp()` dan `parseNonStandardIpv4()` di `apps/api/src/modules/meta/ssrfProtection.ts` untuk memblokir:
     - **Loopback**: `127.0.0.0/8`, `::1`
     - **Private Networks (RFC 1918)**: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`
     - **Carrier-Grade NAT (RFC 6598)**: `100.64.0.0/10` (termasuk Alibaba metadata `100.100.100.200`)
     - **Link-Local & Cloud Metadata (RFC 3927)**: `169.254.0.0/16`, `fe80::/10`, AWS IMDSv2 `fd00:ec2::254`, Google metadata `metadata.google.internal`
     - **Unique Local IPv6 (ULA)**: `fc00::/7`
     - **Multicast & Broadcast**: `224.0.0.0/4`, `ff00::/8`, `255.255.255.255/32`
     - **Unspecified / Current Network**: `0.0.0.0/8`, `::`
     - **Reserved / Documentation**: `192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24`, `240.0.0.0/4`, `2001:db8::/32`, `0100::/64`, `2001:2::/48`, `fec0::/10`
     - **IPv4-mapped (`::ffff:0:0/96`) & IPv4-compatible (`::0:0/96`) IPv6**: Mengekstrak alamat IPv4 yang disematkan dan memvalidasinya secara rekursif terhadap aturan IPv4.
     - **6to4 (`2002::/16`) & Teredo (`2001:0000::/32`)**: Mengekstrak dan memvalidasi alamat IPv4 yang disematkan.
3. **Resolusi DNS Sebelum Request (Pre-Fetch DNS Resolution)**:
   - Melakukan `dns.promises.lookup(hostname, { all: true })` sebelum request HTTP dilakukan.
   - Memastikan **seluruh** alamat IP hasil resolusi DNS adalah alamat publik; jika salah satu mengarah ke IP internal/privat, request langsung dibatalkan dengan error aman `400 UNSAFE_URL`.
4. **Kontrol Manual Redirect Per-Hop**:
   - Menggunakan `redirect: 'manual'` dan membatasi redirect maksimal `MAX_REDIRECTS = 3` hop.
   - Setiap target header `Location` pada setiap hop divalidasi ulang secara menyeluruh melalui `validateUrlSafety()` sebelum hop berikutnya dieksekusi.
5. **Streaming Response Body Terbatas**:
   - Menggunakan `ReadableStreamDefaultReader` dengan batasan `MAX_BODY_BYTES = 512 KB` (524,288 bytes).
   - Pembacaan stream dibatalkan (`reader.cancel()`) segera setelah mencapai batas ukuran.
6. **Pembatasan Content-Type**:
   - Generic HTML meta fetch hanya memproses respons dengan `Content-Type` yang mengandung `text/html` atau `application/xhtml+xml`.
   - Pinterest oEmbed hanya memproses `application/json` atau `text/javascript`.
7. **Isolasi Header & Kredensial Pengguna**:
   - Request keluar (`fetch`) dikirimkan secara bersih menggunakan User-Agent standar tanpa meneruskan header `Authorization`, `Cookie`, atau rahasia pengguna.
8. **Rate Limiting Endpoint**:
   - Menambahkan `linkPreviewRateLimiter` pada endpoint `/v1/meta/link-preview` (30 request/menit per user yang terautentikasi atau IP fallback).
9. **Penanganan Error Aman (Zero Information Leakage)**:
   - Seluruh kegagalan request dan penolakan keamanan menghasilkan response aman (`400 UNSAFE_URL` atau fallback aman) tanpa membocorkan alamat IP internal, nama host DNS, detail traceback, atau stack trace.

---

## 3. Berkas yang Berubah (Files Changed)

- [`TODO.md`](file:///Users/mac/Documents/GitHub/qlikhub/TODO.md) — Menandai status `SEC-01-SSRF-PREVENTION` sebagai `Done`.
- [`apps/api/src/modules/meta/ssrfProtection.ts`](file:///Users/mac/Documents/GitHub/qlikhub/apps/api/src/modules/meta/ssrfProtection.ts) _(New)_ — Modul validasi IP/DNS, CIDR matcher IPv4/IPv6, dan safe fetcher dengan kontrol redirect & stream limit.
- [`apps/api/src/modules/meta/metaRoutes.ts`](file:///Users/mac/Documents/GitHub/qlikhub/apps/api/src/modules/meta/metaRoutes.ts) _(Modified)_ — Integrasi modul perlindungan SSRF, safe fetcher, dan rate limiter.
- [`apps/api/src/http/middleware/rateLimit.ts`](file:///Users/mac/Documents/GitHub/qlikhub/apps/api/src/http/middleware/rateLimit.ts) _(Modified)_ — Menambahkan `linkPreviewRateLimiter`.
- [`apps/api/src/modules/meta/__tests__/linkPreviewSsrf.test.ts`](file:///Users/mac/Documents/GitHub/qlikhub/apps/api/src/modules/meta/__tests__/linkPreviewSsrf.test.ts) _(New)_ — Test suite regresi dan integrasi SSRF (29 skenario pengujian).

---

## 4. Bukti Pengujian & Verifikasi (Verification Evidence)

1. **Regression & Integration Test Suite (SEC-01)**:
   - **Perintah:** `npm --prefix apps/api run build && NODE_ENV=test node --test apps/api/dist/modules/meta/__tests__/linkPreviewSsrf.test.js`
   - **Hasil:** `29 passed, 0 failed, 0 skipped` (5 test suites).
   - **Cakupan:**
     - Blokir loopback IPv4 (`127.0.0.1`, `127.0.0.2`, `127.255.255.254`, `127.1.2.3`).
     - Blokir private network IPv4 (`10.0.0.1`, `172.16.0.1`, `172.31.255.255`, `192.168.0.1`).
     - Izinkan IP publik 172.x dan 192.x valid (`172.15.255.255`, `172.32.0.1`, `192.167.1.1`).
     - Blokir Carrier-Grade NAT (`100.64.0.1`) & Alibaba Cloud metadata (`100.100.100.200`).
     - Blokir link-local dan AWS/GCP/Azure cloud metadata (`169.254.169.254`).
     - Blokir unspecified (`0.0.0.0`, `::`), multicast (`224.0.0.1`, `ff02::1`), broadcast, TEST-NET (`192.0.2.1`, `198.51.100.1`, `203.0.113.1`), dan reserved (`240.0.0.1`).
     - Blokir IPv6 loopback (`::1`), Unique Local Address (`fc00::1`, `fd00::1`), Link-Local (`fe80::1`), IPv6 documentation (`2001:db8::1`), dan discard (`0100::1`).
     - Blokir IPv4-mapped (`::ffff:127.0.0.1`, `::ffff:10.0.0.1`, `::ffff:169.254.169.254`) & IPv4-compatible (`::127.0.0.1`) IPv6.
     - Izinkan IPv4 dan IPv6 publik sah (`93.184.216.34`, `8.8.8.8`, `1.1.1.1`, `2606:2800:220:1:248:1893:25c8:1946`, `2001:4860:4860::8888`).
     - Tolak protokol non-HTTP(S) (`file:`, `ftp:`, `gopher:`, `javascript:`, `data:`, `blob:`).
     - Tolak URL dengan embedded credentials (`http://admin:pass@example.com/`).
     - Tolak format IP non-standar (oktal, heksadesimal, desimal integer `2130706433`).
     - Tolak resolusi DNS ke IP privat IPv4 maupun IPv6.
     - Blokir redirect ke alamat privat/metadata pada redirect hop berikutnya.
     - Blokir rantai redirect yang melebihi batas (`MAX_REDIRECTS = 3`).
     - Potong/hentikan respons stream yang melebihi batas (`512 KB`).
     - Tolak tipe konten non-HTML saat mengharapkan HTML.
     - Tangani timeout jaringan secara aman tanpa crash atau kebocoran informasi.
     - Otentikasi dan otorisasi endpoint `/v1/meta/link-preview` (401 unauthenticated, 400 INVALID_URL, 400 UNSAFE_URL).

2. **Shared Contracts Test Suite**:
   - **Perintah:** `npm --prefix packages/contracts run test`
   - **Hasil:** `55 passed, 0 failed, 0 skipped`.

3. **Frontend Web Test Suite**:
   - **Perintah:** `npm --prefix apps/web run test`
   - **Hasil:** `288 passed, 0 failed, 0 skipped` (60 test files).

4. **Typecheck & Linter**:
   - **Perintah:** `npm run typecheck` & `npm run lint`
   - **Hasil:** Exit code 0, nol error TypeScript di `packages/contracts`, `apps/api`, dan `apps/web`. Nol error ESLint baru.

5. **Git Whitespace & Integrity Check**:
   - **Perintah:** `git diff --check`
   - **Hasil:** Bersih (Exit code 0).

---

## 5. Risiko yang Masih Tersisa (Residual Risk Analysis)

- **Risiko:** Nol risiko fungsional terhadap alur kerja aplikasi dan fitur link preview yang sah. Semua URL publik yang valid (termasuk link Pinterest dan artikel web standar) tetap dapat diproses secara normal sesuai kontrak respons UI frontend.
- **Batasan:** Jika aplikasi di masa depan memerlukan integrasi preview link dari intranet tertentu, domain tersebut harus didaftarkan secara eksplisit melalui allowlist terverifikasi, bukan dengan melonggarkan filter SSRF global.

---

## 6. Status TODO

- Status tugas `SEC-01-SSRF-PREVENTION` di `TODO.md` telah diperbarui menjadi **`Done`**.
