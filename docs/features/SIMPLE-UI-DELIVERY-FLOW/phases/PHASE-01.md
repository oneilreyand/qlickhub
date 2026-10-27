# SIMPLE-UI-DELIVERY-FLOW — Tahap 4: Build Phase 01 — Shell sederhana

**Status:** Berjalan
**Breakdown:** [../breakdown.md](../breakdown.md)
**AC phase ini:** AC-1.1, AC-1.2
**Applicable Policy IDs:** AI-009, AI-013, AI-014, UI-001, UI-002, UI-003, UI-004, UI-005

## 1. Approval Window

| Item                             | Isi                                                                                                                                                                                                                                                            |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task ID                          | P1-FE-1, P1-FE-2, P1-FE-3, P1-FE-4, P1-QA-1                                                                                                                                                                                                                    |
| Branch / baseline commit         | `feat/simple-ui-p1-shell` dari `docs/doc-portal-close` @ `ffecc93` (PR #59)                                                                                                                                                                                    |
| File/path yang diizinkan         | `apps/web/src/components/layout/` (Sidebar, Header, AppLayout dan test-nya), molecule/atom yang sudah ada bila hanya dipakai ulang, `docs/features/SIMPLE-UI-DELIVERY-FLOW/` (phases, testing, README), `docs/reports/` (laporan P1), `TODO.md` (entri fitur)  |
| Urutan aksi yang diizinkan       | edit → test terarah → typecheck → build → `theme:check` → `docs:check` → UAT lokal → commit → push branch → PR ke `docs/doc-portal-close` (bukan `main`). **Tanpa merge, tanpa auto-merge, tanpa deploy.**                                                     |
| Pemeriksaan yang akan dijalankan | `npm --prefix apps/web run test -- --run src/components/layout`, `npm run typecheck:web`, `npm run build:web`, `npm run theme:check`, `npm run docs:check`; UAT Light/Dark di 1440, 1024, 768, 390 dibandingkan dengan `design/01-task-hub*.png`               |
| Risiko & recovery                | Shell dipakai semua halaman; recovery = revert commit di branch. Aturan visibilitas peran tidak boleh berubah (test Sidebar yang ada wajib lulus).                                                                                                             |
| Masa berlaku                     | Sampai PR P1 dibuat, atau berhenti bila perlu mengubah token, route, dependency, API, data, atau authorization                                                                                                                                                 |
| Pelaksana                        | Claude: seluruh edit, test, commit, push, dan PR. Test dan build dijalankan di salinan repo Linux di VM Mac (`$HOME/work/qlickhub`, `npm ci` terpisah) karena `node_modules` di folder repo khusus macOS; UAT lokal lewat browser di Mac pada `localhost:3000` |
| Disetujui                        | Owner (Reyand), 2026-10-27, pesan "setuju"                                                                                                                                                                                                                     |

## 2. Log perubahan

| Task | File berubah | Ringkasan     | Commit |
| ---- | ------------ | ------------- | ------ |
| —    | —            | Belum dimulai | —      |

## 3. Pemeriksaan yang dijalankan

| Perintah | Environment | Exit code | Pass / fail / skip | AC  |
| -------- | ----------- | --------- | ------------------ | --- |
| —        | —           | —         | Belum dijalankan   | —   |

## 4. Deviasi dari rencana

| Deviasi   | Alasan | Masih dalam scope? | Persetujuan baru? |
| --------- | ------ | ------------------ | ----------------- |
| Tidak ada | —      | —                  | —                 |

## 5. Hasil

- PR: belum dibuat.
- Lanjut ke [testing.md](../testing.md) untuk tahap 5.
