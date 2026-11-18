# MEMBER-ACCESS-HUB — Tahap 4: Build Phase 03 — Kirim ulang / batalkan undangan

**Status:** Kandidat teruji
**Breakdown:** [../breakdown.md](../breakdown.md)
**AC phase ini:** AC-3.1, AC-3.2, AC-3.3
**Applicable Policy IDs:** AI-009, AI-013, AI-014, AUTH-001, AUTH-014

## 1. Approval Window

| Item                             | Isi                                                                                                                                                                                                                                                     |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task ID                          | P3-BE-1, P3-FE-1, P3-QA-1                                                                                                                                                                                                                               |
| Branch / baseline commit         | `feat/member-access-p3` dari `origin/main` @ `06d2ebde` (PR #146)                                                                                                                                                                                       |
| File/path yang diizinkan         | contracts `memberAccess.ts`; API `workspaces/internal/memberAccess.ts`, `memberAccessRoutes.ts`, test; Web `MemberAccessMatrix.tsx`, `MemberAccessPage.tsx`, `memberAccessService.ts`, test; Architecture + Policy Registry (AUTH-014); dokumen Feature |
| Urutan aksi yang diizinkan       | edit → test → commit → patch → Owner push → PR → `owner-approved` → merge                                                                                                                                                                               |
| Pemeriksaan yang akan dijalankan | build, integration PostgreSQL, Vitest, `npm run validate`                                                                                                                                                                                               |
| Risiko & recovery                | revert PR; tanpa migrasi (activity memakai aksi `member_removed` yang sudah ada dengan metadata `reason`)                                                                                                                                               |
| Masa berlaku                     | sampai PR phase ini dibuat                                                                                                                                                                                                                              |
| Disetujui                        | Owner melalui chat, 2026-11-17 — "Setuju G2 G3 semua (Recommended)"; lanjut 2026-11-18                                                                                                                                                                  |

## 2. Log perubahan

| Task    | File berubah                                                               | Ringkasan                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Commit       |
| ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| P3-BE-1 | `memberAccess.ts` (contracts + API), `memberAccessRoutes.ts`               | `POST /v1/me/member-access/:userId/resend-invite` (token baru menggantikan hash lama, email undangan dikirim ulang) dan `POST /v1/me/member-access/:userId/cancel-invite` (hapus keanggotaan yang belum aktif di Workspace yang dikelola, catat `member_removed` + `invitation_canceled`, kosongkan token bila tidak ada keanggotaan tersisa; tolak bila masih ada task aktif). Hanya Workspace tidak diarsipkan yang dikelola aktor; akun aktif 409; di luar lingkup 404 | PR phase ini |
| P3-FE-1 | `MemberAccessMatrix.tsx`, `MemberAccessPage.tsx`, `memberAccessService.ts` | Baris "Menunggu aktivasi" menampilkan "Diundang …", tombol Kirim ulang dan Batalkan (dengan dialog konfirmasi)                                                                                                                                                                                                                                                                                                                                                            | PR phase ini |
| P3-QA-1 | `memberAccessApiIntegration.test.ts`, `MemberAccessPage.test.tsx`          | 1 integration (AC-3.1–AC-3.3 + 403/404/409), 1 page test                                                                                                                                                                                                                                                                                                                                                                                                                  | PR phase ini |
| SSoT    | Architecture, Policy Registry                                              | AUTH-014: pengecualian kirim ulang/batalkan undangan                                                                                                                                                                                                                                                                                                                                                                                                                      | PR phase ini |

## 3. Pemeriksaan yang dijalankan

| Perintah                                           | Environment         | Exit code | Pass / fail / skip       | AC            |
| -------------------------------------------------- | ------------------- | --------- | ------------------------ | ------------- |
| `node --test …/memberAccessApiIntegration.test.js` | PostgreSQL 16 lokal | 0         | 5/5                      | AC-3.1–AC-3.3 |
| Suite API penuh + Vitest penuh                     | PostgreSQL 16 lokal | 0         | API 749/749, Web 918/918 | regresi       |
| `npm run validate`                                 | lokal               | 0         | pass                     | —             |

## 4. Deviasi dari rencana

| Deviasi                                                                    | Alasan                                                                              | Masih dalam scope? | Persetujuan baru? |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------ | ----------------- |
| Endpoint per orang (`/v1/me/member-access/:userId/…`), bukan per Workspace | Undangan dikirim untuk banyak Workspace sekaligus; satu tombol per baris di matriks | Ya                 | Tidak             |
| Tidak ada aksi activity baru                                               | Aksi baru butuh migrasi CHECK; cukup `member_removed` + metadata `reason`           | Ya                 | Tidak             |

## 5. Hasil

- PR: Tier 2 (Architecture, Policy Registry); tanpa migrasi.
- Lanjut ke [testing.md](../testing.md).
