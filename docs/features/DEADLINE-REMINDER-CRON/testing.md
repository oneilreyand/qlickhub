# DEADLINE-REMINDER-CRON — Tahap 5: Test & Review

**Status:** Accepted with gaps
**Gerbang:** G5 — verifier independen atau CI yang mencakup seluruh AC
**Applicable Policy IDs:** AI-003, AI-004, AI-008, AI-010, TEST-001, DOC-005, AUTH-012

Level bukti mengikuti `docs/4_AGENT_DEV_GUIDELINES.md` §2A.C: E0 klaim · E1 inspeksi · E2 dieksekusi ·
E3 persisten (PostgreSQL) · E4 runtime/UAT.

## 1. Matriks AC → bukti

| AC   | Phase | Bukti dibutuhkan | Bukti tercapai | Unit/UI                       | API/PostgreSQL                                                                | UAT/runtime               | Status  |
| ---- | ----- | ---------------- | -------------- | ----------------------------- | ----------------------------------------------------------------------------- | ------------------------- | ------- |
| AC-1 | P1    | E3               | E3             | —                             | `cronDeadlineRemindersIntegration.test.ts` AC-1                               | —                         | Passed  |
| AC-2 | P1    | E3               | E3             | —                             | AC-2 (tanpa header, secret salah, tanpa `Bearer`)                             | —                         | Passed  |
| AC-3 | P1    | E3               | E3             | —                             | AC-3 (Origin tak dikenal → cron 200, route biasa 403)                         | —                         | Passed  |
| AC-4 | P1    | E3               | E3             | —                             | AC-4 (H-7 masuk, H-8/H+2/`done`/`canceled`/arsip tidak; pesan overdue)        | —                         | Passed  |
| AC-5 | P1    | E3               | E3             | —                             | AC-5 (dua run paralel, task baru → tepat 2 baris)                             | —                         | Passed  |
| AC-6 | P1    | E3               | E3             | —                             | AC-6 (400, 403 non-anggota, 403 role global dev, ID tak cocok, 200 membuat 2) | —                         | Passed  |
| AC-7 | P1    | E2               | E2             | typecheck, lint, 805 test web | —                                                                             | Setelah deploy (E4)       | Passed  |
| AC-8 | P1    | E4               | —              | —                             | —                                                                             | Production, setelah setup | Planned |

## 2. Outcome pemeriksaan

| Perintah / observasi                                                                               | Environment                                    | Exit code | Pass / fail / skip / warn | AC          | Outcome           | Tindak lanjut                                |
| -------------------------------------------------------------------------------------------------- | ---------------------------------------------- | --------- | ------------------------- | ----------- | ----------------- | -------------------------------------------- |
| `node --test dist/modules/cron/__tests__/*.test.js dist/modules/notifications/__tests__/*.test.js` | PostgreSQL 16 disposable, 78 migrasi kanonikal | 0         | 34 / 0 / 0                | AC-1 – AC-6 | sukses            | —                                            |
| Seluruh test integrasi API (`node --test` atas semua `dist/**/__tests__/*.test.js`, file paralel)  | PostgreSQL 16 disposable, 78 migrasi kanonikal | 0         | 642 / 0 / 0               | regresi     | sukses            | —                                            |
| `npm --prefix apps/web run test`                                                                   | Vitest, jsdom                                  | 0         | 805 / 0 / 0 (139 file)    | AC-7        | sukses            | —                                            |
| `tsc --noEmit` API dan web; ESLint file berubah                                                    | local                                          | 0         | 0 error                   | AC-7        | sukses            | —                                            |
| Test AC-6 dijalankan pada controller lama (scope dari query)                                       | PostgreSQL 16 disposable                       | 1         | gagal `5 !== 0`           | AC-6        | gagal (bukti red) | Diperbaiki: scope = membership terverifikasi |
| Review pertama terpisah (lihat §5) menemukan 7 temuan                                              | review kode                                    | —         | 3 kode, 4 test            | AC-5, AC-6  | gagal             | Semua diperbaiki, lalu diuji ulang           |

Kegagalan tidak dihapus dari tabel. Tindak lanjut: perbaiki & ulang, Bug, re-plan, atau Blocked.

## 3. Bukti UI (bila UI berubah)

Tidak ada layar yang berubah; hanya pemanggilan latar belakang yang dihapus (AC-7).

## 4. Quality review (AI-010)

| Dimensi                     | Metode & scope                                                                       | Temuan                                                                                                                                                          | Status     |
| --------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Reuse / DRY                 | Baca `notificationService`, outbox, `workspacePolicy`                                | Memakai ulang `idempotency_key` + unique index, `requireWorkspaceMember`, `fcmService.sendToUser`; `persistNotification` dipakai juga oleh `createNotification` | resolved   |
| Duplikasi / tumpang tindih  | Cari pemicu deadline lain (`check-deadlines`, `sendDeadlineApproachingNotification`) | Satu aturan pengingat dipakai cron dan manual                                                                                                                   | none found |
| Kode usang / tidak terpakai | `grep` thunk, client API, helper FCM lama                                            | `sendDeadlineApproachingNotification`, `checkApproachingDeadlinesThunk`, `checkApproachingDeadlines`, selector role di hook dihapus                             | resolved   |
| Boundary & best practice    | Review terpisah: secret, mount order, jendela, idempotensi, pool 1 koneksi           | Scope manual dari query/body tak cocok; `findOrCreate` pada pool 1; satu baris gagal menghentikan run — semua diperbaiki                                        | resolved   |
| Bukti regresi               | Seluruh suite API dan web                                                            | 642/642 API, 805/805 web                                                                                                                                        | resolved   |

## 5. Hasil verifier

| Phase | Verifier (bukan pelaksana)                            | Bukti primer yang dicek ulang                                                                           | Hasil              | AC terdampak / gap                                                                                                                                              |
| ----- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1    | Agent review terpisah (tanpa akses tulis), lalu CI PR | Diff, `cronAuth.ts`, `app.ts`, `notificationService.ts`, `workspacePolicy.ts`, Sequelize `findOrCreate` | Accepted with gaps | AC-8 butuh Production. Push yang hilang bila fungsi dihentikan di antara simpan dan kirim tidak diulang. Test lintas tengah malam UTC dapat bergeser satu hari. |

Gap yang diterima harus disetujui eksplisit dan dicatat di [release.md](release.md).
