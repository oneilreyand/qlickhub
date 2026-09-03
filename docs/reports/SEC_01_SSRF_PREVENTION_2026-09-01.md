# SEC-01: Laporan Pencegahan SSRF pada Link Preview — 2026-09-01–02

## Task

Menutup seluruh temuan review lanjutan terhadap commit awal SEC-01 `9162800174c25d527bbbc6d885b46aab60c798e4` tanpa mengubah kontrak endpoint, skema, migrasi, RBAC, atau frontend.

## Outcome

Endpoint `GET /v1/meta/link-preview` sekarang menutup celah yang tersisa:

- deadline absolut mencakup resolusi DNS, koneksi, TLS, redirect, dan pembacaan body;
- hasil validasi pertama dapat dipakai ulang secara aman sehingga target tidak di-resolve dua kali;
- target Pinterest divalidasi penuh sebelum permintaan oEmbed dilakukan;
- HTTPS teruji berhasil dengan IP yang di-pin, `Host` dan SNI asli, serta verifikasi sertifikat aktif;
- header `Cookie`, `Authorization`, dan `Proxy-Authorization` tidak dikirim ke target;
- batas produksi benar-benar diuji sampai 30 request berhasil dan request ke-31 menghasilkan `429 RATE_LIMITED`;
- kegagalan DNS, timeout, redirect ke metadata cloud, TLS tidak tepercaya, dan body terlalu besar menghasilkan respons aman tanpa pinned IP, target internal, detail transport, atau stack trace.

Tidak ada perubahan data/interface publik, otorisasi, skema, maupun migrasi. Factory router dan opsi transport yang ditambahkan hanya menjadi seam pengujian; instance produksi tetap dibuat tanpa override.

## Root cause dan perbaikan

1. **Deadline dimulai sebelum DNS, tetapi sebelumnya baru ditegakkan setelah DNS selesai.** Resolusi sekarang dirace terhadap sisa deadline yang sama. Timeout DNS menghasilkan `TIMEOUT` dan tidak melanjutkan koneksi.
2. **Tes HTTPS lama hanya membuktikan sertifikat self-signed ditolak.** Fixture baru mempercayai CA uji secara terbatas saat `NODE_ENV=test` dan localhost testing aktif, lalu membuktikan request sukses dengan SNI/Host asli. Jalur produksi tetap selalu memakai `rejectUnauthorized: true` tanpa trust override.
3. **Target Pinterest sebelumnya hanya lolos validasi sintaks sebelum oEmbed.** Host target kini melalui `validateUrlSafety` lebih dahulu. Hasil aman tersebut digunakan kembali jika fallback HTML diperlukan.
4. **Tes rate limit produksi lama hanya memeriksa keberadaan middleware/konstanta.** Factory sekarang dapat diberi environment eksplisit untuk menguji konfigurasi produksi tanpa memutasi environment global.
5. **Bukti error sebelumnya dominan di fungsi transport.** Router sekarang dapat dirakit dengan transport seam terisolasi sehingga perilaku HTTP endpoint untuk timeout, overflow, dan redirect berbahaya diuji langsung.

Kebijakan fail-closed IPv4/IPv6, exact MIME matching, batas body 512 KiB, socket pinning, validasi ulang setiap redirect, dan cache maksimum 500 entri dari implementasi awal tetap dipertahankan.

## Changed files

- `apps/api/src/modules/meta/ssrfProtection.ts` — deadline DNS, reuse validasi first-hop yang tervalidasi ulang, dan CA fixture yang hanya aktif pada test localhost.
- `apps/api/src/modules/meta/metaRoutes.ts` — validasi target Pinterest, hostname matcher terpusat, serta factory router untuk integration test.
- `apps/api/src/http/middleware/rateLimit.ts` — environment eksplisit pada factory agar konfigurasi produksi dapat diuji secara behavioral.
- `apps/api/src/modules/meta/__tests__/linkPreviewSsrf.test.ts` — regresi DNS deadline, verified HTTPS/SNI, resolve-once, validasi IP target Pinterest, production rate limit, dan endpoint safe-error.
- `TODO.md` — membuka kembali SEC-01 saat perbaikan dan menutupnya setelah bukti selesai.
- `docs/reports/SEC_01_SSRF_PREVENTION_2026-09-01.md` — memperbarui bukti lama yang tidak lagi akurat.

## Validation

### Red/green regression evidence

- DNS resolver yang tidak pernah selesai: tes awal melewati timeout test 500 ms; setelah perbaikan mengembalikan `TIMEOUT` sekitar 50 ms.
- HTTPS valid dengan CA uji: awalnya `result.ok` bernilai `false`; setelah perbaikan sukses serta membuktikan pinned IP, SNI, Host, dan tidak adanya tiga secret headers.
- Reuse first-hop: awalnya resolver dipanggil dua kali; setelah perbaikan tepat satu kali.
- Pinterest matcher: tes awal gagal karena helper production belum tersedia; setelah helper dipakai bersama, domain lookalike ditolak dan domain sah diterima.
- Default produksi 30/minute: request ke-31 awalnya masih `200`; setelah perbaikan menjadi `429 RATE_LIMITED`.
- Endpoint overflow: tes awal gagal karena factory router belum tersedia; setelah seam ditambahkan, endpoint mengembalikan error aman yang tepat.

### Final commands

- `NODE_ENV=test npx tsx --test apps/api/src/modules/meta/__tests__/linkPreviewSsrf.test.ts` — **52 passed, 0 failed, 0 skipped**, 9 suites. Tes endpoint menggunakan user/session yang dipersist dan dibaca melalui PostgreSQL `qa_management_test` serta interface backend terautentikasi. Alur Pinterest juga terbukti berhenti sebelum oEmbed saat DNS target mengarah ke alamat metadata.
- `npx tsc --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext --esModuleInterop true --skipLibCheck true apps/api/src/http/middleware/rateLimit.ts apps/api/src/modules/meta/metaRoutes.ts apps/api/src/modules/meta/ssrfProtection.ts apps/api/src/modules/meta/__tests__/linkPreviewSsrf.test.ts` — passed, 0 error pada seluruh berkas SEC-01 dan dependency graph-nya.
- `npx eslint apps/api/src/http/middleware/rateLimit.ts apps/api/src/modules/meta/metaRoutes.ts apps/api/src/modules/meta/ssrfProtection.ts apps/api/src/modules/meta/__tests__/linkPreviewSsrf.test.ts` — passed, 0 error/warning.
- `NODE_ENV=test npx sequelize-cli db:migrate:status --env test` dari `apps/api` — **47/47 migration `up`** pada `qa_management_test`; migration terakhir `20260901000063-add-workspace-archive-activity-actions.cjs`.
- `npm --prefix apps/api run db:verify:clean-migrations` — passed; 47 migration diterapkan dari kondisi kosong pada PostgreSQL disposable `qa_management_phase0_verify_67880`, kontrak verifikasi lulus, lalu database dihapus oleh script.
- Query identitas terbatas — `current_database() = qa_management_test`, `current_user = postgres`; tidak ada kredensial yang dicetak.
- `npm --prefix apps/api run typecheck` — passed, 0 error setelah unit test email yang stale diselaraskan dengan kontrak token satu kali.
- `npm --prefix apps/api run build` — passed, exit code 0.

## Risks or follow-up

- Rate limiter memakai memory store per proses. Pada deployment multi-instance, batas efektif dapat berlipat sesuai jumlah instance. Store bersama membutuhkan keputusan/infrastruktur deployment tersendiri dan bukan perubahan tersembunyi yang aman dilakukan dalam SEC-01.
- Resolver DNS sistem tidak menyediakan pembatalan portable pada API yang dipakai. Respons aplikasi tetap berhenti sesuai deadline, tetapi operasi resolver tingkat sistem yang sudah dimulai dapat selesai di belakang layar.

## TODO update

- `SEC-01-SSRF-PREVENTION` → `Done`.
