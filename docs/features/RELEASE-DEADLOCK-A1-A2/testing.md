# RELEASE-DEADLOCK-A1-A2 — Tahap 5: Test & Review

**Status:** Belum mulai | Berjalan | Accepted | Accepted with gaps | Rejected | Blocked
**Gerbang:** G5 — verifier independen atau CI yang mencakup seluruh AC
**Applicable Policy IDs:** AI-003, AI-004, AI-008, AI-010, TEST-001, DOC-005, TBD

Level bukti mengikuti `docs/4_AGENT_DEV_GUIDELINES.md` §2A.C: E0 klaim · E1 inspeksi · E2 dieksekusi ·
E3 persisten (PostgreSQL) · E4 runtime/UAT.

## 1. Matriks AC → bukti

| AC     | Phase | Bukti dibutuhkan | Bukti tercapai | Unit/UI | API/PostgreSQL | UAT/runtime | Status  |
| ------ | ----- | ---------------- | -------------- | ------- | -------------- | ----------- | ------- |
| AC-1.1 | P1    | E3               |                |         |                |             | Planned |

## 2. Outcome pemeriksaan

| Perintah / observasi | Environment | Exit code | Pass / fail / skip / warn | AC  | Outcome                  | Tindak lanjut |
| -------------------- | ----------- | --------- | ------------------------- | --- | ------------------------ | ------------- |
|                      |             |           |                           |     | sukses / gagal / blocked |               |

Kegagalan tidak dihapus dari tabel. Tindak lanjut: perbaiki & ulang, Bug, re-plan, atau Blocked.

## 3. Bukti UI (bila UI berubah)

| Layar / state | Phone | Tablet | Desktop | Keyboard & a11y | Link screenshot        |
| ------------- | ----- | ------ | ------- | --------------- | ---------------------- |
|               |       |        |         |                 | `docs/screenshots/...` |

## 4. Quality review (AI-010)

| Dimensi                     | Metode & scope | Temuan | Status                            |
| --------------------------- | -------------- | ------ | --------------------------------- |
| Reuse / DRY                 |                |        | resolved / follow-up / none found |
| Duplikasi / tumpang tindih  |                |        |                                   |
| Kode usang / tidak terpakai |                |        |                                   |
| Boundary & best practice    |                |        |                                   |
| Bukti regresi               |                |        |                                   |

## 5. Hasil verifier

| Phase | Verifier (bukan pelaksana) | Bukti primer yang dicek ulang | Hasil                                              | AC terdampak / gap |
| ----- | -------------------------- | ----------------------------- | -------------------------------------------------- | ------------------ |
| P1    |                            |                               | Accepted / Accepted with gaps / Rejected / Blocked |                    |

Gap yang diterima harus disetujui eksplisit dan dicatat di [release.md](release.md).
