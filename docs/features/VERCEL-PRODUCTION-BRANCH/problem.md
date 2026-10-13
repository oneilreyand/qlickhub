# VERCEL-PRODUCTION-BRANCH — Tahap 0: Problem Statement

**Status:** Disetujui
**Gerbang:** G0 — disetujui oleh Owner
**Applicable Policy IDs:** SDLC-001, AI-013, AI-020, DOC-002

## 1. Masalah

Berdasarkan inferensi dari riwayat deployment, setiap merge ke branch `main` langsung memicu auto-deploy Vercel ke Production. Kondisi ini menimbulkan dua risiko:
1. PR Tier 1 hasil auto-merge ADR-028 langsung ter-deploy ke Production tanpa persetujuan eksplisit baru dari Owner, bertentangan dengan batasan AI-013.
2. Migrasi database (`npm run db:migrate:prod`) tidak dijalankan otomatis dari `vercel.json` (DEPLOYMENT_AND_ENVIRONMENTS.md §6), sehingga kode aplikasi yang membutuhkan skema baru dapat ter-deploy mendahului migrasi database dan memicu kegagalan runtime di Production.

## 2. Bukti masalah

| Bukti | Sumber | Level |
| --- | --- | --- |
| Riwayat deployment GitHub mencatat `vercel[bot]` men-deploy setiap merge `main` ke environment Production (indikasi bahwa Vercel Production Branch saat ini mengarah ke `main`) | `docs/reports/DOC_STATUS_RECONCILIATION_2026-10-05.md` §D3 | E1 (inferensi dokumen) |
| ADR-028 Tier 1 auto-merge berjalan otomatis tanpa approval manual Owner | `docs/adr/ADR-028-TIERED-AUTO-MERGE.md` | E1 |
| AI-013 mewajibkan persetujuan manusia baru sebelum deployment atau mutasi Production | `docs/POLICY_REGISTRY.md` (AI-013), `docs/4_AGENT_DEV_GUIDELINES.md` §2A.A.1 | E1 |
| Migrasi tidak otomatis dijalankan dari `vercel.json` untuk mencegah perubahan skema diam-diam | `docs/DEPLOYMENT_AND_ENVIRONMENTS.md` §6 | E1 |

## 3. Siapa yang terdampak

| Role | Situasi | Seberapa sering | Dampak |
| --- | --- | --- | --- |
| Owner | Menanggung risiko rilis kode yang belum siap atau skema DB yang belum dimigrasi | Setiap kali PR `main` ter-merge | Kehilangan kendali gerbang rilis Production |
| User / End-user | Mengakses aplikasi di Production yang berpotensi error karena schema drift | Saat rilis menyertakan migrasi | Kegagalan fungsi atau downtime aplikasi |
| Developer / AI Agent | Tidak leluasa menggabungkan kode integrasi ke `main` | Setiap siklus sprint | Ketakutan memicu rilis prematur |

## 4. Bila tidak dikerjakan

- Terus terjadi konflik tata kelola antara ADR-028 (Tier 1 auto-merge) dan AI-013 (larangan deploy Production tanpa izin eksplisit manusia).
- Insiden runtime Production akibat balapan antara auto-deploy Vercel dan eksekusi manual migrasi PostgreSQL.

## 5. Metrik sukses

| Metrik | Baseline saat ini | Target | Cara mengukur |
| --- | --- | --- | --- |
| Lingkungan deploy saat merge ke `main` | Production (inferensi E1) | Preview | Log deployment ID dan environment Vercel |
| Akses deploy ke Production | Otomatis via merge ke `main` | Eksklusif via branch `production` yang di-merge Owner | GitHub PR dan log deployment Vercel |

## 6. Batasan dan di luar scope

- Tidak mengubah runtime kode aplikasi (`apps/`, `packages/`, `api/`, `database/`).
- Agent tidak melakukan modifikasi langsung pada Vercel UI/API maupun GitHub repository settings (langkah konfigurasi disiapkan untuk dieksekusi Owner).

## 7. Unknown

| Pertanyaan | Mengapa penting | Siapa bisa menjawab |
| --- | --- | --- |
| Konfigurasi env var dan database scope Preview di Vercel (Preview tidak boleh memakai DB Production) | Menghindari polusi atau korupsi data Production saat Preview berjalan | Owner (pemeriksaan di dashboard Vercel) |
| Apakah `.github/workflows/ci.yml` perlu trigger untuk branch `production` | Memastikan branch `production` terlindungi oleh workflow verifikasi CI | Agent (analisis workflow `ci.yml`) |
| Apakah `sdlc:check` dan `owner-gate` lolos untuk PR rilis `main` → `production` | Memastikan proses rilis tidak terhambat oleh script verifikasi gerbang | Dibuktikan dengan satu PR uji rilis |
