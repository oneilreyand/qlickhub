# MEMBER-ACCESS-HUB — Tahap 4: Build Phase 02 — Halaman matriks + undang

**Status:** Kandidat teruji
**Breakdown:** [../breakdown.md](../breakdown.md)
**AC phase ini:** AC-2.1, AC-2.2, AC-2.3
**Applicable Policy IDs:** AI-009, AI-013, AI-014, AUTH-001, AUTH-014

## 1. Approval Window

| Item                             | Isi                                                                                                                                                                                                                                                                                                             |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task ID                          | P2-FE-1, P2-QA-1                                                                                                                                                                                                                                                                                                |
| Branch / baseline commit         | `feat/member-access-p2` di atas `fix/task-links-404` (isi `main` #143 + perbaikan 404)                                                                                                                                                                                                                          |
| File/path yang diizinkan         | Web `pages/MemberAccessPage.tsx`, `organisms/MemberAccessMatrix.tsx`, `MemberAccessCellModal.tsx`, `memberAccessLabels.ts`, `memberAccessService.ts`, `App.tsx`, `Sidebar.tsx`, `sectionLabel.ts` dan test; test API `memberAccessApiIntegration.test.ts`; `docs/3_UI_ATOMIC_DESIGN_SYSTEM.md`; dokumen Feature |
| Urutan aksi yang diizinkan       | edit → test → commit → patch → Owner push → PR → merge                                                                                                                                                                                                                                                          |
| Pemeriksaan yang akan dijalankan | build, integration PostgreSQL, Vitest, cek visual, `npm run validate`                                                                                                                                                                                                                                           |
| Risiko & recovery                | revert PR; tanpa migrasi dan tanpa endpoint baru — semua perubahan lewat endpoint anggota per Workspace yang sudah ada                                                                                                                                                                                          |
| Masa berlaku                     | sampai PR phase ini dibuat                                                                                                                                                                                                                                                                                      |
| Disetujui                        | Owner melalui chat, 2026-11-17 — "Setuju G2 G3 semua (Recommended)"; lanjut 2026-11-18 "ok jalankan"                                                                                                                                                                                                            |

## 2. Log perubahan

| Task    | File berubah                                                                                                                                                                  | Ringkasan                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Commit       |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| P2-FE-1 | `MemberAccessPage.tsx`, `MemberAccessMatrix.tsx`, `MemberAccessCellModal.tsx`, `memberAccessLabels.ts`, `memberAccessService.ts`, `App.tsx`, `Sidebar.tsx`, `sectionLabel.ts` | Halaman `/members` "Anggota & Akses" (menu di grup Lainnya, hanya untuk Owner/Admin di ≥1 Workspace): tab Semua / Menunggu aktivasi, cari nama/email, filter peran; matriks orang × Workspace dari `GET /v1/me/member-access`; sel → dialog ubah peran + spesialisasi, tambah ke Workspace, keluarkan (dengan konfirmasi) lewat endpoint anggota per Workspace; peran Owner, akses diri sendiri, dan Workspace arsip baca-saja; "Undang anggota" memakai ulang `InviteMemberModal` (banyak Workspace sekaligus) | PR phase ini |
| P2-QA-1 | `MemberAccessPage.test.tsx`, `Sidebar.test.tsx`, `AppRoutes.test.tsx`, `memberAccessApiIntegration.test.ts`                                                                   | 6 page test, visibilitas menu, 1 integration AC-2.1/AC-2.3                                                                                                                                                                                                                                                                                                                                                                                                                                                      | PR phase ini |

## 3. Pemeriksaan yang dijalankan

| Perintah                                                          | Environment                 | Exit code | Pass / fail / skip              | AC             |
| ----------------------------------------------------------------- | --------------------------- | --------- | ------------------------------- | -------------- |
| `node --test …/memberAccessApiIntegration.test.js`                | PostgreSQL 16 lokal         | 0         | 4/4                             | AC-2.1, AC-2.3 |
| Suite API penuh + Vitest penuh                                    | PostgreSQL 16 lokal         | 0         | API 748/748, Web 917/917        | regresi        |
| Cek visual `/members` (desktop, ponsel 390 px, gelap, dialog sel) | Chromium lokal, data contoh | —         | tanpa scroll horizontal halaman | AC-2.1         |
| `npm run validate`                                                | lokal                       | 0         | pass                            | —              |

## 4. Deviasi dari rencana

| Deviasi                                                                               | Alasan                                                                      | Masih dalam scope? | Persetujuan baru? |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------ | ----------------- |
| Tab "Akses sementara", template peran, Impor CSV, dan Kirim ulang belum ada           | Milik P5, P4, dan P3                                                        | Ya                 | Tidak             |
| Undang banyak email sekaligus belum ada; modal yang dipakai ulang menerima satu email | AC-2.2 meminta memakai ulang modal yang ada; banyak email bersama CSV di P4 | Ya                 | Tidak             |

## 5. Hasil

- PR: Tier 1 (tanpa migrasi, policy, atau SSoT Tier 2).
- Lanjut ke [testing.md](../testing.md).
