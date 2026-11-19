# MEMBER-ACCESS-HUB — Tahap 4: Build Phase 06 — Tab Pengaturan Workspace

**Status:** Kandidat teruji
**Breakdown:** [../breakdown.md](../breakdown.md)
**AC phase ini:** AC-6.1
**Applicable Policy IDs:** AI-009, AI-013, AUTH-001, AUTH-014, AUTH-015

## 1. Approval Window

| Item                             | Isi                                                                                                                                                                                  |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Task ID                          | P6-FE-1                                                                                                                                                                              |
| Branch / baseline commit         | `feat/settings-tabs` dari `origin/main` @ `bd3a0025` (PR #147)                                                                                                                       |
| File/path yang diizinkan         | Web `WorkspaceSettingsPage.tsx` + test, `features/workspaces/*`, `WorkspaceMembersTable.tsx`, organism log audit, `Tabs.tsx`, `MyCapacitySettings.tsx`, service web; dokumen Feature |
| Urutan aksi yang diizinkan       | edit → test → commit → patch → Owner push → PR → merge                                                                                                                               |
| Pemeriksaan yang akan dijalankan | Vitest, `npm run validate`, tangkapan layar (suite API tidak perlu: tidak ada perubahan API)                                                                                         |
| Risiko & recovery                | revert PR; hanya web, tanpa migrasi dan tanpa endpoint baru                                                                                                                          |
| Masa berlaku                     | sampai PR phase ini dibuat                                                                                                                                                           |
| Disetujui                        | Owner melalui chat, 2026-11-17 — "Setuju G2 G3 semua (Recommended)"; lanjut 2026-11-19 ("ok jalankan")                                                                               |

## 2. Log perubahan

| Task    | File berubah                                                                                           | Ringkasan                                                                                                                                                                                                                    | Commit       |
| ------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| P6-FE-1 | `WorkspaceSettingsPage.tsx`, `features/workspaces/settingsTabs.ts`                                     | Halaman jadi tab Umum, Kalender & Kapasitas, Anggota, Alur & Kebijakan, QA, Log Audit (Owner/Admin), Zona Bahaya (Owner). Tab aktif di `?tab=` (Umum tanpa parameter); tab tak dikenal/tak berhak kembali ke Umum            | PR phase ini |
| P6-FE-1 | `WorkspaceMembersTable.tsx`, `MyCapacitySettings.tsx`, `personalCapacityService.ts`                    | Tombol "Kapasitas & cuti" per anggota (Owner/Admin) membuka modal kapasitas dan cuti orang itu lewat `/v1/users/:userId/capacity` dan `/time-off` (AUTH-015, sudah ada sejak WORK-FOUNDATION P4)                             | PR phase ini |
| P6-FE-1 | `WorkspaceAuditLogCard.tsx`, `workspaceAuditLabels.ts`, `WorkspaceAuditLog.tsx`, `workspaceService.ts` | Tab Log Audit: 50 kejadian keanggotaan terakhir dari `GET /v1/workspaces/:id/activities?entityType=workspace_membership`, kalimat bahasa Indonesia; pembatalan undangan dikenali dari metadata `reason: invitation_canceled` | PR phase ini |
| P6-FE-1 | `Tabs.tsx`                                                                                             | Varian underline: label tidak patah baris, daftar tab bergulir horizontal di ponsel                                                                                                                                          | PR phase ini |
| P6-QA-1 | `WorkspaceSettingsPage.test.tsx`                                                                       | Test lama dibungkus router dengan `?tab=` yang sesuai; 4 test baru (tab + URL, Developer, modal kapasitas, log audit)                                                                                                        | PR phase ini |

## 3. Pemeriksaan yang dijalankan

| Perintah                                                            | Environment       | Exit code | Pass / fail / skip                   | AC      |
| ------------------------------------------------------------------- | ----------------- | --------- | ------------------------------------ | ------- |
| `npx vitest run src/pages/__tests__/WorkspaceSettingsPage.test.tsx` | lokal             | 0         | 14/14                                | AC-6.1  |
| Vitest penuh                                                        | lokal             | 0         | 922/922 (154 file)                   | regresi |
| `npm run validate`                                                  | lokal             | 0         | pass (0 error)                       | —       |
| Tangkapan layar desktop, ponsel 390 px, gelap                       | Vite + Playwright | 0         | tanpa error, tanpa scroll horizontal | AC-6.1  |

## 4. Deviasi dari rencana

| Deviasi                     | Alasan                                                                                                      | Masih dalam scope? | Persetujuan baru? |
| --------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------ | ----------------- |
| Log audit hanya keanggotaan | Endpoint activities sudah ada dan dibatasi per Workspace; jenis entitas lain tetap di halaman masing-masing | Ya                 | Tidak             |
| Tidak menyentuh API         | Endpoint kapasitas per orang dan activities sudah tersedia                                                  | Ya                 | Tidak             |

## 5. Hasil

- PR: Tier 1 (hanya web dan dokumen Feature); tanpa migrasi.
- Lanjut ke [testing.md](../testing.md).
