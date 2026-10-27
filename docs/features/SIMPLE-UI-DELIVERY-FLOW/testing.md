# SIMPLE-UI-DELIVERY-FLOW — Tahap 5: Test & Review

**Status:** Berjalan
**Gerbang:** G5 — verifier independen atau CI yang mencakup seluruh AC
**Applicable Policy IDs:** AI-003, AI-004, AI-008, AI-010, TEST-001, DOC-005, UI-002, UI-003, UI-005

Level bukti mengikuti `docs/4_AGENT_DEV_GUIDELINES.md` §2A.C: E0 klaim · E1 inspeksi · E2 dieksekusi ·
E3 persisten (PostgreSQL) · E4 runtime/UAT. Pada fase ini E4 = UAT lokal (batas lingkungan di solution.md).

## 1. Matriks AC → bukti

| AC              | Phase   | Bukti dibutuhkan     | Bukti tercapai | Unit/UI                                                             | API/PostgreSQL           | UAT/runtime                                                       | Status                       |
| --------------- | ------- | -------------------- | -------------- | ------------------------------------------------------------------- | ------------------------ | ----------------------------------------------------------------- | ---------------------------- |
| AC-1.1          | P1      | E2 + E4 (1440, 1024) | E2 + E4 lokal  | `Sidebar.test.tsx`, `Header.test.tsx`, `WorkspaceSwitcher.test.tsx` | N/A — tanpa perubahan BE | 1440 Light/Dark, 1024 Light/Dark                                  | Kandidat — menunggu verifier |
| AC-1.2          | P1      | E4 (390, 768)        | E4 lokal       | `AppLayout.test.tsx` (yang ada)                                     | N/A                      | 768 Dark dengan menu terbuka, 390 Light tanpa overflow horizontal | Kandidat — menunggu verifier |
| AC-2.1 – AC-8.2 | P2a–P8b | Lihat product.md     | —              | —                                                                   | —                        | —                                                                 | Planned                      |

## 2. Outcome pemeriksaan

| Perintah / observasi                                                               | Environment                                              | Exit code | Pass / fail / skip / warn    | AC             | Outcome        | Tindak lanjut                                                                                                                                        |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------- | --------- | ---------------------------- | -------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm --prefix apps/web run test -- --run src/components/layout` (awal)             | Salinan Linux VM, Node 22                                | 1         | 20 pass / 1 fail             | AC-1.1         | gagal          | Test lama mengharapkan 2 tombol "Pengaturan Workspace" (nav tersembunyi + menu profil); diperbarui menjadi 1                                         |
| `npm --prefix apps/web run test -- --run src/components/layout`                    | Salinan Linux VM                                         | 0         | 21 pass / 0 fail / 0 skip    | AC-1.1, AC-1.2 | sukses         | —                                                                                                                                                    |
| `npm --prefix apps/web run test -- --run` (seluruh web)                            | Salinan Linux VM                                         | 0         | 717 pass / 0 fail (119 file) | Regresi        | sukses         | —                                                                                                                                                    |
| `npm run typecheck:web`                                                            | Salinan Linux VM                                         | 0         | —                            | —              | sukses         | Sebelumnya gagal karena `@qlick/contracts` belum di-build di salinan; diperbaiki dengan build contracts                                              |
| `npx eslint apps/web/src/components/layout apps/web/src/lib/utils/sectionLabel.ts` | Salinan Linux VM                                         | 0         | 0 error, 0 warning           | —              | sukses         | Peringatan fast-refresh diperbaiki dengan memindah `getSectionLabel` ke `lib/utils/sectionLabel.ts`                                                  |
| `npm run build:web`                                                                | Salinan Linux VM                                         | 0         | —                            | —              | sukses         | —                                                                                                                                                    |
| `npm run theme:check`                                                              | Salinan Linux VM                                         | 0         | pass                         | AC-1.1         | sukses         | —                                                                                                                                                    |
| UAT 1024×768                                                                       | Playwright Chromium di Mac, `localhost:3000`, akun Owner | —         | temuan                       | AC-1.1         | gagal sebagian | "Galeri Komponen" terpotong karena navigasi dan folder punya dua area scroll terpisah; digabung menjadi satu area scroll, lalu UAT diulang dan lulus |

## 3. Bukti UI (bila UI berubah)

| Layar / state              | Phone                                                               | Tablet                                                                          | Desktop                                                                          | Keyboard & a11y                                                                              | Link screenshot                                                                    |
| -------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Shell di `/work?tab=tasks` | 390×844 Light: header menu + logo + "Task Hub", `scrollWidth` = 390 | 768×1024 Dark: menu terbuka berisi pemilih workspace, 4 menu, "Lainnya", folder | 1440×900 Light & Dark; 1024×768 Light setelah perbaikan scroll                   | Tombol ikon punya `aria-label`; pemilih workspace `aria-expanded`; menu aktif `aria-current` | Tangkapan layar UAT tidak disimpan di repo; acuan desain `design/01-task-hub*.png` |
| Shell di `/my-tasks`       | —                                                                   | —                                                                               | Header "Tugas Saya", menu aktif "Tugas Saya", pemilih workspace hanya di Sidebar | —                                                                                            | —                                                                                  |

## 4. Quality review (AI-010)

| Dimensi                     | Metode & scope            | Temuan                                                                                                       | Status     |
| --------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------- |
| Reuse / DRY                 | Diff `components/layout/` | Logika pemilih workspace dipindah utuh ke `WorkspaceSwitcher` (bukan disalin); `getSectionLabel` satu sumber | resolved   |
| Duplikasi / tumpang tindih  | Header vs Sidebar         | Logo ganda, pemilih workspace di Header, dan navigasi tersembunyi (`className="hidden"`) dihapus             | resolved   |
| Kode usang / tidak terpakai | Import dan state Header   | Import, state, dan handler yang tidak dipakai dihapus; lint 0 warning                                        | resolved   |
| Boundary & best practice    | Aturan visibilitas peran  | Aturan peran Sidebar tidak berubah; test peran yang ada tetap lulus                                          | none found |
| Bukti regresi               | Seluruh suite web         | 717/717 lulus                                                                                                | resolved   |

## 5. Hasil verifier

| Phase | Verifier (bukan pelaksana)  | Bukti primer yang dicek ulang | Hasil    | AC terdampak / gap                                          |
| ----- | --------------------------- | ----------------------------- | -------- | ----------------------------------------------------------- |
| P1    | Belum — perlu Owner atau QA | —                             | Menunggu | Pelaksana dan UAT oleh Claude; G5 butuh verifier independen |

Gap yang diterima harus disetujui eksplisit dan dicatat di [release.md](release.md).
