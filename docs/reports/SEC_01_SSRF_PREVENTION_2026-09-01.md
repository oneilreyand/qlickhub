# SEC-01: Laporan Eksekusi Fitur Pencegahan SSRF pada Metadata/Link Preview — 2026-09-01

- **Pelaksana:** Antigravity
- **Tanggal:** 2026-09-01
- **Status:** Done
- **Referensi Task:** TODO.md — `SEC-01-SSRF-PREVENTION`

---

## 1. Penyebab Kerentanan & Temuan Review (Root Cause Analysis)

Berdasarkan review arsitektur keamanan, endpoint `/v1/meta/link-preview` dan modul transport backend telah diremediasi secara menyeluruh dari seluruh celah kerentanan Server-Side Request Forgery (SSRF):

1. **Inactivity Timeout vs Deadline Absolut Total**:
   - `req.setTimeout()` sebelumnya hanya menangani socket inactivity. Server eksternal yang mengirim 1 byte secara berkala dapat mempertahankan koneksi melebihi batas (slow-drip attack).
   - Telah diperbaiki: `DEFAULT_TIMEOUT_MS` (3.5 detik) menjadi batas total global untuk seluruh siklus request (DNS lookup, socket connection, TLS handshake, seluruh redirect hop, dan pembacaan stream body). Jika deadline terlampaui, request dan response aktif langsung di-destroy, timer dibersihkan, dan mengembalikan `{ ok: false, error: 'TIMEOUT' }` tanpa kebocoran resource atau open handles.
2. **Kebijakan Fail-Closed IPv6 Special-Use & Transition Prefixes**:
   - Seluruh prefiks transisi dan reserved IPv6 ditolak secara fail-closed, termasuk ketika embedded IPv4-nya bernilai publik:
     - IPv4-mapped IPv6 `::ffff:0:0/96` (unconditionally rejected)
     - IPv4-compatible IPv6 `::/96` (unconditionally rejected)
     - NAT64 well-known `64:ff9b::/96` & local-use `64:ff9b:1::/48` (unconditionally rejected)
     - Teredo `2001::/32` (unconditionally rejected)
     - 6to4 `2002::/16` (unconditionally rejected)
     - ORCHIDv2 `2001:10::/28`, Drone Remote ID `2001:20::/28`, BMWG `2001:2::/48`, Doc `2001:db8::/32`, Discard `0100::/64`
     - Seluruh alamat non-global unicast di luar `2000::/3` (ULA `fc00::/7`, Link-Local `fe80::/10`, Site-Local `fec0::/10`, Multicast `ff00::/8`, Unspecified `::/128`, Loopback `::1/128`).
3. **Eliminasi DNS Resolution Duplikat & Parsing Hostname Presisi**:
   - Menghilangkan resolusi ganda antara handler route dan `safeFetch`. Setiap URL target hanya di-resolve tepat 1 kali per hop dan IP hasil resolusi langsung di-pin ke socket koneksi tanpa query DNS kedua.
   - Deteksi domain Pinterest (`pinterest.com`, `pin.it`) menggunakan parsing objek `URL.hostname` yang presisi, menolak lookalike seperti `evilpinterest.com` atau parameter query string yang memuat nama domain.
   - In-memory cache divalidasi sebelum request jaringan, mencegah network call ke alamat yang belum divalidasi.
4. **Pengujian HTTPS/TLS Terisolasi**:
   - Memvalidasi socket IP pinning pada koneksi HTTPS, TLS SNI (`servername`), `Host` header yang presisi, penolakan sertifikat tidak valid/untrusted (`rejectUnauthorized: true`), dan penghilangan header sensitif (`Cookie`, `Authorization`, `Proxy-Authorization`).
5. **Behavioral Rate Limiter Factory**:
   - Mengabstraksi rate limiter menjadi factory `createLinkPreviewRateLimiter()` sehingga perilaku pembatasan 30 req/menit, isolasi multi-user, fallback IP, dan status `429 RATE_LIMITED` terbukti secara behavioral tanpa memutasi konfigurasi global `NODE_ENV`.
6. **Sanitasi Error Response Tanpa Kebocoran Informasi (Zero Leakage)**:
   - Respon endpoint tidak membocorkan hostname internal, pinned IP, DNS records, token, atau stack trace pada kegagalan DNS, unsafe redirect, timeout, stream overflow, atau kegagalan TLS.

---

## 2. Perlindungan Keamanan yang Diterapkan (Security Defenses Implemented)

1. **Transport HTTP/HTTPS dengan DNS Pinning (Socket-Level Lock)**:
   - Menggunakan transport `node:http` dan `node:https` dengan fungsi custom `lookup` yang mengunci socket langsung ke alamat IP hasil validasi pertama.
   - Tidak ada resolusi DNS kedua di jaringan, menutup celah DNS rebinding / TOCTOU sepenuhnya.
   - Preservasi `Host` header asli dan TLS SNI (`servername`).
   - Verifikasi sertifikat TLS (`rejectUnauthorized: true`) aktif permanen tanpa opsi bypass di jalur produksi.
   - Header sensitif (`Cookie`, `Authorization`, `Proxy-Authorization`) tidak diteruskan ke server target.
   - Validasi dan pinning diulang secara independen pada setiap redirect hop.
2. **Evaluasi IP Komprehensif & Fail-Closed IPv6 Filtering**:
   - Memeriksa seluruh alamat IP terhadap rentang privat, loopback, link-local, multicast, cloud metadata, dan special-use:
     - **IPv4**: `0.0.0.0/8`, `10.0.0.0/8`, `100.64.0.0/10` (CGNAT & Alibaba `100.100.100.200`), `127.0.0.0/8`, `169.254.0.0/16`, `172.16.0.0/12`, `192.0.0.0/24`, `192.0.2.0/24`, `192.88.99.0/24`, `192.168.0.0/16`, `198.18.0.0/15`, `198.51.100.0/24`, `203.0.113.0/24`, `224.0.0.0/4`, `240.0.0.0/4`, `255.255.255.255`.
     - **IPv6 Fail-Closed**: `::/128`, `::1/128`, `::ffff:0:0/96`, `::/96`, `64:ff9b::/96`, `64:ff9b:1::/48`, `0100::/64`, `2001::/32`, `2001:2::/48`, `2001:10::/28`, `2001:20::/28`, `2001:db8::/32`, `2002::/16`, `fc00::/7`, `fe80::/10`, `fec0::/10`, `ff00::/8`, dan seluruh alamat di luar `2000::/3`.
3. **Pencocokan Content-Type Secara Tepat (Exact Media-Type Matching)**:
   - Mem-parse media type sebelum `;` dan mencocokkan secara case-insensitive terhadap allowlist (`text/html`, `application/xhtml+xml` untuk HTML; `application/json` untuk oEmbed).
4. **Batas Ukuran Response Fail-Closed (`RESPONSE_TOO_LARGE`)**:
   - Memeriksa header `Content-Length` dan stream chunk; jika melebihi `512 KB` (524,288 bytes), request langsung dibatalkan dengan error `{ ok: false, error: 'RESPONSE_TOO_LARGE' }`.
5. **Deadline Global Absolut**:
   - Menghitung sisa waktu dari satu batas global `const deadline = Date.now() + timeoutMs` pada seluruh hop dan pembacaan stream; membersihkan seluruh active timer/socket saat batas waktu tercapai.
6. **Rate Limiting Endpoint Behavioral**:
   - Factory `createLinkPreviewRateLimiter()` dengan default 30 request/menit per user atau IP fallback, menghasilkan respon `429` dengan payload `{ code: 'RATE_LIMITED' }`.

---

## 3. Berkas yang Berubah (Files Changed)

- [`TODO.md`](file:///Users/mac/Documents/GitHub/qlikhub/TODO.md) — Menandai status `SEC-01-SSRF-PREVENTION` sebagai `Done`.
- [`apps/api/src/modules/meta/ssrfProtection.ts`](file:///Users/mac/Documents/GitHub/qlikhub/apps/api/src/modules/meta/ssrfProtection.ts) — Enforce fail-closed IPv6 transition filtering, deadline global absolut, active socket/timer cleanup, socket pinning, exact Content-Type matching, stream overflow failure handling.
- [`apps/api/src/modules/meta/metaRoutes.ts`](file:///Users/mac/Documents/GitHub/qlikhub/apps/api/src/modules/meta/metaRoutes.ts) — Eliminasi duplikasi DNS resolution, deteksi hostname Pinterest presisi, sanitasi error response.
- [`apps/api/src/http/middleware/rateLimit.ts`](file:///Users/mac/Documents/GitHub/qlikhub/apps/api/src/http/middleware/rateLimit.ts) — Factory `createLinkPreviewRateLimiter()` dan konfigurasi production rate limiter.
- [`apps/api/src/modules/meta/__tests__/linkPreviewSsrf.test.ts`](file:///Users/mac/Documents/GitHub/qlikhub/apps/api/src/modules/meta/__tests__/linkPreviewSsrf.test.ts) — Test suite komprehensif 46 skenario pengujian (IPv6 fail-closed, absolute deadlines, HTTPS/TLS, behavioral rate limiters, Pinterest hostname, single DNS resolution, info leak prevention).
- [`docs/reports/SEC_01_SSRF_PREVENTION_2026-09-01.md`](file:///Users/mac/Documents/GitHub/qlikhub/docs/reports/SEC_01_SSRF_PREVENTION_2026-09-01.md) — Laporan teknis bukti eksekusi dan verifikasi.

---

## 4. Bukti Database & Pengujian (Database & Verification Evidence)

### A. Lingkungan Database Pengujian

- **Target Database:** PostgreSQL disposable lokal `qa_management_test` (host `localhost:5432`).
- **Verifikasi Identitas:** `current_database() = 'qa_management_test'`, `current_user = 'postgres'`.
- **Status Migrasi Kanonikal:** **46 migrasi kanonikal, dengan nomor urut terakhir 62** (`SequelizeMeta`) terverifikasi bersih (`npm --prefix apps/api run db:verify:clean-migrations`).

### B. Hasil Pengujian Unit & Integrasi

1. **SSRF Regression & Security Suite (SEC-01)**:
   - **Perintah:** `NODE_ENV=test npm --prefix apps/api run build && NODE_ENV=test node --test apps/api/dist/modules/meta/__tests__/linkPreviewSsrf.test.js`
   - **Hasil:** **46 passed, 0 failed, 0 skipped** (8 test suites).
   - **Cakupan Pengujian:**
     - 1. IP Classification & Filtering: 15 passed (IPv4 loopback, RFC 1918, CGNAT, link-local, multicast, fail-closed IPv6 transition prefixes `::ffff:0:0/96`, `::/96`, `64:ff9b::/96`, `64:ff9b:1::/48`, `2002::/16`, `2001::/32`, global IPv6 allowance).
     - 2. URL Safety Validation: 7 passed (protocols, credentials, internal hostnames, non-standard IP formats, DNS resolution safety).
     - 3. Pinned Socket Transport: 12 passed (valid page, rebinding socket lock, Host header preservation, redirect re-validation, private redirect block, missing/malformed Location block, redirect chain limit, exact MIME matching, 512KB payload limit, slow-hang timeout, slow-drip absolute deadline, multi-hop cumulative deadline).
     - 4. HTTPS / TLS Transport & Security: 2 passed (strict `rejectUnauthorized: true` untrusted cert rejection, SNI/Host header preservation without sensitive headers).
     - 5. Behavioral Rate Limiter: 3 passed (production 30 req/min default verification, 429 `RATE_LIMITED` enforcement, per-user isolation, IP fallback).
     - 6. Strict Pinterest Detection: 2 passed (lookalike domain rejection, authentic domain match).
     - 7. API Endpoint Integration: 5 passed (401 unauthenticated, 400 invalid URL, 400 unsafe URL without info leakage, cache hit without duplicate fetch, safe fallback for unreachable target).

2. **Clean Canonical Migrations Verification**:
   - **Perintah:** `npm --prefix apps/api run db:verify:clean-migrations`
   - **Hasil:** Exit code 0, 46 migrasi kanonikal selesai tanpa kegagalan.

3. **Shared Contracts Test Suite**:
   - **Perintah:** `npm --prefix packages/contracts run test`
   - **Hasil:** **56 passed, 0 failed, 0 skipped** (16 test suites).

4. **Frontend Web Test Suite**:
   - **Perintah:** `npm --prefix apps/web run test`
   - **Hasil:** **296 passed, 0 failed, 0 skipped** (61 test files).

5. **Workspace Typecheck**:
   - **Perintah:** `npm run typecheck`
   - **Hasil:** Exit code 0, 0 error across packages/contracts, apps/api, apps/web.

6. **Workspace Linter**:
   - **Perintah:** `npm run lint`
   - **Hasil:** Exit code 0, 0 error, 28 pre-existing warnings (0 new warnings).

7. **Git Diff Check**:
   - **Perintah:** `git diff --check`
   - **Hasil:** Exit code 0 (clean, no trailing whitespace or merge markers).

---

## 5. Analisis Risiko yang Tersisa (Residual Risk Analysis)

1. **Jangkauan DNS Publik**: Pengujian unit menggunakan mock resolver/seam untuk menguji skenario tanpa memerlukan akses internet terbuka. Pada lingkungan produksi, keandalan resolusi tetap bergantung pada recursive resolver yang dikonfigurasi di host runtime.
2. **Domain Dinamis / CDN Publik**: URL publik yang sah dengan multi-IP DNS (misal CDN dengan banyak A/AAAA records) akan di-pin ke IP publik pertama yang lolos validasi untuk sesi request tersebut.
3. **Perubahan Format Metadata Eksternal**: Jika situs target memperbarui struktur markup OpenGraph/HTML atau memblokir User-Agent scraper, sistem akan jatuh kembali ke fallback aman (judul hostname) tanpa memicu error sistem.

---

## 6. Status TODO

- Status tugas `SEC-01-SSRF-PREVENTION` di `TODO.md` telah selesai dan diverifikasi (**`Done`**).
