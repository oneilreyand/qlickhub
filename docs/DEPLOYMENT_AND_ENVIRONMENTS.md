# Deployment & Environments — Qlick Hub

**Status:** Active operational guide  
**Owner:** Engineering  
**Last reviewed:** 2026-09-02  
**Applicable Policy IDs:** `DOC-001`, `DOC-004`, `DATA-001`

Panduan ini adalah pintu masuk operasional untuk menjalankan Qlick Hub secara lokal serta
merilisnya ke Vercel Preview dan Production. Kebijakan domain, keamanan, data, dan pengujian
tetap mengikuti [Architecture](1_ARCHITECTURE.md) dan
[Agent & Developer Guidelines](4_AGENT_DEV_GUIDELINES.md). Laporan di `docs/reports/` adalah
bukti historis, bukan petunjuk konfigurasi aktif.

## 1. Ringkasan URL

| Environment | Web                           | API base                         | Health check                            | Sumber konfigurasi                      |
| ----------- | ----------------------------- | -------------------------------- | --------------------------------------- | --------------------------------------- |
| Local       | `http://localhost:3000`       | `http://localhost:4000/v1`       | `http://localhost:4000/v1/health`       | root `.env` + `apps/web/.env.local`     |
| Preview     | URL unik dari Vercel          | `/v1` pada origin yang sama      | `<preview-url>/v1/health`               | Vercel Preview Environment Variables    |
| Production  | `https://qlickhub.vercel.app` | `https://qlickhub.vercel.app/v1` | `https://qlickhub.vercel.app/v1/health` | Vercel Production Environment Variables |

Konfigurasi yang direkomendasikan adalah **same-origin**: browser selalu memakai `/v1` di
Preview/Production. `vercel.json` meneruskan rute itu ke Express API sehingga tidak perlu
menanam domain API di kode frontend dan cookie tetap first-party.

## 2. Satu sumber konfigurasi untuk setiap environment

| File/tempat                        | Fungsi                                                             | Boleh berisi secret?         | Masuk Git? |
| ---------------------------------- | ------------------------------------------------------------------ | ---------------------------- | ---------- |
| `.env.example`                     | Template kanonikal backend local                                   | Placeholder saja             | Ya         |
| `.env`                             | Nilai backend local yang benar-benar dipakai API dan Sequelize CLI | Ya                           | Tidak      |
| `apps/web/.env.example`            | Template kanonikal frontend local                                  | Tidak                        | Ya         |
| `apps/web/.env.local`              | Nilai browser local yang dipakai Vite                              | Tidak                        | Tidak      |
| `.env.production.example`          | Referensi nama variabel backend Production                         | Placeholder saja             | Ya         |
| `apps/web/.env.production.example` | Referensi variabel browser Production                              | Tidak                        | Ya         |
| Vercel Preview/Production          | Nilai runtime cloud yang sebenarnya, dipisah per scope             | Backend: ya; `VITE_*`: tidak | Tidak      |

`*.example` tidak pernah menjadi sumber runtime. `.env.development.example` hanya referensi
kompatibilitas; setup local baru harus memakai `.env.example`. API sengaja tidak memuat file
`.env.production` lokal ketika berjalan di Vercel.

## 3. Setup local paling singkat

Prasyarat: Node 24, npm 10+, serta PostgreSQL lokal dengan database development dan test yang
sesuai dengan URL di root `.env`.

```bash
npm ci
npm run env:setup:local
npm run env:check
npm run db:migrate
```

`env:setup:local` membuat `.env` dan `apps/web/.env.local` dari template hanya jika target belum
ada. Perintah ini idempotent: file yang sudah ada selalu dipertahankan dan nilainya tidak pernah
dicetak.

Jalankan aplikasi di dua terminal:

```bash
npm run dev:api
```

```bash
npm run dev:web
```

Buka `http://localhost:3000`. Frontend local memakai
`VITE_API_URL=http://localhost:4000/v1`; API memakai `LOCAL_DATABASE_URL` bila tersedia, lalu
fallback ke `DATABASE_URL`. `NODE_ENV=test` selalu memakai `TEST_DATABASE_URL` dan database test
harus disposable.

## 4. Batas secret dan variabel Production

Atur nilai Production melalui **Vercel Project Settings → Environment Variables → Production**.
Atur kumpulan terpisah pada scope Preview; jangan memakai database, JWT secret, folder Drive,
atau akun layanan Production untuk Preview.

### Backend-only

- Runtime: `NODE_ENV`, `DATABASE_URL`, `DATABASE_SSL`, `DATABASE_POOL_MAX`, `JWT_ACCESS_SECRET`,
  `JWT_ISSUER`, `JWT_AUDIENCE`, `JWT_ACCESS_TTL_MINUTES`, `CORS_ORIGIN`, `APP_URL`,
  `COOKIE_SAME_SITE`.
- Storage/email: `ATTACHMENT_STORAGE_PROVIDER`, `GOOGLE_DRIVE_ROOT_FOLDER_ID`,
  `GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`,
  `SMTP_PASS`, `SMTP_FROM`.
- Backend notifications: `FIREBASE_PROJECT_ID` dan salah satu credential service-account yang
  didukung.
- Distributed link-preview limit: `LINK_PREVIEW_RATE_LIMIT_STORE=upstash`,
  `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, dan `RATE_LIMIT_KEY_SECRET`. Semua
  variabel ini backend-only; token dan secret tidak boleh memakai prefix `VITE_*`.

Untuk Vercel serverless, `DATABASE_URL` harus memakai Supabase Transaction Pooler dan
`DATABASE_POOL_MAX=1`. `DATABASE_SSL=true` wajib di Production. Gunakan origin HTTPS eksplisit
pada `CORS_ORIGIN`; wildcard dilarang.

Preview dan Production wajib memakai resource Upstash yang terpisah dan terhubung ke scope
Vercel masing-masing. Runtime Production/Preview harus gagal startup bila store dipilih sebagai
`upstash` tetapi URL, token, atau secret identifier tidak tersedia. Gangguan sementara provider
akan memakai limiter memory lokal per instance dan warning tersanitasi; keadaan degradasi ini
tidak boleh dilaporkan sebagai enforcement global yang sehat.

### Browser-public

- `VITE_API_URL=/v1`
- `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`,
  `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`,
  dan opsional `VITE_FIREBASE_MEASUREMENT_ID`.

Semua `VITE_*` tertanam di JavaScript browser. Jangan pernah memakai prefix itu untuk database
URL, password, private key, JWT secret, atau service-account JSON.

### Release-only dan test-only

- `MIGRATION_DATABASE_URL` adalah koneksi Session Pooler/direct yang lebih berhak. Inject hanya
  ke runner rilis saat audit atau migrasi; jangan simpan di Vercel runtime.
- `TEST_DATABASE_URL` hanya untuk database PostgreSQL disposable di local/CI; jangan set pada
  Vercel Production.
- Alias `PRODUCTION_DATABASE_URL` tetap didukung untuk kompatibilitas lama, tetapi release baru
  harus memilih nama kanonikal `MIGRATION_DATABASE_URL`.

## 5. Alur Preview

1. Konfigurasikan seluruh variabel dengan scope **Preview** dan resource Preview tersendiri.
2. Jalankan `npm run validate`, `npm run env:check`, dan `npm run build` secara lokal.
3. Push branch/PR bila Git integration aktif, atau jalankan `vercel` untuk deploy manual.
4. Buka URL yang diberikan Vercel, lalu periksa root/login dan `/v1/health`.
5. Verifikasi request tanpa sesi ke endpoint terlindungi ditolak, lalu lakukan perjalanan peran
   terotentikasi pada Workspace validasi Preview.
6. Verifikasi link preview ke-31 untuk satu pengguna menerima `429 RATE_LIMITED`, pengguna lain
   memiliki bucket terpisah, dan header rate-limit tersedia. Jangan mencatat URL/token Redis.

Vercel menyediakan `VERCEL_URL`; middleware API memasukkan deployment origin tersebut ke
allowlist. `CORS_ORIGIN` tetap harus berisi origin stabil yang memang diizinkan.

## 6. Alur rilis Production

Production bukan sekadar menjalankan perintah deploy. Gunakan urutan berikut agar aplikasi dan
schema tidak drift:

1. Pastikan perubahan sudah memiliki persetujuan rilis dan laporan verifikasi yang berlaku.
2. Jalankan `npm ci`, `npm run validate`, `npm run env:check`, dan `npm run build`.
3. Audit target database dan status seluruh canonical migration secara read-only.
4. Siapkan backup/restorable recovery plan sebelum migrasi yang mengubah schema.
5. Dengan persetujuan eksplisit untuk target Production, inject `MIGRATION_DATABASE_URL` ke
   runner rilis dan jalankan `npm run db:migrate:prod`. Jangan menjalankan `db:migrate:undo`
   secara otomatis pada data Production.
6. Deploy ke Production melalui Git integration yang telah disetujui atau `vercel --prod`.
7. Verifikasi root/login, `/v1`, `/v1/health`, koneksi database, CORS dari origin Production,
   penolakan endpoint terlindungi tanpa sesi, lalu smoke test terotentikasi per peran.
8. Catat deployment ID, URL, command, hasil, warnings, migration status, dan rollback target di
   `docs/reports/` tanpa menyalin nilai env.

Migrasi tidak dijalankan otomatis dari `vercel.json`; ini disengaja agar build web/API tidak
diam-diam mengubah schema. Utamakan migrasi additive/backward-compatible sebelum deploy kode.

## 7. URL Production dan custom domain

URL Production kanonikal saat ini adalah `https://qlickhub.vercel.app`. Jika custom domain
ditambahkan, kode frontend tidak perlu diubah selama web dan API tetap same-origin:

1. Tambahkan dan verifikasi domain di Vercel.
2. Ubah `APP_URL` dan `CORS_ORIGIN` ke domain HTTPS baru.
3. Pertahankan `VITE_API_URL=/v1`.
4. Tambahkan domain ke authorized domains Firebase bila Firebase Authentication digunakan.
5. Redeploy lalu ulangi smoke check CORS, cookie/session, reset-password link, dan health.

Hindari memisahkan web dan API ke dua domain kecuali benar-benar diperlukan; pemisahan itu
menambah konfigurasi CORS, cookie lintas situs, dan risiko salah scope.

## 8. Rollback dan pemeriksaan cepat

- **Aplikasi:** alihkan alias Production ke deployment Vercel terakhir yang terbukti sehat.
- **Database:** jangan menghapus tabel/kolom sebagai rollback spontan. Gunakan recovery plan
  migrasi yang disetujui; deployment lama harus tetap kompatibel dengan migrasi additive.
- **Secret bermasalah:** rotasi di provider/Vercel, redeploy, lalu cabut nilai lama. Jangan
  menyalin secret ke commit, chat, TODO, atau laporan.
- **Health `503`:** periksa koneksi/pool database dan migration status sebelum menyimpulkan login
  atau frontend rusak.

Checklist minimum setelah setiap deploy:

- `/` membuka/redirect ke login tanpa halaman 404.
- `/v1` dan `/v1/health` merespons; health melaporkan database connected.
- Origin yang tidak diizinkan gagal; origin deployment yang benar lolos.
- Endpoint terlindungi menolak request tanpa sesi.
- Login dan satu journey role-aware memakai record persisten dari backend.
- Upload/read evidence memakai storage environment yang benar, bukan fallback local.

## 9. Bukti konfigurasi terdahulu

- [Production release](reports/PRODUCTION_RELEASE_2026-08-28.md)
- [Production database pool repair](reports/PRODUCTION_DB_CONNECTION_POOL_2026-08-29.md)
- [Local performance and security hardening](reports/LOCAL_PERFORMANCE_AND_SECURITY_HARDENING_2026-09-01.md)

Gunakan tautan tersebut untuk histori keputusan/hasil saat itu; gunakan dokumen ini untuk langkah
operasional yang aktif.
