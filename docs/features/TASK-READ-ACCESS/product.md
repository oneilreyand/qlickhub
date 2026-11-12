# TASK-READ-ACCESS — Tahap 2: PRD (Product Requirements)

**Status:** Disetujui
**Gerbang:** G2 — disetujui oleh PO
**Disetujui:** Owner (Reyand), 2026-11-12 — persetujuan cakupan pada chat; PRD ini merinci keputusan itu
**Solusi terpilih:** [solution.md](solution.md)
**Applicable Policy IDs:** DOC-005, SDLC-001, AUTH-002, AUTH-013, TEST-001

## 1. Tujuan dan pengguna

Batas akses per Feature berlaku sama untuk detail task dan data yang melekat padanya.

## 2. Requirement dan Acceptance Criteria

| Requirement                     | AC   | Given / When / Then                                                                                                                     | Phase |
| ------------------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| REQ-1 Baca mengikuti akses task | AC-1 | Developer/QA tanpa penugasan, bukan pelapor, tanpa Subtask di Feature → GET route Phase 1 pada Feature atau Subtask-nya 403 `FORBIDDEN` | 1     |
| REQ-1                           | AC-2 | Developer/QA yang memegang Subtask → GET route Phase 1 pada Feature dan Subtask saudaranya 200                                          | 1     |
| REQ-1                           | AC-3 | Planner membaca semua task; pelapor membaca task yang ia laporkan → 200                                                                 | 1     |
| REQ-2 Pengecualian diskusi      | AC-4 | Anggota Workspace mana pun → GET diskusi tetap 200                                                                                      | 1     |
| REQ-3 Tanpa regresi             | AC-5 | Task tidak ada di Workspace → perilaku not-found yang ada; bentuk respons sukses tidak berubah                                          | 1     |
| REQ-1                           | AC-6 | Sama dengan AC-1 sampai AC-3 untuk requirement task, delivery trace, catatan rilis/sign-off, readiness, handoff                         | 2     |

## 3. User flow

Tidak ada alur UI baru. Halaman yang sudah menampilkan "Akses Feature dibatasi" tetap sama; yang
berubah adalah jawaban API bagi pemanggil langsung.

## 4. Wireframe per state

Tidak ada layar baru atau berubah.

### Komponen Atomic

Tidak ada komponen baru.

## 5. Data, contract, authorization

Lihat [contracts.md](contracts.md) dan [authorization.md](authorization.md).

## 6. Di luar scope

Mutasi, endpoint tingkat Workspace, perubahan UI, dan pencabutan pengecualian diskusi.

## 7. Unknown yang tersisa

Lihat [problem.md](problem.md) §7.
