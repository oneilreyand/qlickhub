# VERCEL-PRODUCTION-BRANCH — Tahap 1: Opsi Solusi (Decision Snapshot)

**Status:** Disetujui
**Gerbang:** G1 — disetujui oleh Owner
**Problem:** [problem.md](problem.md)
**ADR:** ADR 031 (disusun pada Tahap 2)
**Applicable Policy IDs:** AI-006, AI-013, AI-020, DOC-002, SDLC-001

Format mengikuti Decision Snapshot di `docs/4_AGENT_DEV_GUIDELINES.md` §2A.E.

## 1. Kondisi sekarang

- Berdasarkan inferensi (E1) dari laporan rekonsiliasi (`docs/reports/DOC_STATUS_RECONCILIATION_2026-10-05.md` §D3), Vercel Production Branch saat ini mengarah ke `main`.
- Setiap kali PR ter-merge ke `main` (termasuk PR Tier 1 via GitHub auto-merge), Vercel membuat deployment Production.
- `vercel.json` saat ini hanya mengonfigurasi `buildCommand`, `outputDirectory`, `functions`, dan `rewrites` tanpa pengondisian git branch.

## 2. Opsi

| Dimensi | Opsi A (Rekomendasi): Dedicated `production` Branch | Opsi B: `vercel.json` (git.deploymentEnabled.main=false) | Opsi C: Vercel Manual Promotion | Opsi 0: Tidak dikerjakan |
| --- | --- | --- | --- | --- |
| Ringkasan | Pindahkan Production Branch Vercel ke `production`. Branch `main` hanya menghasilkan Preview deployment. Rilis ke Production dilakukan via PR `main` → `production` yang di-merge Owner secara manual (tanpa auto-merge). | Nonaktifkan deployment otomatis pada `main` via konfigurasi `vercel.json` atau setting Vercel ignore build. Deploy via CLI `vercel --prod`. | Biarkan `main` ter-deploy, tapi rilis Production dilakukan dengan tombol "Promote to Production" di dashboard Vercel. | Biarkan kondisi sekarang (merge `main` langsung deploy Production). |
| Pro | 1. Standar industri GitOps yang bersih. 2. Riwayat rilis Production terekam jelas di git log branch `production`. 3. `main` tetap memiliki Preview deployment otomatis untuk verifikasi dan smoke test. 4. Urutan rilis terkendali: Preview OK → Migrasi DB manual → Owner merge PR ke `production` → Vercel deploy. 5. Menyelesaikan konflik ADR-028 vs AI-013 secara tuntas. | 1. Tidak memerlukan branch baru di GitHub. 2. Mengontrol eksekusi deploy melalui CLI. | 1. Memakai fitur bawaan UI Vercel. 2. Tidak perlu git branch baru. | Tidak perlu perubahan konfigurasi apa pun. |
| Kontra | Perlu memelihara dua branch long-lived (`main` dan `production`) serta mengatur branch protection di GitHub. | 1. Menonaktifkan build di `main` menghilangkan Preview deployment otomatis untuk branch `main`. 2. Deploy CLI lokal rawan drift lingkungan kerja dan kredensial. | 1. Tidak ada jejak git commit khusus untuk rilis Production (audit trail terputus dari git). 2. Rawan salah pilih deployment Preview yang dipromosikan. | Risiko tinggi error runtime Production dan pelanggaran AI-013 tetap berlangsung. |
| Lapisan terdampak | Dokumen SSoT dan Konfigurasi Git/Vercel | Konfigurasi `vercel.json` dan SSoT | Konfigurasi Vercel dan SSoT | — |
| Data / migrasi | Tidak ada | Tidak ada | Tidak ada | — |
| Authorization | Owner eksklusif me-merge ke `production` | Operator yang memegang token Vercel | Operator Vercel Dashboard | — |
| Shared contract | Tidak berubah | Tidak berubah | Tidak berubah | — |
| Estimasi WRA | 5/16 | 5/16 | 5/16 | — |
| Risiko & rollback | Rollback mudah: `git revert` di branch `production` atau alihkan alias Vercel ke deployment sebelumnya. | Rollback konfigurasi `vercel.json`. | Alihkan domain di dashboard. | — |

## 3. Rekomendasi

Pilih **Opsi A (`production` branch)**:
- Memisahkan secara tegas siklus integrasi (`main` → Preview) dan siklus rilis (`production` → Production).
- Menjamin kepatuhan penuh terhadap AI-013: PR rilis `main` → `production` **tidak boleh menggunakan auto-merge**; hanya Owner yang dapat melakukan merge setelah memeriksa Preview dan menjalankan migrasi skema database.
- Memastikan urutan baku: Uji coba Preview → Eksekusi Migrasi Database (`npm run db:migrate:prod`) → Owner merge PR ke `production` → Vercel Production Deploy → Smoke Test.

## 4. Dampak policy

- Mengubah policy tata kelola rilis dan deployment.
- Wajib membuat **ADR-031** yang merinci:
  1. Penetapan branch `production` sebagai Production Branch Vercel.
  2. Perubahan peran `main` menjadi branch integrasi penghasil Preview.
  3. Otorisasi eksklusif Owner untuk merge ke `production` (dilarang auto-merge pada PR rilis).
  4. Penyempurnaan ADR-028 dan penutupan celah konflik dengan AI-013.
  5. Urutan rilis: Migrasi -> Merge -> Deploy -> Rollback plan.
- Memperbarui SSoT: `docs/DEPLOYMENT_AND_ENVIRONMENTS.md` (§5, §6, §8), `docs/POLICY_REGISTRY.md` (AI-013, AI-020), dan `docs/4_AGENT_DEV_GUIDELINES.md` (§2A.A.1).

## 5. Unknown

| Pertanyaan | Mengapa penting | Siapa bisa menjawab |
| --- | --- | --- |
| Konfigurasi env var dan database scope Preview di Vercel (Preview tidak boleh memakai DB Production) | Menghindari polusi atau korupsi data Production saat Preview berjalan | Owner (pemeriksaan di dashboard Vercel) |
| Apakah `.github/workflows/ci.yml` perlu trigger untuk branch `production` | Memastikan branch `production` terlindungi oleh workflow verifikasi CI | Agent (analisis workflow `ci.yml`) |
| Apakah `sdlc:check` dan `owner-gate` lolos untuk PR rilis `main` → `production` | Memastikan proses rilis tidak terhambat oleh script verifikasi gerbang | Dibuktikan dengan satu PR uji rilis |

## 6. Keputusan

**Dipilih:** Opsi A (`production` branch) — oleh Owner, 2026-10-13 (persetujuan G1)
**Ditolak:** Opsi B (kehilangan Preview otomatis di `main`), Opsi C (kehilangan audit trail git untuk rilis), Opsi 0 (membiarkan risiko runtime dan pelanggaran AI-013).
