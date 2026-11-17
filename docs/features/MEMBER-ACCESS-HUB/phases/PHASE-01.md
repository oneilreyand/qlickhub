# MEMBER-ACCESS-HUB — Tahap 4: Build Phase 01 — API agregat Anggota & Akses

**Status:** Menunggu persetujuan
**Breakdown:** [../breakdown.md](../breakdown.md)
**AC phase ini:** AC-1.1, AC-1.2
**Applicable Policy IDs:** AI-009, AI-013, AI-014

## 1. Approval Window

| Item                             | Isi                                                                                                           |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Task ID                          | P1-BE-1, P1-QA-1                                                                                              |
| Branch / baseline commit         | dibuat dari `origin/main` saat G3 disetujui                                                                   |
| File/path yang diizinkan         | `packages/contracts/src/memberAccess.ts`, `apps/api/src/modules/workspaces/**`, test-nya, dokumen Feature ini |
| Urutan aksi yang diizinkan       | edit → test → commit → patch ke folder Owner → Owner push branch → PR → merge oleh Owner                      |
| Pemeriksaan yang akan dijalankan | build, integration test PostgreSQL, `npm run validate`                                                        |
| Risiko & recovery                | revert PR; migrasi aditif punya `down`                                                                        |
| Masa berlaku                     | sampai PR phase ini dibuat                                                                                    |
| Disetujui                        | menunggu G3                                                                                                   |

## 2. Log perubahan

Diisi saat build.

## 3. Pemeriksaan yang dijalankan

Diisi saat build.

## 4. Deviasi dari rencana

Diisi saat build.

## 5. Hasil

Diisi saat build; lanjut ke [testing.md](../testing.md).
