# MEMBER-ACCESS-HUB — Tahap 4: Build Phase 01 — API agregat Anggota & Akses

**Status:** Kandidat teruji
**Breakdown:** [../breakdown.md](../breakdown.md)
**AC phase ini:** AC-1.1, AC-1.2
**Applicable Policy IDs:** AI-009, AI-013, AI-014

## 1. Approval Window

| Item                             | Isi                                                                                                                                                                                                                                                 |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task ID                          | P1-BE-1, P1-QA-1                                                                                                                                                                                                                                    |
| Branch / baseline commit         | `feat/member-access-p1` dari `origin/main` @ `9941c5f2`                                                                                                                                                                                             |
| File/path yang diizinkan         | `packages/contracts/src/memberAccess.ts`, `apps/api/src/modules/workspaces/**` (route, `internal/memberAccess.ts`, test), `apps/api/src/app.ts` (mount route), `docs/1_ARCHITECTURE.md` + `docs/POLICY_REGISTRY.md` (AUTH-014), dokumen Feature ini |
| Urutan aksi yang diizinkan       | edit → test → commit → patch ke folder Owner → Owner push branch → PR → merge oleh Owner                                                                                                                                                            |
| Pemeriksaan yang akan dijalankan | build, integration test PostgreSQL, `npm run validate`                                                                                                                                                                                              |
| Risiko & recovery                | revert PR; endpoint baca saja, tanpa migrasi                                                                                                                                                                                                        |
| Masa berlaku                     | sampai PR phase ini dibuat                                                                                                                                                                                                                          |
| Disetujui                        | Owner melalui chat, 2026-11-17 — "Setuju G2 G3 semua (Recommended)" setelah merge PR #132                                                                                                                                                           |

## 2. Log perubahan

| Task    | File berubah                                                                                 | Ringkasan                                                                                                                                                                                                                                                                                                               | Commit       |
| ------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| P1-BE-1 | `memberAccess.ts` (contracts), `internal/memberAccess.ts`, `memberAccessRoutes.ts`, `app.ts` | `GET /v1/me/member-access`: Workspace tempat aktor Owner/Admin, jumlah anggota, setiap orang sekali dengan keanggotaan di Workspace itu saja (role, spesialisasi, tanggal bergabung) dan status aktivasi (`pending` bila belum menyetel password); 3 query tanpa N+1; 403 bila aktor tidak mengelola Workspace mana pun | PR phase ini |
| P1-QA-1 | `memberAccessApiIntegration.test.ts`                                                         | Owner A + Admin B + PO C: hanya A dan B; keanggotaan di C tidak bocor; undangan belum aktif = `pending`; Dev/QA 403; anonim 401; keanggotaan yang dihapus hilang                                                                                                                                                        | PR phase ini |
| SSoT    | `docs/1_ARCHITECTURE.md`, `docs/POLICY_REGISTRY.md`                                          | Aturan AUTH-014 (ADR-046 butir 1)                                                                                                                                                                                                                                                                                       | PR phase ini |

## 3. Pemeriksaan yang dijalankan

| Perintah                                           | Environment         | Exit code | Pass / fail / skip | AC             |
| -------------------------------------------------- | ------------------- | --------- | ------------------ | -------------- |
| `node --test …/memberAccessApiIntegration.test.js` | PostgreSQL 16 lokal | 0         | 3/3                | AC-1.1, AC-1.2 |
| Suite API penuh                                    | PostgreSQL 16 lokal | 0         | 706/706            | regresi        |
| `npm run validate`                                 | lokal               | 0         | pass               | —              |

## 4. Deviasi dari rencana

| Deviasi   | Alasan | Masih dalam scope? | Persetujuan baru? |
| --------- | ------ | ------------------ | ----------------- |
| Tidak ada | —      | —                  | —                 |

## 5. Hasil

- PR: Tier 2 (`docs/1_ARCHITECTURE.md`, Policy Registry); tanpa migrasi.
- Lanjut ke [testing.md](../testing.md).
