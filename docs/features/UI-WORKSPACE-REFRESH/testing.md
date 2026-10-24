# UI-WORKSPACE-REFRESH — Tahap 5: Test & Review

**Status:** Belum mulai
**Gerbang:** G5 — verifier independen atau CI yang mencakup seluruh AC
**Applicable Policy IDs:** AI-003, AI-004, AI-008, AI-010, TEST-001, UI-001, UI-002, UI-003, UI-004, DOC-005

Level bukti mengikuti `docs/4_AGENT_DEV_GUIDELINES.md` §2A.C: E0 klaim · E1 inspeksi · E2 dieksekusi ·
E3 persisten (PostgreSQL) · E4 runtime/UAT.

## 1. Matriks AC → bukti

| AC             | Phase | Bukti dibutuhkan | Bukti tercapai | Unit/UI                         | API/PostgreSQL                                  | UAT/runtime                                    | Status  |
| -------------- | ----- | ---------------- | -------------- | ------------------------------- | ----------------------------------------------- | ---------------------------------------------- | ------- |
| AC-1.1, AC-1.2 | P1    | E2/E4            | —              | Theme + shell tests             | N/A                                             | Light/Dark hard refresh, phone/tablet/desktop  | Planned |
| AC-2.1, AC-2.2 | P2    | E2/E4            | E2; E4 pending | Query-state + control tests     | N/A                                             | No overflow + keyboard on 3 widths, Light/Dark | Partial |
| AC-3.1, AC-3.2 | P3    | E2/E3/E4         | —              | Kanban state/pagination tests   | Authenticated readback on disposable PostgreSQL | Read-only parent scope and state UAT           | Planned |
| AC-4.1         | P4    | E2/E4            | —              | next-action route mapping tests | Existing queue integration if needed            | Owner/PO/Dev/QA session journey                | Planned |
| AC-5.1         | P4    | E2/E3/E4         | —              | Report/overview state tests     | Authenticated capacity/task readback            | Role/session review                            | Planned |

## 2. Outcome pemeriksaan

| Perintah / observasi | Environment | Exit code | Pass / fail / skip / warn | AC  | Outcome                  | Tindak lanjut |
| -------------------- | ----------- | --------- | ------------------------- | --- | ------------------------ | ------------- |
|                      |             |           |                           |     | sukses / gagal / blocked |               |

Kegagalan tidak dihapus dari tabel. Tindak lanjut: perbaiki & ulang, Bug, re-plan, atau Blocked.

## 3. Bukti UI (bila UI berubah)

| Layar / state                                          | Phone   | Tablet  | Desktop | Keyboard & a11y                           | Link screenshot               |
| ------------------------------------------------------ | ------- | ------- | ------- | ----------------------------------------- | ----------------------------- |
| `/work` light/dark, data/loading/empty/error/forbidden | Planned | Planned | Planned | Focus, labels, touch targets planned      | Captured only after execution |
| `/my-tasks` and `/reports` light/dark                  | Planned | Planned | Planned | Focus, target route, state labels planned | Captured only after execution |

## 4. Quality review (AI-010)

| Dimensi                     | Metode & scope                                        | Temuan                        | Status  |
| --------------------------- | ----------------------------------------------------- | ----------------------------- | ------- |
| Reuse / DRY                 | Gallery + UI tree before implementation               | Belum diperiksa pada kandidat | Planned |
| Duplikasi / tumpang tindih  | Search components/views/status handling               | Belum diperiksa pada kandidat | Planned |
| Kode usang / tidak terpakai | Diff + imports after each phase                       | Belum diperiksa pada kandidat | Planned |
| Boundary & best practice    | Page orchestration vs Atomic components               | Belum diperiksa pada kandidat | Planned |
| Bukti regresi               | Targeted + full checks proportionate to changed paths | Belum dijalankan              | Planned |

## 5. Hasil verifier

| Phase | Verifier (bukan pelaksana) | Bukti primer yang dicek ulang | Hasil                                              | AC terdampak / gap |
| ----- | -------------------------- | ----------------------------- | -------------------------------------------------- | ------------------ |
| P1    |                            |                               | Accepted / Accepted with gaps / Rejected / Blocked |                    |

Gap yang diterima harus disetujui eksplisit dan dicatat di [release.md](release.md).
