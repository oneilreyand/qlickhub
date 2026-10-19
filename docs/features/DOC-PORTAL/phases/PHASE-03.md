# DOC-PORTAL — Tahap 4: Build Phase 03 — Portal lengkap + reuse

**Status:** Kandidat teruji
**Breakdown:** [../breakdown.md](../breakdown.md)
**AC phase ini:** AC-4.1 (ERD, Governance, TODO aktif, UI/UX Matrix), AC-4.2, AC-4.5, AC-5.1, AC-5.2, AC-6.1
**Applicable Policy IDs:** AI-009, AI-013, AI-014, SDLC-001

## 1. Approval Window

| Item                             | Isi                                                                            |
| -------------------------------- | ------------------------------------------------------------------------------ |
| Task ID                          | P3-FE-1, P3-FE-2, P3-BE-1, P3-DOC-1, P3-QA-1                                   |
| Branch / baseline commit         | `feat/doc-portal-p3` @ `998e998` (`origin/main`, setelah PR #44)               |
| File/path yang diizinkan         | `tools/docsys/**`, `docs/features/DOC-PORTAL/**`                               |
| Urutan aksi yang diizinkan       | edit → test → commit → push branch → PR (Tier 1, merge otomatis)               |
| Pemeriksaan yang akan dijalankan | `npm run validate`, smoke browser semua halaman, `checkSdlc`, `checkTier`      |
| Risiko & recovery                | Hanya portal lokal; revert PR                                                  |
| Masa berlaku                     | sampai PR Phase 3 dibuat                                                       |
| Disetujui                        | reyand (Owner), 2026-10-14 ("setuju" atas Approval Window Phase 3), sesi agent |

## 2. Log perubahan

| Task     | File berubah                                             | Ringkasan                                                                                                                                                                                                                          |
| -------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P3-FE-1  | `tools/docsys/portal/app.js`, `style.css`                | Halaman ERD (filter domain, kolom, relasi), Governance (policy per area, ADR, rule), TODO aktif (filter status, kolom PRD/BE/FE), UI/UX Matrix (pilih role, nilai per kriteria); badge gap per halaman; tab "Gap dokumen" di Fitur |
| P3-FE-1  | `tools/docsys/cli.mjs`, `core/extract.mjs`               | `docs:extract` menyertakan hasil completeness (rule, ringkasan, gap baru/baseline) dan `erd.domains` ke data portal                                                                                                                |
| P3-FE-2  | `tools/docsys/portal/*`                                  | Pencarian global (fitur, endpoint, schema, model, policy, ADR, TODO); nama entitas panjang dibungkus; dicek di 390 / 768 / 1440 px                                                                                                 |
| P3-BE-1  | `tools/docsys/__tests__/reuse.test.mjs`, `fixtures/alt/` | Core dijalankan pada proyek fixture dengan struktur dan nama berbeda; test anti-path proyek; pesan kebijakan dipindah ke `completeness.policyLabel` / `exceptionHint` di config                                                    |
| P3-DOC-1 | `tools/docsys/README.md`                                 | Perintah, struktur, config, rule, langkah memasang di proyek baru, cara menulis adapter                                                                                                                                            |
| P3-QA-1  | `tools/docsys/__tests__/portal.test.mjs`                 | Smoke browser halaman baru, badge, pencarian, tanpa scroll samping di 390 px                                                                                                                                                       |

## 3. Pemeriksaan yang dijalankan

| Perintah                                                               | Environment               | Exit code | Pass / fail / skip                                       | AC                     |
| ---------------------------------------------------------------------- | ------------------------- | --------- | -------------------------------------------------------- | ---------------------- |
| `npm run docsys:test`                                                  | workspace cloud, Node 22  | 0         | 24 / 0 / 4 (browser)                                     | AC-5.1, AC-5.2         |
| `DOCSYS_CHROMIUM=… node --test tools/docsys/__tests__/portal.test.mjs` | workspace cloud, Chromium | 0         | 4 / 0 / 0                                                | AC-4.1, AC-4.2, AC-4.5 |
| Screenshot 7 halaman × 1440 / 768 / 390 px pada repo ini               | workspace cloud           | 0         | 0 error JS; `scrollWidth` ≤ lebar layar di semua halaman | AC-4.2                 |
| `npm run validate`                                                     | workspace cloud           | 0         | lulus; completeness 130 gap lama, 0 baru                 | —                      |
| `npx eslint tools/docsys`                                              | workspace cloud           | 0         | 0 error                                                  | —                      |

Walkthrough per role (P3-QA-1, E4 pada data repo ini):

| Role      | Jalur                                                      | Hasil                                                            |
| --------- | ---------------------------------------------------------- | ---------------------------------------------------------------- |
| PO        | Beranda → TODO aktif → filter Blocked → kolom PRD/BE/FE    | 12 item lama tampil "Belum ditandai", sesuai baseline `DS-R03`   |
| Developer | Fitur → DOC-PORTAL → Endpoint; ERD → `test_cases` → relasi | Kolom, tipe, null, dan relasi masuk/keluar tampil                |
| QA        | UI/UX Matrix → QA; Fitur → tab Gap dokumen                 | 5 alur QA dengan 6 kriteria; 118 gap `DS-R01` berstatus Baseline |
| Owner     | Governance → policy per area, ADR, rule                    | 77 policy, 33 ADR, ringkasan 5 rule                              |

## 4. Deviasi dari rencana

| Deviasi                                                            | Alasan                                                                     | Masih dalam scope?     | Persetujuan baru? |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------- | ---------------------- | ----------------- |
| `docsys.config.json` ikut berubah (`policyLabel`, `exceptionHint`) | Teks kebijakan qlickhub dipindah dari core ke config agar AC-5.2 terpenuhi | Ya (bukan path Tier 2) | Tidak             |

## 5. Hasil

- PR: dibuat Owner dari branch `feat/doc-portal-p3` — Tier 1 — tidak ada file Tier 2.
- Lanjut ke [testing.md](../testing.md) untuk tahap 5, lalu [release.md](../release.md) untuk tahap 6.
