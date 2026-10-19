# DOC-PORTAL — Tahap 5: Test & Review

**Status:** Berjalan
**Gerbang:** G5 — verifier independen atau CI yang mencakup seluruh AC
**Applicable Policy IDs:** AI-003, AI-004, AI-008, AI-010, TEST-001, DOC-005

Level bukti mengikuti `docs/4_AGENT_DEV_GUIDELINES.md` §2A.C: E0 klaim · E1 inspeksi · E2 dieksekusi ·
E3 persisten (PostgreSQL) · E4 runtime/UAT. Feature ini tidak menyimpan data, sehingga E3 tidak berlaku.

## 1. Matriks AC → bukti

| AC                 | Phase | Bukti dibutuhkan | Bukti tercapai | Unit/UI                                             | API/PostgreSQL | UAT/runtime                              | Status                  |
| ------------------ | ----- | ---------------- | -------------- | --------------------------------------------------- | -------------- | ---------------------------------------- | ----------------------- |
| AC-1.1             | P1    | E2               | E2             | `extract.test.mjs` AC-1.1                           | —              | `docs:extract` pada repo ini             | Lulus lokal             |
| AC-1.2             | P1    | E2 + E1          | E2 + E1        | fixture + `project.test.mjs` (24 endpoint)          | —              | —                                        | Lulus lokal             |
| AC-1.3             | P1    | E2               | E2             | fixture + 58 model = 58 file                        | —              | —                                        | Lulus lokal             |
| AC-1.4             | P1    | E2               | E2             | fixture + versi = `package.json`                    | —              | —                                        | Lulus lokal             |
| AC-1.5             | P1    | E2               | E2             | determinisme + tanpa jaringan/DB                    | —              | —                                        | Lulus lokal             |
| AC-4.1             | P1    | E4               | E2 + E4        | `portal.test.mjs` (Beranda, Fitur, filter)          | —              | Screenshot desktop repo ini              | Lulus lokal             |
| AC-4.3             | P1    | E2               | E2             | `portal.test.mjs` state empty                       | —              | —                                        | Lulus lokal             |
| AC-4.4             | P1    | E2               | E2             | `portal.test.mjs` file rusak + schemaVersion        | —              | —                                        | Lulus lokal             |
| AC-2.1–2.5         | P2    | E2               | E2             | `completeness.test.mjs` (fixture per rule)          | —              | `docs:completeness` pada repo ini        | Lulus lokal             |
| AC-3.1–3.4         | P2    | E2               | E2             | `completeness.test.mjs` (ratchet, CLI, mode report) | —              | simulasi gap baru → exit 1               | Lulus lokal             |
| AC-3.5             | P2    | E2               | E2             | `validate` memuat `docs:completeness`               | —              | CI `verify` PR #44                       | Lulus (merge `998e998`) |
| AC-4.1 (4 halaman) | P3    | E4               | E2 + E4        | `portal.test.mjs` halaman baru                      | —              | Screenshot 1440 px repo ini              | Lulus lokal             |
| AC-4.2             | P3    | E2/E4            | E2 + E4        | `portal.test.mjs` 390 px                            | —              | 7 halaman × 3 lebar tanpa scroll samping | Lulus lokal             |
| AC-4.5             | P3    | E4               | E2 + E4        | badge per halaman                                   | —              | badge 118 / 12 di repo ini               | Lulus lokal             |
| AC-5.1             | P3    | E2               | E2             | `reuse.test.mjs` fixture `alt`                      | —              | —                                        | Lulus lokal             |
| AC-5.2             | P3    | E2               | E2             | `reuse.test.mjs` pola terlarang                     | —              | —                                        | Lulus lokal             |
| AC-6.1             | P3    | E2               | E1 + E2        | `tools/docsys/README.md`; `docs:check`              | —              | —                                        | Lulus lokal             |

## 2. Outcome pemeriksaan

| Perintah / observasi                                                     | Environment              | Exit code | Pass / fail / skip / warn                               | AC                     | Outcome | Tindak lanjut                   |
| ------------------------------------------------------------------------ | ------------------------ | --------- | ------------------------------------------------------- | ---------------------- | ------- | ------------------------------- |
| `npm run docsys:test`                                                    | workspace cloud, Node 22 | 0         | 14 / 0 / 3 (browser)                                    | AC-1.1–1.5             | sukses  | —                               |
| `node --test tools/docsys/__tests__/portal.test.mjs` + `DOCSYS_CHROMIUM` | workspace cloud          | 0         | 3 / 0 / 0                                               | AC-4.1, AC-4.3, AC-4.4 | sukses  | —                               |
| `npm run validate`                                                       | workspace cloud          | 0         | lulus, 15 warning lint lama                             | —                      | sukses  | —                               |
| CI `verify` + `owner-gate` pada PR #43 (Phase 1)                         | GitHub Actions           | 0         | lulus (syarat merge ruleset `main`); di-merge `1d9d437` | semua P1               | sukses  | —                               |
| CI `verify` + `owner-gate` pada PR #44 (Phase 2)                         | GitHub Actions           | 0         | lulus (syarat merge ruleset `main`); di-merge `998e998` | semua P2               | sukses  | —                               |
| `npm run docsys:test` + smoke browser (Phase 3)                          | workspace cloud          | 0         | 24 + 4 lulus                                            | AC-4.x, AC-5.x         | sukses  | —                               |
| CI `verify` pada PR Phase 3                                              | GitHub Actions           | —         | —                                                       | semua P3               | belum   | Hasil dicatat setelah PR dibuat |

Kegagalan tidak dihapus dari tabel. Tindak lanjut: perbaiki & ulang, Bug, re-plan, atau Blocked.

## 3. Bukti UI (bila UI berubah)

| Layar / state       | Phone                          | Tablet | Desktop | Keyboard & a11y                             | Link screenshot |
| ------------------- | ------------------------------ | ------ | ------- | ------------------------------------------- | --------------- |
| Beranda & Stack     | tanpa scroll samping di 390 px | P3     | Ya      | Link dan input asli; tab ber-`aria-current` | Lampiran PR P1  |
| Fitur & Kontrak API | P3                             | P3     | Ya      | Filter berlabel; tabel di kotak scroll      | Lampiran PR P1  |
| State empty / error | —                              | —      | Ya      | `role="status"`                             | Lampiran PR P1  |

## 4. Quality review (AI-010)

| Dimensi                     | Metode & scope                                | Temuan                                                                                  | Status                                 |
| --------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------- |
| Reuse / DRY                 | Baca `scripts/checkTier.mjs`, `checkDocs.mjs` | Pola glob dan pembacaan tabel Markdown mirip; core docsys sengaja mandiri agar portabel | follow-up P3: dokumentasikan di README |
| Duplikasi / tumpang tindih  | Bandingkan dengan `docs:check`                | Tidak memvalidasi struktur yang sudah dicek `docs:check`/`sdlc:check`                   | none found                             |
| Kode usang / tidak terpakai | ESLint pada `tools/docsys`                    | 0 error                                                                                 | none found                             |
| Boundary & best practice    | Aplikasi, kontrak, DB tidak disentuh          | Hanya membaca sumber; tanpa jaringan; server portal hanya `127.0.0.1`                   | none found                             |
| Bukti regresi               | `npm run validate` penuh                      | Lulus                                                                                   | none found                             |

## 5. Hasil verifier

| Phase | Verifier (bukan pelaksana)                      | Bukti primer yang dicek ulang      | Hasil                                  | AC terdampak / gap |
| ----- | ----------------------------------------------- | ---------------------------------- | -------------------------------------- | ------------------ |
| P1    | CI `verify` + `owner-gate` PR #43, review Owner | Diff, log CI, portal lokal         | Accepted (merge `1d9d437`, 2026-10-14) | —                  |
| P2    | CI `verify` + `owner-gate` PR #44, review Owner | Diff, log CI, laporan completeness | Accepted (merge `998e998`, 2026-10-14) | —                  |
| P3    | CI `verify` + review Owner pada PR P3           | Diff, log CI, screenshot portal    | Menunggu PR                            | —                  |

Gap yang diterima harus disetujui eksplisit dan dicatat di [release.md](release.md).
