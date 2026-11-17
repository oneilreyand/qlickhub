# WORK-FOUNDATION — Tahap 5: Test & Review

**Status:** Berjalan
**Gerbang:** G5 — verifier independen atau CI yang mencakup seluruh AC
**Applicable Policy IDs:** AI-003, AI-004, AI-008, AI-010, TEST-001, DOC-005

Level bukti mengikuti `docs/4_AGENT_DEV_GUIDELINES.md` §2A.C: E0 klaim · E1 inspeksi · E2 dieksekusi ·
E3 persisten (PostgreSQL) · E4 runtime/UAT.

## 1. Matriks AC → bukti

| AC     | Phase | Bukti dibutuhkan | Bukti tercapai | Unit/UI                                                           | API/PostgreSQL   | UAT/runtime | Status         |
| ------ | ----- | ---------------- | -------------- | ----------------------------------------------------------------- | ---------------- | ----------- | -------------- |
| AC-1.1 | P1    | E3               | —              | —                                                                 | —                | —           | Planned        |
| AC-2.1 | P2    | E3               | E3             | `workCalendarApiIntegration.test.ts`, `WorkCalendarCard.test.tsx` | PostgreSQL lokal | —           | Kandidat lokal |
| AC-2.2 | P2    | E3               | E3             | integration 403, data tidak berubah                               | PostgreSQL lokal | —           | Kandidat lokal |
| AC-2.3 | P2    | E3               | E3             | integration default                                               | PostgreSQL lokal | —           | Kandidat lokal |
| AC-2.4 | P2    | E2               | E2             | `workingDays.test.ts` 5/5                                         | —                | —           | Kandidat lokal |
| AC-3.1 | P3    | E3               | —              | —                                                                 | —                | —           | Planned        |
| AC-3.2 | P3    | E3               | —              | —                                                                 | —                | —           | Planned        |
| AC-3.3 | P3    | E3               | —              | —                                                                 | —                | —           | Planned        |
| AC-3.4 | P3    | E3               | —              | —                                                                 | —                | —           | Planned        |
| AC-4.1 | P4    | E3               | —              | —                                                                 | —                | —           | Planned        |
| AC-4.2 | P4    | E3               | —              | —                                                                 | —                | —           | Planned        |
| AC-4.3 | P4    | E3               | —              | —                                                                 | —                | —           | Planned        |
| AC-4.4 | P4    | E3               | —              | —                                                                 | —                | —           | Planned        |
| AC-5.1 | P5    | E3               | —              | —                                                                 | —                | —           | Planned        |
| AC-5.2 | P5    | E3               | —              | —                                                                 | —                | —           | Planned        |
| AC-5.3 | P5    | E3               | —              | —                                                                 | —                | —           | Planned        |
| AC-5.4 | P5    | E4               | —              | —                                                                 | —                | —           | Planned        |

## 2. Outcome pemeriksaan

Diisi per phase saat build berjalan. Kegagalan tidak dihapus dari tabel.

## 3. Bukti UI (bila UI berubah)

Diisi per phase: phone 390, tablet 768, desktop 1440, terang dan gelap, keyboard.

## 4. Quality review (AI-010)

Diisi per phase: reuse/DRY, duplikasi, kode usang, boundary, bukti regresi.

## 5. Hasil verifier

Diisi per phase oleh verifier yang bukan pelaksana.
