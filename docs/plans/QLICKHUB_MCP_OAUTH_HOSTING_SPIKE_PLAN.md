# QLICKHUB-PRODUCT-MCP — Rencana spike OAuth dan hosting (Opsi 2)

**Status:** Draft. Menunggu persetujuan Owner atas rencana ini dan Approval Window §9. Belum ada kode.
**Disusun:** Claude, 2026-11-18 (Asia/Jakarta)
**Baseline inspeksi:** `origin/main` @ `e710d525` (read-only) dan riset dokumentasi vendor, 2026-11-18.
**Feature:** [QLICKHUB-PRODUCT-MCP](../features/QLICKHUB-PRODUCT-MCP/README.md), keputusan terbuka di
[solution.md](../features/QLICKHUB-PRODUCT-MCP/solution.md).
**Policies terkait:** `AI-002`, `AI-006`, `AI-007`, `AI-009`, `AI-011`, `AI-013`, `AUTH-001`, `AUTH-002`,
`SDLC-001`, `SDLC-002`, `TEST-001`

Spike ini menjawab pertanyaan teknis yang memblokir G1: server OAuth, cara registrasi client, dan
lokasi hosting MCP. Hasilnya bukti dan rekomendasi untuk keputusan Owner, bukan fitur. Kode spike
tidak pernah di-merge ke `main`.

## 1. Fakta terkonfirmasi

| Area                       | Fakta                                                                                                                                                                                                                                                                                                                                                                                                              | Sumber                                                                                                                   | Implikasi                                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Login Qlick Hub            | Email + password milik Qlick Hub sendiri. Access token JWT HS256 di cookie HttpOnly `qa_access_token`, dengan sesi persisten dan refresh.                                                                                                                                                                                                                                                                          | `apps/api/src/modules/auth/jwt.ts`, `auth.routes.ts`                                                                     | Tidak ada identity provider eksternal. OAuth untuk MCP harus memakai login yang sudah ada.                        |
| Batas sesi                 | Maksimal 5 sesi aktif per user; sesi tertua otomatis dipensiunkan.                                                                                                                                                                                                                                                                                                                                                 | `auth/sessionManager.ts` L11–17                                                                                          | Grant MCP tidak boleh memakai tabel sesi login, karena bisa mengeluarkan user dari browser.                       |
| Supabase                   | Dipakai sebagai PostgreSQL dan Cron, bukan Supabase Auth.                                                                                                                                                                                                                                                                                                                                                          | `.env.example`, ADR-040                                                                                                  | Supabase Auth OAuth Server berarti memindahkan identitas user.                                                    |
| Hosting                    | Express API dibungkus satu Vercel Function (`api/index.mjs`), region `hnd1`; `/v1/*` di-rewrite ke function itu.                                                                                                                                                                                                                                                                                                   | `vercel.json`, `api/index.mjs`                                                                                           | MCP bisa ditambahkan sebagai rute di Express yang sama, atau dipisah.                                             |
| Environment                | Local, Vercel Preview (DB dan secret terpisah), Production.                                                                                                                                                                                                                                                                                                                                                        | `docs/DEPLOYMENT_AND_ENVIRONMENTS.md` §1–2                                                                               | Spike memakai Local dan Preview. Production tidak disentuh.                                                       |
| Spesifikasi MCP            | Revisi terbaru 2026-07-28: Streamable HTTP tanpa sesi (`Mcp-Session-Id` dihapus), tanpa handshake `initialize`, list endpoint tidak lagi bervariasi per koneksi, DCR dinyatakan deprecated dan diganti Client ID Metadata Documents (CIMD), klien wajib memvalidasi `iss`.                                                                                                                                         | [Changelog MCP 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28/changelog.md)                        | Model stateless cocok untuk Vercel. K4 (filter `tools/list` per role) perlu dicek ulang terhadap aturan list ini. |
| SDK TypeScript             | Paket v2 `createMcpHandler` melayani klien 2025-era dan 2026-07-28 dari satu endpoint; Express lewat `toNodeHandler` (`@modelcontextprotocol/node`); ada helper `bearerAuth` dan metadata.                                                                                                                                                                                                                         | [Panduan SDK 2026-07-28](https://ts.sdk.modelcontextprotocol.io/v2/migration/support-2026-07-28)                         | Satu endpoint bisa melayani klien lama dan baru. Versi paket dan API persisnya diverifikasi di S1.                |
| Claude                     | Mendukung DCR (default), CIMD (bila server mengiklankannya), dan client terdaftar. Callback `https://claude.ai/api/mcp/auth_callback`; Claude Code memakai loopback. Wajib: 401 + `WWW-Authenticate` ke protected resource metadata (RFC 9728), metadata authorization server, PKCE S256, rotasi refresh token untuk public client, endpoint OAuth menjawab ≤10 detik, dan dapat dijangkau dari `160.79.104.0/21`. | [Dokumentasi autentikasi connector Claude](https://www.claude.com/docs/connectors/building/authentication)               | Preview harus publik bagi Claude web (cek Vercel Deployment Protection).                                          |
| Supabase Auth OAuth Server | Mendukung DCR dan client terdaftar untuk MCP; user harus ada di Supabase Auth; aplikasi wajib membuat UI persetujuan; sign-in agent dihitung MAU.                                                                                                                                                                                                                                                                  | [Supabase MCP Authentication](https://supabase.com/docs/guides/auth/oauth-server/mcp-authentication)                     | Butuh migrasi identitas seluruh user. Kandidat lemah.                                                             |
| Klien lain                 | Codex (`codex mcp login`), Antigravity, OpenCode, dan Gemini CLI menyatakan dukungan MCP remote + OAuth. Versi protokol dan metode registrasi yang dipakai belum diverifikasi.                                                                                                                                                                                                                                     | `setup.md`, [OpenCode](https://opencode.ai/docs/mcp-servers), [Gemini CLI](https://geminicli.com/docs/tools/mcp-server/) | Diverifikasi di S2/S3.                                                                                            |

## 2. Pertanyaan yang dijawab spike

| ID  | Pertanyaan                                                                                       | Kriteria jawaban                                                                                                                                  |
| --- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1  | Versi protokol apa yang dipakai tiap klien Tier A/B, dan apakah satu endpoint melayani semuanya? | Log versi per klien; `tools/list` dan satu tool read sukses di setiap klien.                                                                      |
| Q2  | MCP di dalam Express yang sama atau dipisah?                                                     | Cold start, latency p50/p95 tool read, batas durasi function, dan dampak ke rute `/v1` yang ada.                                                  |
| Q3  | Server OAuth: dibangun di Qlick Hub, provider terkelola, atau Supabase Auth?                     | Bisa memakai login Qlick Hub tanpa migrasi identitas; PKCE S256; audience/resource binding; rotasi refresh; revocation; biaya; beban maintenance. |
| Q4  | Registrasi client: CIMD, DCR, atau keduanya?                                                     | Klien mana yang memakai cara mana, callback, dan perilaku bila salah satu dimatikan.                                                              |
| Q5  | Bagaimana grant MCP disimpan dan dicabut tanpa mengganggu sesi browser?                          | Desain grant terpisah dari `auth_sessions`; revocation dan role downgrade efektif ≤1 request.                                                     |
| Q6  | Apakah filter tool per role (K4) masih sah di 2026-07-28?                                        | Hasil `tools/list` per user dengan token berbeda; perilaku cache klien (`ttlMs`, `cacheScope: private`).                                          |

## 3. Opsi server OAuth (desk review awal)

| Opsi                                                                                          | Pro                                                                    | Kontra                                                                                            | Dalam spike                               |
| --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| A. Authorization server di Express Qlick Hub, memakai login dan halaman persetujuan Qlick Hub | Tanpa migrasi identitas; satu sumber user dan role; tanpa biaya vendor | Beban keamanan dan maintenance protokol ada di tim; perlu library matang (kandidat dinilai di S0) | Dibuat sebagai prototipe                  |
| B. Provider terkelola (contoh: WorkOS, Auth0, Stytch) yang memfederasi login Qlick Hub        | Protokol dikelola vendor; CIMD/DCR siap pakai                          | Biaya; integrasi "login lewat Qlick Hub" perlu dibuktikan; data identitas keluar ke vendor        | Desk review; prototipe hanya bila A gagal |
| C. Supabase Auth OAuth Server                                                                 | Satu ekosistem dengan DB                                               | Seluruh user harus pindah ke Supabase Auth; perubahan login web                                   | Desk review saja                          |

## 4. Tahap spike

| Tahap | Isi                                                                                                                                                                                                                                                                                                                                             | Environment | WRA  |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ---- |
| S0    | Desk review: library OAuth (dukungan PKCE, resource indicator, CIMD, DCR, rotasi refresh), harga provider B, dan dokumentasi tiap klien. Tanpa kode.                                                                                                                                                                                            | —           | 2/16 |
| S1    | Endpoint `/mcp` stateless di Express memakai SDK v2, dengan token dev statis hanya di Local. Tool read: `get_my_profile`, `list_my_workspaces`, `get_my_work_queue`, plus satu kasus ditolak. Uji dengan MCP Inspector dan klien CLI di Local.                                                                                                  | Local       | 6/16 |
| S2    | Prototipe opsi A: metadata RFC 9728/8414, `/authorize` memakai cookie login Qlick Hub + halaman persetujuan sederhana, `/token` dengan PKCE S256, CIMD + DCR, access token terikat audience `/mcp`, rotasi refresh token. Token ditandatangani dengan secret spike terpisah; tanpa tabel atau migration. Uji klien CLI lewat loopback di Local. | Local       | 8/16 |
| S3    | Deploy branch spike ke Vercel Preview. UAT Claude web/desktop, Claude Code, Codex, Antigravity (Tier A) dan OpenCode, Gemini CLI (Tier B). Ukur latency dan cold start.                                                                                                                                                                         | Preview     | 7/16 |
| S4    | Laporan spike, rekomendasi Q1–Q6, draf ADR auth MCP (status Proposed), pembaruan `solution.md`.                                                                                                                                                                                                                                                 | —           | 2/16 |

Setiap tahap dibuka setelah tahap sebelumnya selesai. Bila sebuah tahap melewati WRA 8, tahap itu dipecah
sebelum dikerjakan.

## 5. Batas dan stop conditions

- Kode spike hidup di branch `spike/mcp-oauth` dan worktree terpisah, tidak pernah di-merge ke `main`.
  Hasil yang dipakai nanti ditulis ulang lewat phase Build setelah G3 (`SDLC-002`).
- Tidak ada perubahan Production, data Production, secret Production, migration, atau perilaku login
  web yang ada.
- Token dan secret spike hanya di Local dan Preview; tidak pernah ditulis ke repo, laporan, atau log.
- Tidak ada tool write domain. Publish dan write Dev/QA menunggu ADR K3.
- Berhenti dan bertanya ke Owner bila: Preview memerlukan perubahan Deployment Protection, sebuah
  klien butuh akun atau langganan yang belum ada, opsi A ternyata butuh migration, atau temuan keamanan
  muncul.

## 6. Dampak

- **Data/interface:** tidak ada di `main`. Di branch spike: rute `/mcp` dan endpoint OAuth baru.
- **Authorization:** prototipe principal baru (token MCP) di branch spike saja; aturan aktif tidak berubah.
- **Migration risk:** tidak ada (token ditandatangani, tanpa tabel).
- **Change Impact Map:** branch spike menyentuh app wiring Express, modul auth baru, dan halaman
  persetujuan di web. Yang berubah di `main` hanya dokumen: laporan spike, `solution.md`, dan draf ADR
  Proposed.

## 7. Work Readiness Assessment

Keseluruhan spike: requirement 1 + lapisan 2 + data 0 + auth 2 + contract 1 + ketersinggungan 1 +
validasi 2 + eksternal 2 = **11/16, Ready after split** menjadi S0–S4 di §4 (masing-masing ≤8).

Akses yang perlu dipastikan di awal S1: Node ≥24 dan `npm ci` di shell perangkat (saat ini Node 22,
jaringannya belum diuji), atau alternatif workspace cloud dengan akses repo. Git yang menulis
(worktree, commit, push) dijalankan Owner. Akun klien Tier A/B untuk UAT disediakan dan dijalankan oleh
Owner dengan checklist dari pelaksana.

## 8. AC dan evidence

| AC   | Given / When / Then                                                                                                                                   | Evidence                                     | Level |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ----- |
| SP-1 | Setiap klien Tier A tercatat versi protokolnya, lalu memanggil `tools/list` dan `get_my_profile` dengan sukses                                        | Log server + tangkapan layar klien           | E4    |
| SP-2 | Token yang kedaluwarsa atau salah audience ditolak dengan 401 + `WWW-Authenticate`. Revocation hanya dirancang (Q5), karena spike tidak memakai tabel | Test otomatis di Local                       | E2    |
| SP-3 | User tanpa membership tidak melihat data Workspace lain lewat tool read                                                                               | Test di Local terhadap PostgreSQL disposable | E3    |
| SP-4 | Login MCP tidak mengurangi atau mengeluarkan sesi browser yang ada                                                                                    | Hitung sesi sebelum dan sesudah grant        | E3    |
| SP-5 | Latency p50/p95 tool read dan cold start di Preview tercatat                                                                                          | Log pengukuran                               | E2    |
| SP-6 | Q1–Q6 punya jawaban dengan bukti atau status Blocked yang jujur                                                                                       | Laporan spike                                | E1    |

## 9. Approval Window yang diminta

- **Task:** `QLICKHUB-PRODUCT-MCP-SPIKE-OAUTH-HOSTING`
- **Baseline:** `origin/main` terbaru saat Owner membuat worktree spike
- **Diizinkan:** S0 tanpa syarat. S1–S3 menulis kode hanya di worktree `wt-mcp-spike`, branch
  `spike/mcp-oauth`; push branch tersebut oleh Owner; deploy ke Vercel Preview oleh Owner. Menambah
  dependency SDK MCP dan satu library OAuth di branch spike.
- **Dokumen di `main` (lewat PR terpisah):** laporan spike, pembaruan `solution.md`, draf ADR Proposed.
- **Dilarang:** merge branch spike, Production (deploy, data, secret), migration, perubahan login web,
  tool write domain.
- **Berakhir:** 2026-12-04 23:59 WIB
- **Merge PR dokumen:** mengikuti pilihan Owner; PR dibuat sebagai draft tanpa auto-merge.
