# SEC-01: Laporan Eksekusi Fitur Pencegahan SSRF pada Metadata/Link Preview — 2026-09-01

- **Pelaksana:** Antigravity
- **Tanggal:** 2026-09-01
- **Status:** Done
- **Referensi Task:** TODO.md — `SEC-01-SSRF-PREVENTION`

---

## 1. Penyebab Kerentanan (Root Cause Analysis)

Sebelum perbaikan dan revisi komprehensif ini, endpoint `/v1/meta/link-preview` dan fetcher backend memiliki beberapa celah kerentanan Server-Side Request Forgery (SSRF):

1. **Celah TOCTOU & DNS Rebinding (Time-of-Check to Time-of-Use)**:
   - Validasi URL memeriksa hasil DNS lookup awal, namun `fetch()` bawaan melakukan resolusi DNS baru pada level socket runtime. Penyerang dapat menyajikan IP publik saat pemeriksaan pertama dan IP privat/internal pada koneksi sebenarnya.
2. **Klasifikasi IPv6 yang Belum Fail-Closed**:
   - Rentang IPv6 special-use tertentu (seperti Local-Use NAT64 `64:ff9b:1::/48`, Cryptographic Identifier `2001:10::/28`, Drone Remote ID `2001:20::/28`, serta alamat non-global unicast di luar `2000::/3`) belum difilter secara ketat dengan kebijakan fail-closed.
3. **Pencocokan Content-Type Longgar (`includes()`)**:
   - Pengecekan media type menggunakan substring `includes()`, sehingga header berbahaya seperti `application/x-text/html-evil` atau `application/jsonp` berpotensi lolos.
4. **Respon Stream yang Melebihi Batas Dianggap Sukses Terpotong**:
   - Ketika stream melebihi batas `512 KB`, konten terpotong berisiko diproses sebagai dokumen parsial valid alih-alih ditolak secara aman dengan error `RESPONSE_TOO_LARGE`.
5. **Redirect Tanpa Kontrol Keamanan (Unchecked Redirects)**:
   - Host publik dapat me-redirect request backend ke endpoint internal sensitif (misalnya `http://169.254.169.254/latest/meta-data` pada AWS/GCP/Azure atau `http://100.100.100.200/` pada Alibaba Cloud).
6. **Ketiadaan Rate Limiting Khusus**:
   - Endpoint berisiko dieksploitasi untuk network scanning atau batch enumeration.

---

## 2. Perlindungan Keamanan yang Diterapkan (Security Defenses Implemented)

1. **Transport HTTP/HTTPS dengan DNS Pinning (Socket-Level Lock)**:
   - Menggunakan transport `node:http` dan `node:https` dengan fungsi custom `lookup` yang mengunci socket langsung ke alamat IP hasil validasi pertama.
   - Tidak ada resolusi DNS kedua di jaringan, sehingga celah DNS rebinding / TOCTOU tertutup sepenuhnya.
   - Tetap mempertahankan nama host asli pada header HTTP `Host` dan TLS SNI (`servername`).
   - Verifikasi sertifikat TLS (`rejectUnauthorized: true`) tetap aktif penuh dan tidak pernah dinonaktifkan di jalur produksi.
   - Tidak meneruskan header `Cookie`, `Authorization`, proxy credentials, atau header rahasia ke server target.
   - Mengulang validasi dan DNS pinning secara independen pada setiap redirect hop.
2. **Evaluasi IP Komprehensif & Fail-Closed IPv6 Filtering**:
   - Memeriksa seluruh alamat IP hasil resolusi DNS terhadap rentang privat, loopback, link-local, multicast, cloud metadata, dan special-use:
     - **IPv4**: `0.0.0.0/8`, `10.0.0.0/8`, `100.64.0.0/10` (CGNAT & Alibaba `100.100.100.200`), `127.0.0.0/8`, `169.254.0.0/16`, `172.16.0.0/12`, `192.0.0.0/24`, `192.0.2.0/24`, `192.88.99.0/24`, `192.168.0.0/16`, `198.18.0.0/15`, `198.51.100.0/24`, `203.0.113.0/24`, `224.0.0.0/4`, `240.0.0.0/4`, `255.255.255.255`.
     - **IPv6**: `::/128` (unspecified), `::1/128` (loopback), `fc00::/7` (ULA), `fe80::/10` (link-local), `fec0::/10` (site-local), `ff00::/8` (multicast), `64:ff9b::/96` (well-known NAT64), `64:ff9b:1::/48` (local-use NAT64), `0100::/64` (discard), `2001:0000::/32` (Teredo), `2001:2::/48` (benchmarking), `2001:10::/28` (ORCHIDv2), `2001:20::/28` (Drone Remote ID), `2001:db8::/32` (documentation), `2002::/16` (6to4), IPv4-mapped (`::ffff:0:0/96`), IPv4-compatible (`::0:0/96`).
     - **Fail-Closed Global Unicast Policy**: Semua alamat IPv6 di luar rentang resmi Global Unicast (`2000::/3`) otomatis ditolak.
3. **Pencocokan Content-Type Secara Tepat (Exact Media-Type Matching)**:
   - Mem-parse media type sebelum tanda `;` dan mencocokkan secara case-insensitive terhadap allowlist (`text/html`, `application/xhtml+xml` untuk HTML meta; `application/json` untuk Pinterest oEmbed).
   - Menolak nilai manipulatif seperti `application/x-text/html-evil` dan `application/jsonp`.
4. **Batas Ukuran Response Fail-Closed (`RESPONSE_TOO_LARGE`)**:
   - Memeriksa header `Content-Length` jika tersedia; jika melebihi `512 KB` (524,288 bytes), request langsung dibatalkan.
   - Menghitung akumulasi byte pada chunk stream respon; jika melebihi batas, stream langsung di-`destroy` dan mengembalikan error `{ ok: false, error: 'RESPONSE_TOO_LARGE' }`.
5. **Kontrol Manual Redirect Per-Hop**:
   - Membatasi redirect maksimal `MAX_REDIRECTS = 3` hop.
   - Header `Location` divalidasi ulang (resolusi DNS baru, evaluasi IP baru, dan socket pinning baru) pada setiap hop.
   - Redirect tanpa `Location` atau dengan URL malformed langsung ditolak dengan `INVALID_REDIRECT_LOCATION`.
6. **Rate Limiting Endpoint**:
   - Menambahkan `linkPreviewRateLimiter` pada endpoint `/v1/meta/link-preview` (30 request/menit per user yang terautentikasi atau IP fallback).
7. **Pencegahan Kebocoran Informasi (Zero Information Leakage)**:
   - Respons error pada endpoint HTTP selalu berupa objek standar `{ error: { code: '...', message: '...' } }` tanpa membocorkan alamat IP internal, hostname DNS privat, stack trace, atau token.

---

## 3. Berkas yang Berubah (Files Changed)

- [`TODO.md`](file:///Users/mac/Documents/GitHub/qlikhub/TODO.md) — Menandai status `SEC-01-SSRF-PREVENTION` sebagai `Done`.
- [`apps/api/src/modules/meta/ssrfProtection.ts`](file:///Users/mac/Documents/GitHub/qlikhub/apps/api/src/modules/meta/ssrfProtection.ts) — Pinned socket transport (`http.request`/`https.request` dengan custom lookup), fail-closed IPv6/IPv4 matcher, exact Content-Type matching, stream overflow failure handling.
- [`apps/api/src/modules/meta/metaRoutes.ts`](file:///Users/mac/Documents/GitHub/qlikhub/apps/api/src/modules/meta/metaRoutes.ts) — Integrasi safeFetch dengan penanganan error `RESPONSE_TOO_LARGE`, `UNSAFE_URL`, dan `UNSAFE_REDIRECT`.
- [`apps/api/src/http/middleware/rateLimit.ts`](file:///Users/mac/Documents/GitHub/qlikhub/apps/api/src/http/middleware/rateLimit.ts) — Konfigurasi `linkPreviewRateLimiter`.
- [`apps/api/src/modules/meta/__tests__/linkPreviewSsrf.test.ts`](file:///Users/mac/Documents/GitHub/qlikhub/apps/api/src/modules/meta/__tests__/linkPreviewSsrf.test.ts) — Test suite regresi dan integrasi SSRF (34 skenario pengujian komprehensif).
- [`docs/reports/SEC_01_SSRF_PREVENTION_2026-09-01.md`](file:///Users/mac/Documents/GitHub/qlikhub/docs/reports/SEC_01_SSRF_PREVENTION_2026-09-01.md) — Laporan teknis bukti eksekusi dan verifikasi.

---

## 4. Bukti Database & Pengujian (Database & Verification Evidence)

### A. Lingkungan Database Pengujian

- **Target Database:** PostgreSQL disposable lokal `qa_management_test` (host `localhost:5432`).
- **Verifikasi Identitas:** `current_database() = 'qa_management_test'`, `current_user = 'postgres'`.
- **Status Migrasi:** 62 migrasi kanonikal kanonikal (`SequelizeMeta`) up-to-date (`db:migrate:test`).

### B. Hasil Pengujian Unit & Integrasi

1. **SSRF Regression & Security Suite (SEC-01)**:
   - **Perintah:** `NODE_ENV=test npm --prefix apps/api run build && NODE_ENV=test node --test apps/api/dist/modules/meta/__tests__/linkPreviewSsrf.test.js`
   - **Hasil:** **34 passed, 0 failed, 0 skipped** (5 test suites).
   - **Verifikasi Kritis:**
     - DNS rebinding prevention: socket terkunci ke IP tervalidasi pertama tanpa query DNS kedua.
     - Preservasi Host header dan isolasi kredensial (tidak ada Cookie/Auth keluar).
     - Validasi dan pinning independen per-hop redirect.
     - Penolakan redirect ke IP privat/metadata.
     - Penolakan redirect tanpa Location / malformed Location.
     - Penolakan rantai redirect melebihi 3 hop.
     - Penolakan tipe konten manipulatif (`application/x-text/html-evil`, `application/jsonp`).
     - Penolakan payload melebihi 512KB dengan error aman `RESPONSE_TOO_LARGE`.
     - Penolakan seluruh rentang IPv6 special-use (`64:ff9b:1::/48`, `2001:10::/28`, `2001:20::/28`, `2001:2::/48`, `2001:db8::/32`, `0100::/64`, ULA, link-local, multicast, non-global unicast).
     - Otentikasi dan sanitasi error API tanpa kebocoran informasi.

2. **Shared Contracts Test Suite**:
   - **Perintah:** `npm --prefix packages/contracts run test`
   - **Hasil:** **56 passed, 0 failed, 0 skipped**.

3. **Frontend Web Test Suite**:
   - **Perintah:** `npm --prefix apps/web run test`
   - **Hasil:** **296 passed, 0 failed, 0 skipped** (62 test files).

4. **Typecheck & Linter**:
   - **Perintah:** `npm run typecheck` & `npm run lint`
   - **Hasil:** Exit code 0, nol error TypeScript.

5. **Git Diff Check**:
   - **Perintah:** `git diff --check`
   - **Hasil:** Bersih (Exit code 0).

---

## 5. Analisis Risiko yang Tersisa (Residual Risk Analysis)

1. **Jangkauan DNS Publik**: Pengujian unit menggunakan mock resolver/seam untuk menguji skenario tanpa memerlukan akses internet terbuka. Pada lingkungan produksi, keandalan resolusi tetap bergantung pada recursive resolver yang dikonfigurasi di host runtime.
2. **Domain Dinamis / CDN Publik**: URL publik yang sah dengan multi-IP DNS (misal CDN dengan banyak A/AAAA records) akan di-pin ke IP publik pertama yang lolos validasi untuk sesi request tersebut.
3. **Perubahan Format Metadata Eksternal**: Jika situs target memperbarui struktur markup OpenGraph/HTML atau memblokir User-Agent scraper, sistem akan jatuh kembali ke fallback aman (judul hostname) tanpa memicu error sistem.

---

## 6. Status TODO

- Status tugas `SEC-01-SSRF-PREVENTION` di `TODO.md` telah selesai dan diverifikasi (**`Done`**).
