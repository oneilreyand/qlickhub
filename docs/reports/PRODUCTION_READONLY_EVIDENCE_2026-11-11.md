# Bukti Production baca-saja untuk item TODO yang menunggu penutupan — 2026-11-11

## Task

Mengumpulkan bukti Production **tanpa login dan tanpa mutasi** untuk delapan item `TODO.md` yang
kodenya sudah ada di `main`, lalu mencatat apa yang masih kurang sebelum G6. Laporan ini adalah
bukti/status, bukan keputusan rilis dan bukan penerimaan G6 (`DOC-003`, `DOC-004`, `TEST-001`).

## Otorisasi dan batas

- Owner, chat 2026-11-11: tutup delapan item satu per satu; Production **baca saja**; perubahan
  dokumen lewat worktree terpisah dan PR.
- Baseline: `origin/main` @ `4f0938a2` (PR #119). Branch `docs/prod-evidence-closeout-2026-11-11`.
- Tidak ada perubahan kode, kontrak, migrasi, authorization, konfigurasi, secret, atau data.
- Tidak ada sesi terautentikasi: browser yang dipakai tidak login, dan agent tidak memasukkan
  kata sandi. Semua bukti di bawah adalah level artefak/HTTP publik, bukan E4 terautentikasi.

## Bukti (diambil 2026-11-11 ±14:50 WIB dari `https://qlickhub.vercel.app`)

| #   | Observasi                                                                        | Hasil                                                                                                        |
| --- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 1   | `GET /health`                                                                    | `status: ok`, database `connected`, `migrations.applied: 81`, `latest: 20261109000097-create-task-links.cjs` |
| 2   | Jumlah dan nama migrasi terakhir di `origin/main` (`apps/api/src/db/migrations`) | 81 file; terakhir `20261109000097-create-task-links.cjs` — sama dengan Production                            |
| 3   | `GET /` tanpa sesi                                                               | diarahkan ke `/login`                                                                                        |
| 4   | `GET /v1/workspaces` tanpa cookie                                                | `401`                                                                                                        |
| 5   | Bundle utama `assets/index-aU_vXOE_.js`, header `last-modified`                  | `Tue, 10 Nov 2026 06:59:46 GMT` — ±15 menit setelah merge PR #119 (`2026-11-10 06:44:04 UTC`)                |
| 6   | Pencarian teks di bundle utama + 91 chunk yang dirujuknya                        | lihat tabel per item                                                                                         |

Batas bukti 5–6: ini menunjukkan artefak frontend yang dilayani memuat kode tersebut. Ini tidak
membuktikan perilaku backend, authorization, atau alur terautentikasi. ID deployment Vercel dan
status CI tidak diperiksa (tidak ada akses GitHub API/Vercel pada sesi ini).

## Hasil per item

| Item                                 | Merge di `main`                            | Bukti Production baca-saja                                                                       | Masih kurang sebelum G6                                                                                                                                       |
| ------------------------------------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FEAT-PRD-MERMAID-STUDIO              | PR #119 (`4f0938a2`)                       | Chunk memuat `Mermaid Studio` dan `Diagram yang disunting`                                       | Smoke terautentikasi (sisip, edit ulang, simpan Brief); keputusan G6                                                                                          |
| SUBTASK-SCHEDULE-WITHIN-FEATURE (F1) | PR #112 (`86638592`)                       | Bundle memuat pesan klien `Jadwal tidak sesuai rentang Feature`; tanpa migrasi                   | Smoke terautentikasi: root shrink 409, child range 400, simpan valid, flag legacy; deployment/recovery ID; G6                                                 |
| FEATURE-REFERENCES-MEDIA (F2)        | PR #114 (`a98b9360`), PR #115 (`e82df3c8`) | Migrasi 97 `create-task-links` applied; chunk memuat `Referensi & Media`                         | E4 AC-F2.1–AC-F2.9 terautentikasi; QA sign-off; keputusan rilis PO; G6                                                                                        |
| DEADLINE-REMINDER-CRON               | PR #103 (`d11463f6`)                       | Tidak ada `check-deadlines` di bundle (pemicu browser sudah hilang dari artefak, mendukung AC-7) | `CRON_SECRET` di Vercel, runbook Supabase Cron, AC-8 (pemanggilan manual 200 + run terjadwal) oleh Owner; G5; G6. Endpoint cron tidak dipanggil pada sesi ini |
| FEATURE-SPEC-TASK-AI-TIMEOUT         | PR #109 (`57bb0beb`)                       | Hanya tidak langsung: Production melayani build setelah merge. Perubahan ada di backend          | Observasi satu generate Task AI di Production (mengubah draf, jadi di luar batas baca-saja) atau log Vercel                                                   |
| QA-DESK-SIMPLIFY                     | PR #37, #51, #52                           | Tidak ada bukti baru yang spesifik                                                               | Smoke test Production sebagai QA (E4); G6                                                                                                                     |
| RELEASE-DEADLOCK-A1-A2               | PR #36, #41                                | Chunk copy memuat `Bug belum terverifikasi` (A2)                                                 | Verifikasi Production sebagai QA (E4): tolak sign-off dengan alasan; G6                                                                                       |
| UI-WORKSPACE-REFRESH                 | PR #59                                     | Tidak dapat diperiksa tanpa sesi                                                                 | AC-1.1 (hard refresh), AC-2.1/AC-2.2 (filter-switch, detail drawer) pada sesi terautentikasi                                                                  |

## Kesimpulan

Tidak ada item yang dapat dinyatakan `Done` dari bukti baca-saja tanpa sesi. Yang berubah:
status `TODO.md` untuk item yang sudah merge dikoreksi agar sesuai `main`, dan sisa pekerjaan tiap
item dipersempit menjadi verifikasi terautentikasi dan keputusan G6 Owner.

**Unknown / unverified:** status CI tiap PR, ID deployment Vercel, perilaku terautentikasi semua
item, serta apakah `CRON_SECRET` dan job Supabase Cron sudah dipasang.

## Validasi

Perintah dan hasil dicatat pada deskripsi PR (`npm run docs:check`, `npm run docs:completeness`).
